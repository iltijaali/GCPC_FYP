from rest_framework import serializers
from .models import User, Product, Cart, CartItem, CartHistory, Complaint, Notification  # Correct import
from django.contrib.auth.password_validation import validate_password

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
        user = User.objects.create(
            username=validated_data['username'],  
            full_name=validated_data['full_name'],
            email=validated_data['email'],
            password=validated_data['password']
        )
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
        read_only_fields = ['user']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
