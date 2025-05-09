from django.contrib import admin
from .models import User, Product, Cart, CartHistory, Complaint, Notification


admin.site.register(User)
admin.site.register(Product)
admin.site.register(Cart)

admin.site.register(CartHistory)
admin.site.register(Complaint)
admin.site.register(Notification)
