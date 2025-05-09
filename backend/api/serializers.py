from rest_framework import serializers
from .models import User, Product, Cart, CartHistory, Complaint, Notification  # Correct import
from django.contrib.auth.password_validation import validate_password


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['username', 'email', 'phone', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            phone=validated_data['phone'],
            password=validated_data['password']
        )
        return user


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
