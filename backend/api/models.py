from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission

# Custom User Model
class User(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    full_name = models.CharField(max_length=255, blank=True, null=True)

    def check_password(self, raw_password):
        # Implement password check logic here
        return self.password == raw_password
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
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart History for {self.user.username} on {self.date.strftime('%Y-%m-%d %H:%M:%S')}"

    def get_products(self):
        return self.carts.all()  # related_name from Cart model

# Cart Model (1-to-many with products, connected to CartHistory)
class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    cart_history = models.ForeignKey('CartHistory', related_name='carts', on_delete=models.CASCADE, null=True, blank=True)

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
    location = models.CharField(max_length=255)
    description = models.TextField()
    photo = models.ImageField(upload_to='complaints/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    submitted_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Complaint by {self.user.username} - {self.status}"

# Notification Model
class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.recipient.username}"
