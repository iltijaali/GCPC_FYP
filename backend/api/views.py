from rest_framework import viewsets, permissions, mixins , status
from .models import User, Product, Cart, CartHistory, Complaint, Notification
from .serializers import *
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action

from .authentication import CustomTokenAuthentication



class RegisterViewSet(mixins.CreateModelMixin,
                      viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class UserLoginView(APIView):
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class UsergetView(APIView):
    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"error": "Token not provided."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(token=token).first()
        if not user:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "username": user.username
        }, status=status.HTTP_200_OK)


class ProductViewSet(viewsets.ModelViewSet):
    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        category = self.request.query_params.get('category')
        if category:
            return Product.objects.filter(category=category)
        return Product.objects.all()


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer

    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [CustomTokenAuthentication]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user, saved=False)

    @action(detail=True, methods=['post'])
    def save_cart(self, request, pk=None):
        cart = self.get_object()
        cart_history, _ = CartHistory.objects.get_or_create(user=cart.user)
        cart.saved = True
        cart.cart_history = cart_history
        cart.save()
        return Response({'status': 'cart saved', 'cart_id': cart.id})

class CartItemViewSet(viewsets.ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer

    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [CustomTokenAuthentication]

    def create(self, request, *args, **kwargs):
        user = request.user

        # Get or create a single unsaved cart
        cart = Cart.objects.filter(user=user, saved=False).first()
        if not cart:
            cart = Cart.objects.create(user=user)

        product_id = request.data.get('product')
        if not product_id:
            return Response({"error": "Product ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if this item already exists in the cart
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_id=product_id,
            defaults={'quantity': 1}
        )
        if not created:
            cart_item.quantity += 1
            cart_item.save()

        serializer = self.get_serializer(cart_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CartHistoryViewSet(viewsets.ModelViewSet):  # ✅ Renamed from OrderHistory
    queryset = CartHistory.objects.all()
    serializer_class = CartHistorySerializer

    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [CustomTokenAuthentication]

    def get_queryset(self):
        user = self.request.user
        return CartHistory.objects.filter(user=user)


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [CustomTokenAuthentication]

    def get_queryset(self):
        return Complaint.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)



class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [CustomTokenAuthentication]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
