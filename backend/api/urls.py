from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *  # Import all views

router = DefaultRouter()
router.register(r'register', RegisterViewSet, basename='register')
router.register(r'products', ProductViewSet)
router.register(r'cart', CartViewSet)
router.register(r'cart-items', CartItemViewSet)  # Corrected to CartItemViewSet
router.register(r'cart-history', CartHistoryViewSet)  # Corrected to CartHistoryViewSet
router.register(r'complaints', ComplaintViewSet)
router.register(r'notifications', NotificationViewSet)

urlpatterns = [
    path('', include(router.urls)),  # Including the router URLs
    path('login/', UserLoginView.as_view(), name='custom_login'),
    path('get-me/', UsergetView.as_view(), name='get_me'),
]
