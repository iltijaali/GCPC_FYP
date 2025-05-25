from django.contrib import admin 
from django.contrib.auth.admin import UserAdmin
from .models import User, Product, Cart, CartItem, CartHistory, Complaint, Notification

class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'submitted_date')
    search_fields = ('user__username', 'status')
    list_filter = ('status', 'submitted_date')  


admin.site.register(User)
admin.site.register(Product)
admin.site.register(Cart)
admin.site.register(CartItem)

admin.site.register(CartHistory)
admin.site.register(Complaint, ComplaintAdmin)
admin.site.register(Notification)
