from rest_framework import serializers
from .models import User, Product, Cart, CartHistory, Complaint, Notification  # Correct import
from django.contrib.auth.password_validation import validate_password

# for getting user information
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email']
# login user serilizer
class LoginSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = User.objects.filter(email=email).first()
            if user and user.check_password(password):
                return user
            else:
                raise serializers.ValidationError("Invalid email or password")
        else:
            raise serializers.ValidationError("Email and password are required")
# for registering user
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['name', 'email',  'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],  
            name=validated_data['name'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
    # you can validate the data here
    def validate(self, data):
        if not data.get('name'):
            raise serializers.ValidationError("Name is required")
        data['username'] = data['email'].split('@')[0]  # Set username from email
        name = data['name']
        print(name)
        return data

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class CartSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = Cart
        fields = '__all__'


# CartHistorySerializer - Correcting from OrderHistorySerializer
class CartHistorySerializer(serializers.ModelSerializer):
    products = ProductSerializer(many=True)  # A cart history contains multiple products

    class Meta:
        model = CartHistory
        fields = ['user', 'products', 'total_price', 'date']


class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
