from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import (
    Cart, CartHistory, CartItem, Complaint, Notification, Product, User,
)

PRODUCTS = [
    # (name, category, price in Rs)
    ('Apple', 'Fruit', 280), ('Banana', 'Fruit', 150), ('Mango', 'Fruit', 320),
    ('Orange', 'Fruit', 200), ('Grapes', 'Fruit', 350), ('Guava', 'Fruit', 180),
    ('Pomegranate', 'Fruit', 400), ('Watermelon', 'Fruit', 70), ('Peach', 'Fruit', 260),
    ('Potato', 'Vegetable', 90), ('Onion', 'Vegetable', 110), ('Tomato', 'Vegetable', 130),
    ('Spinach', 'Vegetable', 60), ('Cauliflower', 'Vegetable', 120), ('Carrot', 'Vegetable', 100),
    ('Cucumber', 'Vegetable', 80), ('Okra', 'Vegetable', 200), ('Green Chilli', 'Vegetable', 240),
    ('Garlic', 'Vegetable', 450), ('Ginger', 'Vegetable', 500),
]

USERS = [
    # (username, full name, password)
    ('demo', 'Demo User', 'Demo@1234'),
    ('ali', 'Ali Khan', 'Ali@1234'),
    ('sara', 'Sara Ahmed', 'Sara@1234'),
]

# user -> list of saved orders, each a list of (product name, quantity)
ORDERS = {
    'demo': [
        [('Apple', 2), ('Banana', 3), ('Potato', 5)],
        [('Tomato', 2), ('Onion', 3), ('Green Chilli', 1)],
    ],
    'ali': [[('Mango', 4), ('Watermelon', 1)]],
    'sara': [[('Spinach', 2), ('Carrot', 2), ('Cucumber', 3)]],
}

# user -> open (unsaved) cart, shown on the Cart page
OPEN_CARTS = {
    'demo': [('Orange', 2), ('Cauliflower', 1)],
}

COMPLAINTS = [
    # (username, shop, shopkeeper, dc_email, location, description, status, lat, lng)
    ('demo', 'Fresh Fruit Corner', 'Bashir Ahmed', 'dc.sheikhupura@example.gov.pk',
     'Main Bazaar, Sheikhupura', 'Selling apples at Rs. 400/kg while the notified price is Rs. 280/kg.',
     'Pending', 31.7131, 73.9783),
    ('demo', 'Al-Madina Vegetables', 'Rashid Mehmood', 'dc.sheikhupura@example.gov.pk',
     'Lahore Road, Sheikhupura', 'Charging Rs. 180/kg for tomatoes; no price list displayed in the shop.',
     'In Progress', 31.7052, 73.9851),
    ('ali', 'City Fruit Mart', 'Tariq Hussain', 'dc.lahore@example.gov.pk',
     'Mall Road, Lahore', 'Using a tampered weighing scale and short-weighting mangoes.',
     'Resolved', 31.5497, 74.3436),
]

SEED_PASSWORDS_NOTE = 'Demo logins: ' + ', '.join(f'{u}/{p}' for u, _, p in USERS)


class Command(BaseCommand):
    help = 'Load demo users, products, orders, complaints and notifications. Safe to re-run.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
                            help='Delete all products, carts, complaints and notifications first.')
        parser.add_argument('--no-admin', action='store_true',
                            help='Do not create the Django admin user (admin / Admin@1234).')

    @transaction.atomic
    def handle(self, *args, **opts):
        if opts['reset']:
            for model in (Notification, Complaint, CartItem, Cart, CartHistory, Product):
                model.objects.all().delete()
            self.stdout.write('Cleared existing data.')

        products = {}
        for name, category, price in PRODUCTS:
            products[name], _ = Product.objects.update_or_create(
                name=name, defaults={'category': category, 'price': price})

        users = {}
        for username, full_name, password in USERS:
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={'email': f'{username}@example.com', 'full_name': full_name})
            user.set_password(password)
            user.save()
            users[username] = user

        for username, orders in ORDERS.items():
            user = users[username]
            history, _ = CartHistory.objects.get_or_create(user=user)
            if history.carts.exists():
                continue  # already seeded
            for lines in orders:
                cart = Cart.objects.create(user=user, saved=True, cart_history=history)
                for name, qty in lines:
                    CartItem.objects.create(cart=cart, product=products[name], quantity=qty)

        for username, lines in OPEN_CARTS.items():
            user = users[username]
            if Cart.objects.filter(user=user, saved=False).exists():
                continue
            cart = Cart.objects.create(user=user)
            for name, qty in lines:
                CartItem.objects.create(cart=cart, product=products[name], quantity=qty)

        for username, shop, keeper, dc, loc, desc, status, lat, lng in COMPLAINTS:
            Complaint.objects.get_or_create(
                user=users[username], shop_name=shop,
                defaults={'shopkeeper_name': keeper, 'dc_email': dc, 'location': loc,
                          'description': desc, 'status': status, 'latitude': lat, 'longitude': lng})

        notifications = [
            ('demo', "Your complaint status has been updated to 'In Progress'", False),
            ('demo', 'Welcome to the Government Commodities Price Calculator.', True),
            ('ali', "Your complaint status has been updated to 'Resolved'", False),
        ]
        for username, message, is_read in notifications:
            Notification.objects.get_or_create(
                recipient=users[username], message=message, defaults={'is_read': is_read})

        if not opts['no_admin']:
            Admin = get_user_model()
            admin, _ = Admin.objects.get_or_create(
                username='admin', defaults={'email': 'admin@example.com', 'is_staff': True, 'is_superuser': True})
            admin.set_password('Admin@1234')
            admin.save()

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {Product.objects.count()} products, {User.objects.count()} users, '
            f'{Cart.objects.count()} carts, {Complaint.objects.count()} complaints, '
            f'{Notification.objects.count()} notifications.'))
        self.stdout.write(SEED_PASSWORDS_NOTE)
