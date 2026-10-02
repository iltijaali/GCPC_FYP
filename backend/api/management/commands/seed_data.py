import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

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

# Extra citizens whose activity over the last ~60 days fills the admin dashboard charts.
CITIZENS = [
    ('citizen1', 'Hina Malik'), ('citizen2', 'Usman Raza'), ('citizen3', 'Ayesha Siddiqui'),
    ('citizen4', 'Bilal Chaudhry'), ('citizen5', 'Fatima Noor'), ('citizen6', 'Hamza Iqbal'),
    ('citizen7', 'Mariam Aslam'), ('citizen8', 'Zain Abbas'), ('citizen9', 'Sana Tariq'),
]
CITIZEN_PASSWORD = 'Citizen@1234'

SHOPS = [
    ('Fresh Fruit Corner', 'Bashir Ahmed'), ('Al-Madina Vegetables', 'Rashid Mehmood'),
    ('City Fruit Mart', 'Tariq Hussain'), ('Noor Fruit Shop', 'Imran Noor'),
    ('Madni Sabzi Mandi', 'Khalid Madni'), ('Bismillah Fruit House', 'Saeed Anwar'),
    ('Green Valley Vegetables', 'Naveed Akhtar'), ('Punjab Fruit Centre', 'Javed Iqbal'),
    ('Farooq Vegetable Point', 'Farooq Ali'), ('Sunrise Fruit Stall', 'Adeel Shah'),
]
AREAS = [
    # (location, latitude, longitude, DC email)
    ('Main Bazaar, Sheikhupura', 31.7131, 73.9783, 'dc.sheikhupura@example.gov.pk'),
    ('Lahore Road, Sheikhupura', 31.7052, 73.9851, 'dc.sheikhupura@example.gov.pk'),
    ('Railway Road, Sheikhupura', 31.7110, 73.9800, 'dc.sheikhupura@example.gov.pk'),
    ('Faisalabad Road, Sheikhupura', 31.7019, 73.9670, 'dc.sheikhupura@example.gov.pk'),
    ('Mall Road, Lahore', 31.5497, 74.3436, 'dc.lahore@example.gov.pk'),
    ('Model Town, Lahore', 31.4830, 74.3250, 'dc.lahore@example.gov.pk'),
    ('Satellite Town, Gujranwala', 32.1877, 74.1945, 'dc.gujranwala@example.gov.pk'),
]
COMPLAINT_TEXTS = [
    'Selling above the notified price and refusing to show the official price list.',
    'Using a tampered weighing scale; a kilo weighs noticeably less.',
    'Charging Rs. 100 more per kg than the government rate for the same item.',
    'No price list displayed in the shop; prices change from customer to customer.',
    'Selling stale produce at the price of fresh produce.',
    'Short weight on every purchase, confirmed by weighing it again elsewhere.',
    'Added a "packing charge" that is not part of the notified price.',
    'Prices were doubled in the evening, right after the market inspector left.',
]
# Popular items are ordered more often, so "top products" looks like real life.
POPULAR = {'Potato': 6, 'Onion': 6, 'Tomato': 5, 'Banana': 5, 'Apple': 4, 'Mango': 3, 'Orange': 3, 'Spinach': 2}

SEED_PASSWORDS_NOTE = ('Demo logins: ' + ', '.join(f'{u}/{p}' for u, _, p in USERS)
                       + f'; dashboard citizens: citizen1..citizen9/{CITIZEN_PASSWORD}')


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

        self._seed_activity(products)

        if not opts['no_admin']:
            app_admin, _ = User.objects.get_or_create(
                username='admin', defaults={'email': 'admin@example.com', 'full_name': 'Site Admin'})
            app_admin.is_admin = True
            app_admin.set_password('Admin@1234')
            app_admin.save()

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
        if not opts['no_admin']:
            self.stdout.write('Dashboard admin (log in on the normal login page, then open /admin): admin/Admin@1234')

    def _seed_activity(self, products):
        """About two months of orders and complaints from extra citizens, for the dashboard charts.

        Deterministic (fixed random seed) and only added once, so re-running does not pile up data.
        """
        rng = random.Random(2026)
        now = timezone.now()
        citizens = []
        for username, full_name in CITIZENS:
            user, _ = User.objects.get_or_create(
                username=username, defaults={'email': f'{username}@example.com', 'full_name': full_name})
            user.set_password(CITIZEN_PASSWORD)
            user.save()
            citizens.append(user)

        def when():
            # recent days are more likely than old ones
            days = min(59, int(rng.expovariate(1 / 20)))
            return now - timedelta(days=days, hours=rng.randint(0, 11), minutes=rng.randint(0, 59)), days

        if not Complaint.objects.filter(user__in=citizens).exists():
            for _ in range(48):
                submitted, days = when()
                weights = ([70, 20, 10] if days > 25 else [35, 35, 30] if days > 7 else [15, 30, 55])
                status = rng.choices(['Resolved', 'In Progress', 'Pending'], weights)[0]
                shop, keeper = rng.choice(SHOPS)
                place, lat, lng, dc = rng.choice(AREAS)
                complaint = Complaint.objects.create(
                    user=rng.choice(citizens), shop_name=shop, shopkeeper_name=keeper, dc_email=dc,
                    location=place, description=rng.choice(COMPLAINT_TEXTS), status=status,
                    latitude=round(lat + rng.uniform(-0.004, 0.004), 6),
                    longitude=round(lng + rng.uniform(-0.004, 0.004), 6))
                emailed = submitted + timedelta(seconds=rng.randint(2, 20)) if rng.random() < (0.5 if days < 2 else 0.9) else None
                # submitted_date is auto_now_add, so backdate with update()
                Complaint.objects.filter(pk=complaint.pk).update(submitted_date=submitted, dc_notified_at=emailed)

        if not Cart.objects.filter(user__in=citizens, saved=True).exists():
            names = list(products)
            weights = [POPULAR.get(n, 1) for n in names]
            for _ in range(90):
                created, _days = when()
                user = rng.choice(citizens)
                history, _ = CartHistory.objects.get_or_create(user=user)
                cart = Cart.objects.create(user=user, saved=True, cart_history=history)
                picked = []
                while len(picked) < rng.randint(1, 5):
                    name = rng.choices(names, weights)[0]
                    if name not in picked:
                        picked.append(name)
                for name in picked:
                    CartItem.objects.create(cart=cart, product=products[name], quantity=rng.randint(1, 6))
                Cart.objects.filter(pk=cart.pk).update(created_at=created)
