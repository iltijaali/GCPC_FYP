from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from .models import User

class CustomTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('MyToken '):
            return None  # No authentication attempted

        token = auth_header.replace('MyToken ', '').strip()

        try:
            user = User.objects.get(token=token)
        except User.DoesNotExist:
            raise AuthenticationFailed("Invalid token")

        # Check if the token is expired
        if user.token_expiry is None or user.token_expiry < timezone.now():
            raise AuthenticationFailed("Token has expired")

        return (user, None)
