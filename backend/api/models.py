import base64
from django.contrib.auth.hashers import check_password, identify_hasher, make_password
from django.db import models
import hmac
import random
import secrets
import string
from datetime import timedelta
from django.utils import timezone

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_AFTER = timedelta(seconds=60)


class OTPError(Exception):
    """A one-time password could not be accepted; the message is safe to show to the user."""


# Custom User Model
class User(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    otp_attempts = models.PositiveSmallIntegerField(default=0)
    
    # New fields for token and expiry
    token = models.CharField(max_length=300, blank=True, null=True)
    token_expiry = models.DateTimeField(blank=True, null=True)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def _is_hashed(self):
        try:
            identify_hasher(self.password)
            return True
        except ValueError:
            return False

    def check_password(self, raw_password):
        if self._is_hashed():
            return check_password(raw_password, self.password)
        # Legacy row still holding a plain-text password: accept it once, then store a hash.
        if self.password == raw_password:
            self.set_password(raw_password)
            self.save(update_fields=['password'])
            return True
        return False
    
    @property
    def is_authenticated(self):
        return True

    def seconds_until_new_otp_allowed(self):
        if not (self.otp and self.otp_created_at):
            return 0
        wait = OTP_RESEND_AFTER - (timezone.now() - self.otp_created_at)
        return max(0, int(wait.total_seconds()) + (1 if wait.total_seconds() % 1 else 0))

    def issue_otp(self):
        # secrets, not random: OTPs must not be predictable
        self.otp = f"{secrets.randbelow(10 ** 6):06d}"
        self.otp_created_at = timezone.now()
        self.otp_attempts = 0
        self.save(update_fields=['otp', 'otp_created_at', 'otp_attempts'])
        return self.otp

    def clear_otp(self):
        self.otp = None
        self.otp_created_at = None
        self.otp_attempts = 0
        self.save(update_fields=['otp', 'otp_created_at', 'otp_attempts'])

    def verify_otp(self, code):
        """Raise OTPError unless `code` is the current, unexpired OTP and attempts remain."""
        if not self.otp or not self.otp_created_at:
            raise OTPError("No OTP has been requested. Please request a new one.")
        if timezone.now() - self.otp_created_at > OTP_TTL:
            raise OTPError("This OTP has expired. Please request a new one.")
        if self.otp_attempts >= OTP_MAX_ATTEMPTS:
            raise OTPError("Too many wrong attempts. Please request a new OTP.")
        if not hmac.compare_digest(str(self.otp), str(code).strip()):
            self.otp_attempts += 1
            self.save(update_fields=['otp_attempts'])
            left = OTP_MAX_ATTEMPTS - self.otp_attempts
            if left <= 0:
                raise OTPError("Invalid OTP. Too many wrong attempts, please request a new OTP.")
            raise OTPError(f"Invalid OTP. {left} attempt{'s' if left != 1 else ''} left.")

    def generate_token(self):
        # Base64 encode the username (convert to bytes first)
        username_bytes = self.username.encode('utf-8')
        base64_bytes = base64.urlsafe_b64encode(username_bytes)
        encrypted_username = base64_bytes.decode('utf-8')  # Convert bytes back to string

        # Generate 14-char random string
        random_part = ''.join(random.choices(string.ascii_letters + string.digits, k=14))
        
        self.token = f"{encrypted_username}_{random_part}"
        self.token_expiry = timezone.now() + timedelta(days=15)
        self.save()
        return self.token


    def __str__(self):
        return self.username
# Product Model (for fruits, vegetables, etc.)
class Product(models.Model):
    CATEGORY_CHOICES = [
        ('Fruit', 'Fruit'),
        ('Vegetable', 'Vegetable'),
        ('Other', 'Other'),
    ]
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    date_updated = models.DateField(auto_now=True)

    def __str__(self):
        return f"{self.name} - Rs. {self.price}"

# Cart History Model (1-to-1 with user, 1-to-many with Cart items)
class CartHistory(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart History {self.user.username}"

    def get_carts(self):
        return self.carts.all()  # related_name from Cart model

# Cart Model (1-to-many with products, connected to CartHistory)
class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    cart_history = models.ForeignKey('CartHistory', related_name='carts', on_delete=models.CASCADE, null=True, blank=True)
    saved = models.BooleanField(default=False)

    def __str__(self):
        return f"Cart #{self.id} - {self.user.username}"

    def get_total_price(self):
        return sum(item.get_total_price() for item in self.items.all())

# Cart Item Model (for products in the cart)
class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    def get_total_price(self):
        return self.product.price * self.quantity

# Complaint Model
class Complaint(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    shop_name = models.CharField(max_length=100)
    shopkeeper_name = models.CharField(max_length=100)
    dc_email = models.EmailField()
    location = models.CharField(max_length=255)
    description = models.TextField()
    photo = models.ImageField(upload_to='complaints/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    submitted_date = models.DateTimeField(auto_now_add=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    # Set once the complaint has been emailed to dc_email
    dc_notified_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Complaint by {self.user.username} - {self.status}"

    def save(self, *args, **kwargs):
        is_update = self.pk is not None
        if is_update:
            previous = Complaint.objects.get(pk=self.pk)
            if previous.status != self.status:
                Notification.objects.create(
                    recipient=self.user,
                    message=f"Your complaint status has been updated to '{self.status}'"
                )
        super().save(*args, **kwargs)

# Notification Model
class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.recipient.username}"
