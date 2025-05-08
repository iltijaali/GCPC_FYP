from django.contrib import admin
from .models import User, Product, Cart, OrderHistory, OrderItem, Complaint, Notification

admin.site.register(User)
admin.site.register(Product)
admin.site.register(Cart)
admin.site.register(OrderHistory)
admin.site.register(OrderItem)
admin.site.register(Complaint)
admin.site.register(Notification)
