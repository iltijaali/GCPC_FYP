from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *  # Import all views

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'register', RegisterViewSet, basename='register')  # Fixed basename conflict
router.register(r'products', ProductViewSet)
router.register(r'cart', CartViewSet)
router.register(r'cart-history', CartHistoryViewSet)  # Corrected to CartHistoryViewSet
router.register(r'complaints', ComplaintViewSet)
router.register(r'notifications', NotificationViewSet)

urlpatterns = [
    path('', include(router.urls)),  # Including the router URLs
]
