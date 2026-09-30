from rest_framework import serializers
from .models import User, Product, Cart, CartItem, CartHistory, Complaint, Notification, OTPError

from .otpsender import send_otp_email

from django.db.models import Q

# for getting user information
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']
# login user serilizer
class UserLoginSerializer(serializers.Serializer):
    username_or_email = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        username_or_email = data.get("username_or_email")
        password = data.get("password")

        try:
            user = User.objects.get(
                Q(username=username_or_email) | Q(email=username_or_email)
            )
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials")

        token = user.generate_token()
        return {
            "token": token,
            "token_expiry": user.token_expiry,
            "username": user.username,
        }


# for registering user
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['full_name','username', 'email',  'password']

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            full_name=validated_data.get('full_name'),
            email=validated_data['email'],
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
    # you can validate the data here
    def validate(self, data):
        if not data['username']:
            data['username'] = data['email'].split('@')[0]  # Set username from email
        return data

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'price', 'date_updated']

#cart serializer
class InlineCartItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    product = serializers.CharField(source='product.name')
    quantity = serializers.IntegerField()
    total_price = serializers.SerializerMethodField()

    def get_total_price(self, obj):
        return obj.get_total_price()  # Assuming your CartItem model has this method
    
class CartSerializer(serializers.ModelSerializer):
    total_price = serializers.SerializerMethodField(read_only=True)
    products = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Cart
        fields = ['id', 'user', 'created_at', 'products', 'cart_history', 'total_price']
    def get_total_price(self, obj):
        return obj.get_total_price()
    def get_products(self, obj):
        products = obj.items.all()
        return InlineCartItemSerializer(products, many=True).data

class InlineProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    category = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)

class CartItemSerializer(serializers.ModelSerializer):
    total_price = serializers.SerializerMethodField(read_only=True)
    product_details = InlineProductSerializer(source='product', read_only=True)  # Use InlineProductSerializer for nested representation
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'cart', 'product', 'product_details', 'quantity', 'added_date', 'total_price']
        read_only_fields = ['cart']
        extra_kwargs = {'quantity': {'min_value': 1}}
    def get_total_price(self, obj):
        return obj.get_total_price()


# CartHistorySerializer - Correcting from OrderHistorySerializer
class CartHistorySerializer(serializers.ModelSerializer):
    carts = CartSerializer(many=True, read_only=True) 

    class Meta:
        model = CartHistory
        fields = ['user', 'carts', 'date']




class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ['user', 'status', 'dc_notified_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class RequestPasswordResetEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        user = User.objects.filter(email=value).first()
        if not user:
            raise serializers.ValidationError("No user is associated with this email.")
        wait = user.seconds_until_new_otp_allowed()
        if wait:
            raise serializers.ValidationError(
                f"An OTP was sent recently. Please wait {wait} seconds before requesting another."
            )
        return value

    def create(self, validated_data):
        email = validated_data['email']
        user = User.objects.get(email=email)
        otp = user.issue_otp()
        send_otp_email(otp, email, user.full_name)
        return validated_data


class _OTPCheckMixin:
    """Shared by verify and reset: look the user up and check the OTP, counting wrong attempts."""

    def _check(self, data):
        user = User.objects.filter(email=data.get('email')).first()
        if not user:
            raise serializers.ValidationError("No user is associated with this email.")
        try:
            user.verify_otp(data.get('otp', ''))
        except OTPError as exc:
            raise serializers.ValidationError(str(exc))
        return user


class VerifyOTPSerializer(_OTPCheckMixin, serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()

    def validate(self, data):
        self._check(data)
        return data

    def create(self, validated_data):
        return validated_data


class ResetPasswordSerializer(_OTPCheckMixin, serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=3)

    def validate(self, data):
        self._check(data)
        return data

    def create(self, validated_data):
        user = User.objects.get(email=validated_data['email'])
        user.set_password(validated_data['new_password'])
        user.save(update_fields=['password'])
        user.clear_otp()  # an OTP works once
        return validated_data
