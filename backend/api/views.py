from rest_framework import viewsets, permissions, mixins , status
from .models import User, Product, Cart, CartHistory, Complaint, Notification
from .serializers import *
from rest_framework.response import Response
from rest_framework.views import APIView

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


class CartViewSet(viewsets.ModelViewSet):
    queryset = Cart.objects.all()
    serializer_class = CartSerializer

class CartItemViewSet(mixins.ListModelMixin,
                      mixins.CreateModelMixin,
                      viewsets.GenericViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer


class CartHistoryViewSet(viewsets.ModelViewSet):  # ✅ Renamed from OrderHistory
    queryset = CartHistory.objects.all()
    serializer_class = CartHistorySerializer


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
