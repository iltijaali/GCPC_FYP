from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *  # Import all views
from .dashboard import (
    DashboardComplaintViewSet, DashboardOrderViewSet, DashboardProductViewSet,
    DashboardStatsView, DashboardUserViewSet,
)

router = DefaultRouter()
router.register(r'register', RegisterViewSet, basename='register')
router.register(r'products', ProductViewSet)
router.register(r'cart', CartViewSet)
router.register(r'cart-items', CartItemViewSet)  # Corrected to CartItemViewSet
router.register(r'cart-history', CartHistoryViewSet)  # Corrected to CartHistoryViewSet
router.register(r'complaints', ComplaintViewSet, basename='complaints')  # Added basename for clarity
router.register(r'dashboard/complaints', DashboardComplaintViewSet, basename='dashboard-complaints')
router.register(r'dashboard/products', DashboardProductViewSet, basename='dashboard-products')
router.register(r'dashboard/orders', DashboardOrderViewSet, basename='dashboard-orders')
router.register(r'dashboard/users', DashboardUserViewSet, basename='dashboard-users')
router.register(r'notifications', NotificationViewSet, basename='notifications')  # Added basename for clarity`)

urlpatterns = [
    path('', include(router.urls)),  # Including the router URLs
    path('login/', UserLoginView.as_view(), name='custom_login'),
    path('get-me/', UsergetView.as_view(), name='get_me'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('request-reset-password/', RequestPasswordResetEmailView.as_view(), name='request_reset_password'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password')
]
