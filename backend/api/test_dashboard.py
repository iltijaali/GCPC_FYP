import csv
import io
from datetime import timedelta
from unittest import mock

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Cart, CartHistory, CartItem, Complaint, Notification, Product, User
from .tests import TestCase as BaseTestCase, login, make_user


def make_complaint(user, shop='Shop', status='Pending', days_ago=0, **extra):
    fields = dict(shopkeeper_name='Keeper', dc_email='dc@example.gov.pk', location='Main Road', description='Overcharging')
    fields.update(extra)
    c = Complaint.objects.create(user=user, shop_name=shop, status=status, **fields)
    Complaint.objects.filter(pk=c.pk).update(submitted_date=timezone.now() - timedelta(days=days_ago, hours=1))
    c.refresh_from_db()
    return c


def make_order(user, lines, days_ago=0, saved=True):
    history, _ = CartHistory.objects.get_or_create(user=user)
    cart = Cart.objects.create(user=user, saved=saved, cart_history=history if saved else None)
    for product, qty in lines:
        CartItem.objects.create(cart=cart, product=product, quantity=qty)
    Cart.objects.filter(pk=cart.pk).update(created_at=timezone.now() - timedelta(days=days_ago, hours=1))
    return cart


# These tests create many users; the real (deliberately slow) hasher is covered in tests.py
@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class DashboardTestCase(BaseTestCase):
    def setUp(self):
        self.admin = make_user('boss', is_admin=True)
        self.alice = make_user('alice')
        self.bob = make_user('bob')
        self.apple = Product.objects.create(name='Apple', category='Fruit', price='100.00')
        self.potato = Product.objects.create(name='Potato', category='Vegetable', price='40.00')

        self.admin_client = APIClient()
        login(self.admin_client, 'boss')
        self.user_client = APIClient()
        login(self.user_client, 'alice')


class PermissionTests(DashboardTestCase):
    READ = ['/api/dashboard/stats/', '/api/dashboard/complaints/', '/api/dashboard/complaints/export/',
            '/api/dashboard/products/', '/api/dashboard/orders/', '/api/dashboard/users/']

    def test_anonymous_and_normal_users_are_refused_everywhere(self):
        complaint = make_complaint(self.alice)
        order = make_order(self.alice, [(self.apple, 1)])
        urls = self.READ + [f'/api/dashboard/complaints/{complaint.pk}/', f'/api/dashboard/orders/{order.pk}/',
                            f'/api/dashboard/products/{self.apple.pk}/', f'/api/dashboard/users/{self.bob.pk}/']
        for client, label in ((APIClient(), 'anonymous'), (self.user_client, 'normal user')):
            for url in urls:
                self.assertEqual(client.get(url).status_code, 403, f'{label} GET {url}')
            self.assertEqual(client.patch(f'/api/dashboard/complaints/{complaint.pk}/', {'status': 'Resolved'}, format='json').status_code, 403)
            self.assertEqual(client.post(f'/api/dashboard/complaints/{complaint.pk}/resend-email/').status_code, 403)
            self.assertEqual(client.post('/api/dashboard/products/', {'name': 'X', 'category': 'Fruit', 'price': '1'}, format='json').status_code, 403)
            self.assertEqual(client.patch(f'/api/dashboard/products/{self.apple.pk}/', {'price': '1'}, format='json').status_code, 403)
            self.assertEqual(client.delete(f'/api/dashboard/products/{self.apple.pk}/').status_code, 403)
            self.assertEqual(client.patch(f'/api/dashboard/users/{self.bob.pk}/', {'is_admin': True}, format='json').status_code, 403)
        # nothing changed
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, 'Pending')
        self.assertFalse(User.objects.get(pk=self.bob.pk).is_admin)
        self.assertTrue(Product.objects.filter(pk=self.apple.pk, price='100.00').exists())

    def test_refusal_message_does_not_look_like_an_expired_session(self):
        response = self.user_client.get('/api/dashboard/stats/')
        self.assertEqual(response.data['detail'], 'Administrator access required.')

    def test_admin_can_read_everything(self):
        for url in self.READ:
            self.assertEqual(self.admin_client.get(url).status_code, 200, url)

    def test_login_and_get_me_report_the_role(self):
        anon = APIClient()
        for username, expected in (('boss', True), ('alice', False)):
            data = anon.post('/api/login/', {'username_or_email': username, 'password': 'pass1234'}, format='json').data
            self.assertIs(data['is_admin'], expected)
            me = anon.post('/api/get-me/', {'token': data['token']}, format='json').data
            self.assertEqual(me, {'username': username, 'is_admin': expected})

    def test_admin_role_does_not_change_normal_endpoints(self):
        self.assertEqual(self.admin_client.get('/api/products/').status_code, 200)
        self.assertEqual(self.admin_client.get('/api/complaints/').status_code, 200)

    def test_new_users_are_never_admins_by_default(self):
        response = APIClient().post('/api/register/', {
            'full_name': 'Eve', 'username': 'eve', 'email': 'eve@example.com', 'password': 'secret-pw',
            'is_admin': True}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertFalse(User.objects.get(username='eve').is_admin)


class StatsTests(DashboardTestCase):
    def setUp(self):
        super().setUp()
        # inside the 30-day window: one of each status
        self.pending = make_complaint(self.alice, 'A', 'Pending', days_ago=0, latitude=31.7, longitude=73.9)
        make_complaint(self.alice, 'B', 'In Progress', days_ago=2)
        make_complaint(self.bob, 'C', 'Resolved', days_ago=5, latitude=31.6, longitude=74.3)
        Complaint.objects.filter(shop_name='C').update(dc_notified_at=timezone.now())
        # previous window (31-60 days ago) and outside both
        make_complaint(self.bob, 'D', 'Resolved', days_ago=40)
        make_complaint(self.bob, 'E', 'Pending', days_ago=100)
        # orders: apple 2 x100 + potato 5 x40 = 400 today; apple 1 x100 three days ago
        make_order(self.alice, [(self.apple, 2), (self.potato, 5)], days_ago=0)
        make_order(self.bob, [(self.apple, 1)], days_ago=3)
        make_order(self.bob, [(self.potato, 10)], days_ago=45)      # previous window: 400
        make_order(self.alice, [(self.apple, 9)], days_ago=0, saved=False)  # open cart: never counted
        self.stats = self.admin_client.get('/api/dashboard/stats/?days=30').data

    def test_kpis_compare_with_the_previous_period(self):
        k = self.stats['kpis']
        self.assertEqual(k['complaints'], {'value': 3, 'previous': 1, 'change_pct': 200.0})
        self.assertEqual(k['orders'], {'value': 2, 'previous': 1, 'change_pct': 100.0})
        self.assertEqual(k['order_value'], {'value': 500.0, 'previous': 400.0, 'change_pct': 25.0})
        self.assertEqual(k['open_complaints'], 3)  # A (Pending), B (In Progress), E (Pending): all time
        self.assertEqual(k['resolution_rate'], 33.3)
        self.assertEqual(k['open_by_status'], {'Pending': 2, 'In Progress': 1})
        self.assertEqual((k['users'], k['admins'], k['products']), (3, 1, 2))

    def test_daily_series_cover_every_day_and_add_up(self):
        by_day = self.stats['complaints_by_day']
        self.assertEqual(len(by_day), 30)
        self.assertEqual(by_day[-1]['date'], timezone.now().date().isoformat())
        self.assertEqual(sum(d['count'] for d in by_day), 3)
        self.assertEqual(by_day[-1]['count'], 1)
        # each day is split by status and the parts add up to the day's total
        self.assertTrue(all(d['count'] == d['pending'] + d['in_progress'] + d['resolved'] for d in by_day))
        self.assertEqual((by_day[-1]['pending'], by_day[-1]['in_progress'], by_day[-1]['resolved']), (1, 0, 0))
        self.assertEqual(by_day[-3]['in_progress'], 1)   # 2 days ago
        self.assertEqual(by_day[-6]['resolved'], 1)      # 5 days ago
        orders = self.stats['orders_by_day']
        self.assertEqual(len(orders), 30)
        self.assertEqual(sum(d['count'] for d in orders), 2)
        self.assertEqual(sum(d['value'] for d in orders), 500.0)
        self.assertEqual(orders[-1], {'date': timezone.now().date().isoformat(), 'count': 1, 'value': 400.0})

    def test_status_mix_email_delivery_and_map(self):
        self.assertEqual({s['status']: s['count'] for s in self.stats['complaints_by_status']},
                         {'Pending': 1, 'In Progress': 1, 'Resolved': 1})
        self.assertEqual(self.stats['email_delivery'], {'emailed': 1, 'total': 3})
        self.assertEqual({p['shop_name'] for p in self.stats['map_points']}, {'A', 'C'})

    def test_top_products_rank_by_units_ordered_in_range(self):
        self.assertEqual(
            [(p['name'], p['units'], p['value']) for p in self.stats['top_products']],
            [('Potato', 5, 200.0), ('Apple', 3, 300.0)])

    def test_recent_complaints_newest_first_with_reporter(self):
        recent = self.stats['recent_complaints']
        self.assertEqual([c['shop_name'] for c in recent][:3], ['A', 'B', 'C'])
        self.assertEqual(recent[0]['user']['username'], 'alice')

    def test_range_parameter_is_clamped_and_changes_the_window(self):
        for raw, expected in (('7', 7), ('90', 90), ('0', 1), ('9999', 365), ('abc', 30), ('-5', 1)):
            data = self.admin_client.get(f'/api/dashboard/stats/?days={raw}').data
            self.assertEqual(data['range']['days'], expected, raw)
            self.assertEqual(len(data['complaints_by_day']), expected, raw)
        seven = self.admin_client.get('/api/dashboard/stats/?days=7').data
        self.assertEqual(seven['kpis']['complaints']['value'], 3)      # 0, 2 and 5 days ago
        ninety = self.admin_client.get('/api/dashboard/stats/?days=90').data
        self.assertEqual(ninety['kpis']['complaints']['value'], 4)      # adds the 40-day-old one

    def test_empty_database_gives_zeros_not_errors(self):
        Complaint.objects.all().delete()
        Cart.objects.all().delete()
        data = self.admin_client.get('/api/dashboard/stats/').data
        self.assertEqual(data['kpis']['complaints'], {'value': 0, 'previous': 0, 'change_pct': None})
        self.assertIsNone(data['kpis']['resolution_rate'])
        self.assertEqual(data['top_products'], [])
        self.assertEqual(sum(d['count'] for d in data['orders_by_day']), 0)


class ComplaintManagementTests(DashboardTestCase):
    def setUp(self):
        super().setUp()
        self.c1 = make_complaint(self.alice, 'Fresh Fruit', 'Pending', days_ago=1)
        self.c2 = make_complaint(self.bob, 'Veg Corner', 'In Progress', days_ago=3, description='Short weight')
        self.c3 = make_complaint(self.alice, 'Old Shop', 'Resolved', days_ago=20)
        Complaint.objects.filter(pk=self.c3.pk).update(dc_notified_at=timezone.now())

    def names(self, query=''):
        data = self.admin_client.get(f'/api/dashboard/complaints/{query}').data
        return [c['shop_name'] for c in data['results']]

    def test_default_order_is_newest_first_and_paginated(self):
        self.assertEqual(self.names(), ['Fresh Fruit', 'Veg Corner', 'Old Shop'])
        page = self.admin_client.get('/api/dashboard/complaints/?page_size=2').data
        self.assertEqual((page['count'], len(page['results'])), (3, 2))
        self.assertIsNotNone(page['next'])
        self.assertEqual(len(self.admin_client.get('/api/dashboard/complaints/?page_size=2&page=2').data['results']), 1)

    def test_filters(self):
        self.assertEqual(self.names('?status=Resolved'), ['Old Shop'])
        self.assertEqual(self.names('?status=bogus'), ['Fresh Fruit', 'Veg Corner', 'Old Shop'])
        self.assertEqual(self.names('?search=short weight'), ['Veg Corner'])
        self.assertEqual(self.names('?search=alice'), ['Fresh Fruit', 'Old Shop'])
        User.objects.filter(pk=self.alice.pk).update(full_name='Alice Khan')
        self.assertEqual(self.names('?search=alice khan'), ['Fresh Fruit', 'Old Shop'])   # the reporter's full name too
        self.assertEqual(self.names('?emailed=true'), ['Old Shop'])
        self.assertEqual(self.names('?emailed=false'), ['Fresh Fruit', 'Veg Corner'])
        self.assertEqual(self.names('?days=7'), ['Fresh Fruit', 'Veg Corner'])
        self.assertEqual(self.names('?status=Pending&search=alice'), ['Fresh Fruit'])

    def test_ordering_is_whitelisted(self):
        self.assertEqual(self.names('?ordering=shop_name'), ['Fresh Fruit', 'Old Shop', 'Veg Corner'])
        self.assertEqual(self.names('?ordering=-shop_name'), ['Veg Corner', 'Old Shop', 'Fresh Fruit'])
        # unknown or hostile values fall back to the default instead of erroring
        for bad in ('user__password', 'nope', '--id', ''):
            self.assertEqual(self.names(f'?ordering={bad}'), ['Fresh Fruit', 'Veg Corner', 'Old Shop'], bad)

    def test_detail_includes_reporter_and_contact_details(self):
        data = self.admin_client.get(f'/api/dashboard/complaints/{self.c1.pk}/').data
        self.assertEqual(data['user']['email'], 'alice@example.com')
        self.assertNotIn('password', str(data))
        self.assertNotIn('token', data['user'])

    def test_changing_status_notifies_the_reporter(self):
        response = self.admin_client.patch(f'/api/dashboard/complaints/{self.c1.pk}/', {'status': 'In Progress'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'In Progress')
        note = Notification.objects.get(recipient=self.alice)
        self.assertIn("'In Progress'", note.message)
        # the reporter sees it in their own notifications API
        seen = self.user_client.get('/api/notifications/').data
        self.assertEqual(len(seen), 1)
        # the same status again is not a change, so no second notification
        self.admin_client.patch(f'/api/dashboard/complaints/{self.c1.pk}/', {'status': 'In Progress'}, format='json')
        self.assertEqual(Notification.objects.filter(recipient=self.alice).count(), 1)

    def test_only_the_status_can_be_changed(self):
        before = self.admin_client.get(f'/api/dashboard/complaints/{self.c1.pk}/').data
        bad = self.admin_client.patch(f'/api/dashboard/complaints/{self.c1.pk}/', {'status': 'Done!'}, format='json')
        self.assertEqual(bad.status_code, 400)
        self.admin_client.patch(f'/api/dashboard/complaints/{self.c1.pk}/', {
            'shop_name': 'Hacked', 'description': 'x', 'dc_email': 'evil@example.com', 'dc_notified_at': '2000-01-01T00:00:00Z',
            'user': self.bob.pk}, format='json')
        self.assertEqual(self.admin_client.get(f'/api/dashboard/complaints/{self.c1.pk}/').data, before)
        self.assertEqual(self.admin_client.delete(f'/api/dashboard/complaints/{self.c1.pk}/').status_code, 405)

    @mock.patch('api.dashboard.notify_dc', return_value=True)
    def test_resend_email_returns_the_updated_complaint(self, notify):
        def fake(pk):
            Complaint.objects.filter(pk=pk).update(dc_notified_at=timezone.now())
            return True
        notify.side_effect = fake
        response = self.admin_client.post(f'/api/dashboard/complaints/{self.c1.pk}/resend-email/')
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data['dc_notified_at'])
        notify.assert_called_once_with(self.c1.pk)

    @mock.patch('api.dashboard.notify_dc', return_value=False)
    def test_resend_email_failure_is_reported_not_hidden(self, _):
        response = self.admin_client.post(f'/api/dashboard/complaints/{self.c1.pk}/resend-email/')
        self.assertEqual(response.status_code, 502)
        self.assertIn('could not be sent', response.data['detail'])
        self.c1.refresh_from_db()
        self.assertIsNone(self.c1.dc_notified_at)

    def test_csv_export_respects_filters_and_neutralises_formulas(self):
        make_complaint(self.bob, '=HYPERLINK("http://evil.example","x")', 'Pending', description='+cmd|calc')
        response = self.admin_client.get('/api/dashboard/complaints/export/?status=Pending')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response['Content-Type'].startswith('text/csv'))
        self.assertIn('attachment; filename="complaints-', response['Content-Disposition'])
        rows = list(csv.reader(io.StringIO(response.content.decode())))
        self.assertEqual(rows[0][:3], ['ID', 'Submitted (UTC)', 'Status'])
        self.assertEqual(len(rows), 3)  # header + 2 pending
        flat = [cell for row in rows[1:] for cell in row]
        self.assertTrue(all(not cell.startswith(('=', '+', '-', '@')) for cell in flat))
        self.assertIn("'=HYPERLINK(\"http://evil.example\",\"x\")", flat)
        self.assertIn("'+cmd|calc", flat)


class ProductManagementTests(DashboardTestCase):
    URL = '/api/dashboard/products/'

    def test_list_search_filter_and_order(self):
        Product.objects.create(name='Banana', category='Fruit', price='60')
        names = lambda q: [p['name'] for p in self.admin_client.get(self.URL + q).data['results']]
        self.assertEqual(names(''), ['Apple', 'Banana', 'Potato'])
        self.assertEqual(names('?category=Vegetable'), ['Potato'])
        self.assertEqual(names('?search=an'), ['Banana'])
        self.assertEqual(names('?ordering=-price'), ['Apple', 'Banana', 'Potato'])
        self.assertEqual(names('?ordering=password'), ['Apple', 'Banana', 'Potato'])

    def test_create_update_and_normalise(self):
        r = self.admin_client.post(self.URL, {'name': '  Green   Chilli ', 'category': 'Vegetable', 'price': '240.50'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['name'], 'Green Chilli')
        self.assertEqual(r.data['price'], '240.50')
        patched = self.admin_client.patch(f"{self.URL}{r.data['id']}/", {'price': '260'}, format='json')
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.data['price'], '260.00')
        # the public price list reflects it immediately
        public = self.user_client.get('/api/products/?category=Vegetable').data
        self.assertIn('260.00', [p['price'] for p in public if p['name'] == 'Green Chilli'])

    def test_validation(self):
        bad = [
            ({'name': 'X', 'category': 'Fruit', 'price': '0'}, 'price'),
            ({'name': 'X', 'category': 'Fruit', 'price': '-5'}, 'price'),
            ({'name': 'X', 'category': 'Fruit', 'price': 'abc'}, 'price'),
            ({'name': '   ', 'category': 'Fruit', 'price': '5'}, 'name'),
            ({'name': 'X', 'category': 'Metal', 'price': '5'}, 'category'),
            ({'name': 'apple', 'category': 'Fruit', 'price': '5'}, 'name'),      # duplicate, any case
            ({'category': 'Fruit', 'price': '5'}, 'name'),
        ]
        for body, field in bad:
            r = self.admin_client.post(self.URL, body, format='json')
            self.assertEqual(r.status_code, 400, body)
            self.assertIn(field, r.data, body)
        self.assertEqual(Product.objects.count(), 2)
        # same name in another category is fine
        self.assertEqual(self.admin_client.post(self.URL, {'name': 'Apple', 'category': 'Other', 'price': '5'}, format='json').status_code, 201)
        # renaming onto an existing product is refused, keeping your own name is not
        self.assertEqual(self.admin_client.patch(f'{self.URL}{self.potato.pk}/', {'name': 'Potato', 'price': '41'}, format='json').status_code, 200)

    def test_delete_unused_product(self):
        self.assertEqual(self.admin_client.delete(f'{self.URL}{self.potato.pk}/').status_code, 204)
        self.assertFalse(Product.objects.filter(pk=self.potato.pk).exists())

    def test_cannot_delete_a_product_in_saved_orders(self):
        order = make_order(self.alice, [(self.apple, 2)])
        r = self.admin_client.delete(f'{self.URL}{self.apple.pk}/')
        self.assertEqual(r.status_code, 409)
        self.assertIn('saved order', r.data['detail'])
        self.assertTrue(Product.objects.filter(pk=self.apple.pk).exists())
        self.assertEqual(order.get_total_price(), 200)   # history untouched

    def test_deleting_a_product_only_in_open_carts_removes_it_from_them(self):
        cart = make_order(self.alice, [(self.potato, 1), (self.apple, 1)], saved=False)
        self.assertEqual(self.admin_client.delete(f'{self.URL}{self.potato.pk}/').status_code, 204)
        self.assertEqual(cart.items.count(), 1)

    def test_usage_counts_are_reported(self):
        make_order(self.alice, [(self.apple, 1)])
        make_order(self.bob, [(self.apple, 1)], saved=False)
        row = next(p for p in self.admin_client.get(self.URL).data['results'] if p['name'] == 'Apple')
        self.assertEqual((row['in_saved_orders'], row['in_open_carts']), (1, 1))


class OrderListTests(DashboardTestCase):
    def test_lists_saved_orders_only_with_correct_totals(self):
        make_order(self.alice, [(self.apple, 2), (self.potato, 5)], days_ago=1)
        make_order(self.bob, [(self.potato, 1)], days_ago=2)
        make_order(self.alice, [(self.apple, 9)], saved=False)
        data = self.admin_client.get('/api/dashboard/orders/').data
        self.assertEqual(data['count'], 2)
        first = data['results'][0]
        self.assertEqual(first['user']['username'], 'alice')
        self.assertEqual((first['item_count'], str(first['total'])), (7, '400.00'))
        self.assertEqual([(i['product'], i['quantity'], i['unit_price'], str(i['total'])) for i in first['items']],
                         [('Apple', 2, '100.00', '200.00'), ('Potato', 5, '40.00', '200.00')])

    def test_search_and_date_filters(self):
        make_order(self.alice, [(self.apple, 1)], days_ago=1)
        make_order(self.bob, [(self.potato, 1)], days_ago=40)
        owner = lambda q: [o['user']['username'] for o in self.admin_client.get('/api/dashboard/orders/' + q).data['results']]
        self.assertEqual(owner('?search=potato'), ['bob'])
        self.assertEqual(owner('?search=ALICE'), ['alice'])
        self.assertEqual(owner('?days=7'), ['alice'])
        self.assertEqual(owner('?ordering=created_at'), ['bob', 'alice'])


class UserManagementTests(DashboardTestCase):
    URL = '/api/dashboard/users/'

    def test_list_with_activity_counts_and_filters(self):
        make_complaint(self.alice)
        make_complaint(self.alice)
        make_order(self.alice, [(self.apple, 1)])
        make_order(self.alice, [(self.apple, 1)], saved=False)
        rows = {u['username']: u for u in self.admin_client.get(self.URL).data['results']}
        self.assertEqual((rows['alice']['complaints'], rows['alice']['orders']), (2, 1))
        self.assertEqual((rows['bob']['complaints'], rows['bob']['orders']), (0, 0))
        self.assertNotIn('password', rows['alice'])
        self.assertNotIn('token', rows['alice'])
        self.assertNotIn('otp', rows['alice'])
        usernames = lambda q: [u['username'] for u in self.admin_client.get(self.URL + q).data['results']]
        self.assertEqual(usernames('?role=admin'), ['boss'])
        self.assertEqual(usernames('?role=user'), ['alice', 'bob'])
        self.assertEqual(usernames('?search=ali'), ['alice'])
        self.assertEqual(usernames('?ordering=-complaints')[0], 'alice')

    def test_promote_and_demote_another_user(self):
        r = self.admin_client.patch(f'{self.URL}{self.bob.pk}/', {'is_admin': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(User.objects.get(pk=self.bob.pk).is_admin)
        bob_client = APIClient()
        login(bob_client, 'bob')
        self.assertEqual(bob_client.get('/api/dashboard/stats/').status_code, 200)
        self.admin_client.patch(f'{self.URL}{self.bob.pk}/', {'is_admin': False}, format='json')
        self.assertEqual(bob_client.get('/api/dashboard/stats/').status_code, 403)   # takes effect immediately

    def test_admin_cannot_change_their_own_role(self):
        r = self.admin_client.patch(f'{self.URL}{self.admin.pk}/', {'is_admin': False}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertTrue(User.objects.get(pk=self.admin.pk).is_admin)

    def test_only_the_role_is_editable(self):
        self.admin_client.patch(f'{self.URL}{self.bob.pk}/', {
            'username': 'hacked', 'email': 'x@example.com', 'password': 'new', 'is_admin': False}, format='json')
        bob = User.objects.get(pk=self.bob.pk)
        self.assertEqual((bob.username, bob.email), ('bob', 'bob@example.com'))
        self.assertTrue(bob.check_password('pass1234'))
        self.assertEqual(self.admin_client.delete(f'{self.URL}{self.bob.pk}/').status_code, 405)
        self.assertEqual(self.admin_client.post(self.URL, {'username': 'new'}, format='json').status_code, 405)
