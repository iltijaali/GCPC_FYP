import shutil
import tempfile
from datetime import timedelta
from unittest import mock

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase as DjangoTestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.settings import api_settings
from rest_framework.test import APIClient

from . import otpsender
from .models import Cart, CartItem, Complaint, OTPError, Product, User


class TestCase(DjangoTestCase):
    """Throttle counters live in the cache; start every test with a clean slate."""

    def _pre_setup(self):
        cache.clear()
        super()._pre_setup()


def make_user(username, password='pass1234', **extra):
    user = User(username=username, email=f'{username}@example.com', full_name=username, **extra)
    user.set_password(password)
    user.save()
    return user


def login(client, username, password='pass1234'):
    response = client.post('/api/login/', {'username_or_email': username, 'password': password}, format='json')
    assert response.status_code == 200, response.content
    client.credentials(HTTP_AUTHORIZATION=f"MyToken {response.data['token']}")


class PasswordHashingTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_stores_a_hash_not_the_plain_password(self):
        response = self.client.post('/api/register/', {
            'full_name': 'Reg User', 'username': 'reg', 'email': 'reg@example.com', 'password': 'secret-pw',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        stored = User.objects.get(username='reg').password
        self.assertNotEqual(stored, 'secret-pw')
        self.assertTrue(stored.startswith('pbkdf2_'))

    def test_login_works_after_register_by_username_and_email(self):
        self.client.post('/api/register/', {
            'full_name': 'Reg User', 'username': 'reg', 'email': 'reg@example.com', 'password': 'secret-pw',
        }, format='json')
        for ident in ('reg', 'reg@example.com'):
            response = self.client.post('/api/login/', {'username_or_email': ident, 'password': 'secret-pw'}, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('token', response.data)

    def test_wrong_password_is_rejected(self):
        make_user('alice')
        response = self.client.post('/api/login/', {'username_or_email': 'alice', 'password': 'nope'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_legacy_plaintext_password_can_log_in_once_and_is_upgraded(self):
        User.objects.create(username='old', email='old@example.com', password='plain-legacy')
        response = self.client.post('/api/login/', {'username_or_email': 'old', 'password': 'plain-legacy'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.get(username='old').password.startswith('pbkdf2_'))
        # and the upgraded hash still works
        response = self.client.post('/api/login/', {'username_or_email': 'old', 'password': 'plain-legacy'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hash_string_is_not_accepted_as_a_password(self):
        user = make_user('alice')
        response = self.client.post('/api/login/', {'username_or_email': 'alice', 'password': user.password}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @mock.patch('api.serializers.send_otp_email')
    def test_password_reset_flow_stores_a_hash_and_new_password_works(self, send_otp):
        make_user('alice', password='old-pass')
        self.client.post('/api/request-reset-password/', {'email': 'alice@example.com'}, format='json')
        send_otp.assert_called_once()
        otp = User.objects.get(username='alice').otp
        response = self.client.post('/api/reset-password/', {
            'email': 'alice@example.com', 'otp': otp, 'new_password': 'brand-new',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = User.objects.get(username='alice')
        self.assertTrue(user.password.startswith('pbkdf2_'))
        self.assertIsNone(user.otp)
        ok = self.client.post('/api/login/', {'username_or_email': 'alice', 'password': 'brand-new'}, format='json')
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        old = self.client.post('/api/login/', {'username_or_email': 'alice', 'password': 'old-pass'}, format='json')
        self.assertEqual(old.status_code, status.HTTP_400_BAD_REQUEST)


class CartItemIsolationTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(name='Apple', category='Fruit', price='100.00')
        self.alice = make_user('alice')
        self.bob = make_user('bob')
        self.bob_cart = Cart.objects.create(user=self.bob)
        self.bob_item = CartItem.objects.create(cart=self.bob_cart, product=self.product, quantity=2)

        self.client = APIClient()
        login(self.client, 'alice')

    def test_user_cannot_list_other_users_items(self):
        response = self.client.get('/api/cart-items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_user_cannot_read_update_or_delete_other_users_item(self):
        url = f'/api/cart-items/{self.bob_item.id}/'
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(url, {'quantity': 99}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.bob_item.refresh_from_db()
        self.assertEqual(self.bob_item.quantity, 2)

    def test_owner_can_still_add_update_and_delete_own_items(self):
        response = self.client.post('/api/cart-items/', {'product': self.product.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item_id = response.data['id']
        self.assertEqual(CartItem.objects.get(id=item_id).cart.user, self.alice)

        again = self.client.post('/api/cart-items/', {'product': self.product.id}, format='json')
        self.assertEqual(again.data['id'], item_id)
        self.assertEqual(again.data['quantity'], 2)

        url = f'/api/cart-items/{item_id}/'
        patched = self.client.patch(url, {'quantity': 5}, format='json')
        self.assertEqual(patched.status_code, status.HTTP_200_OK)
        self.assertEqual(patched.data['quantity'], 5)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT)

    def test_owner_cannot_move_own_item_into_another_users_cart(self):
        mine = self.client.post('/api/cart-items/', {'product': self.product.id}, format='json').data['id']
        self.client.patch(f'/api/cart-items/{mine}/', {'cart': self.bob_cart.id}, format='json')
        self.assertEqual(CartItem.objects.get(id=mine).cart.user, self.alice)

    def test_unauthenticated_requests_are_rejected(self):
        anonymous = APIClient()
        self.assertIn(anonymous.get('/api/cart-items/').status_code, (401, 403))
        self.assertIn(anonymous.post('/api/cart-items/', {'product': self.product.id}, format='json').status_code, (401, 403))


class ProductReadOnlyTests(TestCase):
    def setUp(self):
        self.apple = Product.objects.create(name='Apple', category='Fruit', price='100.00')
        Product.objects.create(name='Potato', category='Vegetable', price='50.00')
        make_user('alice')
        self.client = APIClient()
        login(self.client, 'alice')

    def test_users_can_list_and_filter_products(self):
        self.assertEqual(len(self.client.get('/api/products/').data), 2)
        fruit = self.client.get('/api/products/?category=Fruit').data
        self.assertEqual([p['name'] for p in fruit], ['Apple'])
        self.assertEqual(self.client.get(f'/api/products/{self.apple.id}/').status_code, status.HTTP_200_OK)

    def test_users_cannot_create_change_or_delete_products(self):
        url = f'/api/products/{self.apple.id}/'
        body = {'name': 'Free Apple', 'category': 'Fruit', 'price': '0.01'}
        self.assertEqual(self.client.post('/api/products/', body, format='json').status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.put(url, body, format='json').status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.patch(url, {'price': '0.01'}, format='json').status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.apple.refresh_from_db()
        self.assertEqual(str(self.apple.price), '100.00')

    def test_products_still_require_login(self):
        self.assertIn(APIClient().get('/api/products/').status_code, (401, 403))


class SecretsTests(TestCase):
    def test_email_credentials_are_not_hardcoded_in_source(self):
        import inspect
        import re
        source = inspect.getsource(otpsender)
        # credentials must come from the environment, never from a string literal in the code
        self.assertIsNone(re.search(r'(SENDER_EMAIL|APP_PASSWORD)\s*=\s*["\'][^"\']+["\']', source))
        self.assertIn('os.environ', source)

    def test_sending_otp_without_credentials_does_not_crash_or_open_smtp(self):
        with mock.patch.object(otpsender, 'SENDER_EMAIL', ''), \
             mock.patch.object(otpsender, 'APP_PASSWORD', ''), \
             mock.patch('smtplib.SMTP') as smtp:
            otpsender.send_otp_email('123456', 'a@example.com', 'A')
        smtp.assert_not_called()

    def test_otp_email_uses_configured_credentials(self):
        with mock.patch.object(otpsender, 'SENDER_EMAIL', 'me@example.com'), \
             mock.patch.object(otpsender, 'APP_PASSWORD', 'app-pw'), \
             mock.patch('smtplib.SMTP') as smtp:
            otpsender.send_otp_email('123456', 'a@example.com', 'A')
        smtp.return_value.__enter__.return_value.login.assert_called_once_with('me@example.com', 'app-pw')


class SeedDataTests(TestCase):
    def test_seed_is_idempotent_and_loads_usable_data(self):
        from io import StringIO
        from django.core.management import call_command
        from .models import CartHistory, Complaint, Notification

        def counts():
            return (Product.objects.count(), User.objects.count(), Cart.objects.count(),
                    CartItem.objects.count(), Complaint.objects.count(), Notification.objects.count(),
                    CartHistory.objects.count())

        call_command('seed_data', stdout=StringIO())
        first = counts()
        call_command('seed_data', stdout=StringIO())
        self.assertEqual(first, counts())
        self.assertGreater(Product.objects.filter(category='Fruit').count(), 0)
        self.assertGreater(Product.objects.filter(category='Vegetable').count(), 0)

        client = APIClient()
        login(client, 'demo', 'Demo@1234')
        self.assertEqual(len(client.get('/api/cart/').data), 1)
        self.assertGreater(len(client.get('/api/complaints/').data), 0)
        self.assertGreater(len(client.get('/api/cart-history/').data[0]['carts']), 0)


class OTPRulesTests(TestCase):
    def setUp(self):
        self.user = make_user('alice')

    def test_otp_is_six_digits_and_records_when_it_was_issued(self):
        for _ in range(200):
            code = self.user.issue_otp()
            self.assertRegex(code, r'^\d{6}$')
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.otp_created_at)
        self.assertEqual(self.user.otp_attempts, 0)

    def test_correct_code_is_accepted_and_whitespace_is_ignored(self):
        code = self.user.issue_otp()
        self.user.verify_otp(f' {code} ')

    def test_wrong_code_counts_attempts_and_locks_after_five(self):
        code = self.user.issue_otp()
        wrong = '000000' if code != '000000' else '111111'
        for expected_left in (4, 3, 2, 1):
            with self.assertRaisesRegex(OTPError, f'{expected_left} attempt'):
                self.user.verify_otp(wrong)
        with self.assertRaisesRegex(OTPError, 'Too many'):
            self.user.verify_otp(wrong)
        # once locked, even the right code no longer works
        with self.assertRaisesRegex(OTPError, 'Too many'):
            self.user.verify_otp(code)
        # a fresh OTP unlocks
        self.user.verify_otp(self.user.issue_otp())

    def test_expired_code_is_rejected(self):
        code = self.user.issue_otp()
        self.user.otp_created_at = timezone.now() - timedelta(minutes=10, seconds=5)
        with self.assertRaisesRegex(OTPError, 'expired'):
            self.user.verify_otp(code)

    def test_code_just_inside_the_window_still_works(self):
        code = self.user.issue_otp()
        self.user.otp_created_at = timezone.now() - timedelta(minutes=9, seconds=50)
        self.user.verify_otp(code)

    def test_no_otp_and_legacy_otp_without_timestamp_are_rejected(self):
        with self.assertRaisesRegex(OTPError, 'No OTP'):
            self.user.verify_otp('123456')
        User.objects.filter(pk=self.user.pk).update(otp='123456', otp_created_at=None)
        self.user.refresh_from_db()
        with self.assertRaisesRegex(OTPError, 'No OTP'):
            self.user.verify_otp('123456')


class PasswordResetApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('alice', password='old-pass')

    def request_otp(self):
        with mock.patch('api.serializers.send_otp_email') as send:
            response = self.client.post('/api/request-reset-password/', {'email': 'alice@example.com'}, format='json')
        return response, send

    def test_request_sends_the_otp_and_stores_it_with_a_timestamp(self):
        response, send = self.request_otp()
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        send.assert_called_once_with(self.user.otp, 'alice@example.com', 'alice')
        self.assertIsNotNone(self.user.otp_created_at)

    def test_second_request_within_a_minute_is_refused_then_allowed(self):
        self.request_otp()
        first = User.objects.get(pk=self.user.pk).otp
        response, send = self.request_otp()
        self.assertEqual(response.status_code, 400)
        self.assertIn('wait', str(response.data).lower())
        send.assert_not_called()
        self.assertEqual(User.objects.get(pk=self.user.pk).otp, first)

        User.objects.filter(pk=self.user.pk).update(otp_created_at=timezone.now() - timedelta(seconds=61))
        response, send = self.request_otp()
        self.assertEqual(response.status_code, 200)
        send.assert_called_once()

    def test_verify_endpoint_locks_after_five_wrong_codes(self):
        self.request_otp()
        code = User.objects.get(pk=self.user.pk).otp
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(5):
            r = self.client.post('/api/verify-otp/', {'email': 'alice@example.com', 'otp': wrong}, format='json')
            self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/verify-otp/', {'email': 'alice@example.com', 'otp': code}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Too many', str(r.data))

    def test_otp_works_once_for_reset(self):
        self.request_otp()
        code = User.objects.get(pk=self.user.pk).otp
        ok = self.client.post('/api/reset-password/', {'email': 'alice@example.com', 'otp': code, 'new_password': 'fresh-pass'}, format='json')
        self.assertEqual(ok.status_code, 200)
        again = self.client.post('/api/reset-password/', {'email': 'alice@example.com', 'otp': code, 'new_password': 'hacked!!'}, format='json')
        self.assertEqual(again.status_code, 400)
        user = User.objects.get(pk=self.user.pk)
        self.assertTrue(user.check_password('fresh-pass'))
        self.assertIsNone(user.otp)

    def test_expired_code_cannot_reset_the_password(self):
        self.request_otp()
        User.objects.filter(pk=self.user.pk).update(otp_created_at=timezone.now() - timedelta(minutes=11))
        code = User.objects.get(pk=self.user.pk).otp
        r = self.client.post('/api/reset-password/', {'email': 'alice@example.com', 'otp': code, 'new_password': 'fresh-pass'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('expired', str(r.data))
        self.assertTrue(User.objects.get(pk=self.user.pk).check_password('old-pass'))


def rate(scope):
    return int(api_settings.DEFAULT_THROTTLE_RATES[scope].split('/')[0])


class ThrottleTests(TestCase):
    def test_login_attempts_are_limited_per_minute(self):
        make_user('alice')
        client = APIClient()
        limit = rate('login')
        codes = [client.post('/api/login/', {'username_or_email': 'alice', 'password': 'nope'}, format='json').status_code
                 for _ in range(limit + 2)]
        self.assertEqual(codes[:limit], [400] * limit)
        self.assertEqual(codes[limit:], [429, 429])
        # even the right password is refused while throttled
        good = client.post('/api/login/', {'username_or_email': 'alice', 'password': 'pass1234'}, format='json')
        self.assertEqual(good.status_code, 429)

    def test_otp_endpoints_share_a_limit(self):
        client = APIClient()
        limit = rate('otp')
        codes = [client.post('/api/verify-otp/', {'email': 'x@example.com', 'otp': '1'}, format='json').status_code
                 for _ in range(limit + 1)]
        self.assertEqual(codes[:limit], [400] * limit)
        self.assertEqual(codes[limit], 429)
        # request-reset shares the same bucket
        other = client.post('/api/request-reset-password/', {'email': 'x@example.com'}, format='json')
        self.assertEqual(other.status_code, 429)


SMTP_CREDS = dict(SENDER_EMAIL='gcpc@example.com', APP_PASSWORD='app-pw')


@override_settings(EMAIL_ASYNC=False)
class ComplaintEmailTests(TestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        self.user = make_user('alice')
        self.user.full_name = 'Alice Khan'
        self.user.save()
        self.client = APIClient()
        login(self.client, 'alice')
        self.body = {
            'shop_name': 'Fresh Fruit Corner', 'shopkeeper_name': 'Bashir',
            'dc_email': 'dc@example.gov.pk', 'location': 'Main Bazaar',
            'description': 'Apples at Rs. 400/kg instead of Rs. 280/kg.',
            'latitude': '31.7131', 'longitude': '73.9783',
        }

    def submit(self, **overrides):
        with override_settings(MEDIA_ROOT=self.media), \
             mock.patch.multiple('api.otpsender', **SMTP_CREDS), \
             mock.patch('smtplib.SMTP') as smtp, \
             self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/complaints/', {**self.body, **overrides}, format='multipart')
        server = smtp.return_value.__enter__.return_value
        sent = server.send_message.call_args[0][0] if server.send_message.called else None
        return response, sent, smtp

    def test_complaint_is_emailed_to_the_dc_and_marked_notified(self):
        response, sent, smtp = self.submit()
        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(sent)
        self.assertEqual(sent['To'], 'dc@example.gov.pk')
        self.assertEqual(sent['From'], 'gcpc@example.com')
        self.assertEqual(sent['Reply-To'], 'alice@example.com')
        self.assertIn('Fresh Fruit Corner', sent['Subject'])
        body = sent.get_body(preferencelist=('plain',)).get_content()
        for expected in ('Bashir', 'Main Bazaar', 'Apples at Rs. 400/kg', 'Alice Khan <alice@example.com>',
                         'openstreetmap.org/?mlat=31.7131&mlon=73.9783'):
            self.assertIn(expected, body)
        smtp.return_value.__enter__.return_value.login.assert_called_once_with('gcpc@example.com', 'app-pw')

        complaint = Complaint.objects.get(pk=response.data['id'])
        self.assertIsNotNone(complaint.dc_notified_at)
        self.assertIsNotNone(self.client.get('/api/complaints/').data[0]['dc_notified_at'])

    def test_photo_is_attached(self):
        import io
        from PIL import Image
        buffer = io.BytesIO()
        Image.new('RGB', (8, 8), (200, 50, 50)).save(buffer, format='PNG')
        png = buffer.getvalue()
        response, sent, _ = self.submit(photo=SimpleUploadedFile('shop.png', png, content_type='image/png'))
        self.assertEqual(response.status_code, 201)
        attachments = list(sent.iter_attachments())
        self.assertEqual(len(attachments), 1)
        self.assertEqual(attachments[0].get_content_type(), 'image/png')
        self.assertTrue(attachments[0].get_filename().endswith('.png'))
        self.assertEqual(attachments[0].get_payload(decode=True), png)

    def test_no_location_pin_is_reported_as_not_provided(self):
        response, sent, _ = self.submit(latitude='', longitude='')
        self.assertEqual(response.status_code, 201)
        self.assertIn('Map: Not provided', sent.get_body(preferencelist=('plain',)).get_content())

    def test_mail_problems_never_break_or_lose_the_complaint(self):
        with override_settings(MEDIA_ROOT=self.media), \
             mock.patch.multiple('api.otpsender', **SMTP_CREDS), \
             mock.patch('smtplib.SMTP', side_effect=OSError('smtp down')), \
             self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/complaints/', self.body, format='multipart')
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(Complaint.objects.get(pk=response.data['id']).dc_notified_at)

    def test_missing_credentials_leave_the_complaint_unsent(self):
        with override_settings(MEDIA_ROOT=self.media), \
             mock.patch.multiple('api.otpsender', SENDER_EMAIL='', APP_PASSWORD=''), \
             mock.patch('smtplib.SMTP') as smtp, \
             self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/complaints/', self.body, format='multipart')
        self.assertEqual(response.status_code, 201)
        smtp.assert_not_called()
        self.assertIsNone(Complaint.objects.get(pk=response.data['id']).dc_notified_at)

    def test_user_input_cannot_inject_headers_or_html(self):
        response, sent, _ = self.submit(
            shop_name='Evil\r\nBcc: victim@example.com', shopkeeper_name='X',
            description='<script>alert(1)</script>')
        self.assertEqual(response.status_code, 201)
        self.assertNotIn('\n', sent['Subject'])
        self.assertIsNone(sent['Bcc'])
        html_part = sent.get_body(preferencelist=('html',)).get_content()
        self.assertNotIn('<script>', html_part)
        self.assertIn('&lt;script&gt;', html_part)

    def test_status_and_notified_fields_cannot_be_set_by_the_user(self):
        response, _, _ = self.submit(status='Resolved', dc_notified_at='2000-01-01T00:00:00Z')
        self.assertEqual(response.status_code, 201)
        complaint = Complaint.objects.get(pk=response.data['id'])
        self.assertEqual(complaint.status, 'Pending')
        patch = self.client.patch(f'/api/complaints/{complaint.pk}/', {'status': 'Resolved'}, format='json')
        self.assertEqual(patch.status_code, 200)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, 'Pending')

    def test_creating_complaints_is_limited_per_hour(self):
        limit = rate('complaint')
        with mock.patch('api.views.notify_dc_in_background'), override_settings(MEDIA_ROOT=self.media):
            codes = [self.client.post('/api/complaints/', self.body, format='multipart').status_code
                     for _ in range(limit + 1)]
        self.assertEqual(codes[:limit], [201] * limit)
        self.assertEqual(codes[limit], 429)
        # reading is not limited
        self.assertEqual(self.client.get('/api/complaints/').status_code, 200)


class CartValidationTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(name='Apple', category='Fruit', price='100.00')
        make_user('alice')
        self.client = APIClient()
        login(self.client, 'alice')

    def test_unknown_or_malformed_product_ids_get_a_clear_400(self):
        for bad in (99999, 'abc', '', None, [1]):
            response = self.client.post('/api/cart-items/', {'product': bad}, format='json')
            self.assertEqual(response.status_code, 400, bad)
            self.assertIn('error', response.data)

    def test_quantity_below_one_is_rejected(self):
        item = self.client.post('/api/cart-items/', {'product': self.product.id}, format='json').data['id']
        for bad in (0, -3):
            response = self.client.patch(f'/api/cart-items/{item}/', {'quantity': bad}, format='json')
            self.assertEqual(response.status_code, 400, bad)
        self.assertEqual(CartItem.objects.get(pk=item).quantity, 1)
        self.assertEqual(self.client.patch(f'/api/cart-items/{item}/', {'quantity': 4}, format='json').status_code, 200)


@override_settings(CORS_ALLOWED_ORIGINS=['http://localhost:5173', 'http://127.0.0.1:5173'])
class CorsTests(TestCase):
    def preflight(self, origin):
        return APIClient().options('/api/login/', HTTP_ORIGIN=origin,
                                   HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST')

    def test_local_frontends_are_allowed(self):
        for origin in ('http://localhost:5173', 'http://127.0.0.1:5173'):
            self.assertEqual(self.preflight(origin).headers.get('Access-Control-Allow-Origin'), origin)

    def test_other_origins_are_not(self):
        self.assertIsNone(self.preflight('https://evil.example').headers.get('Access-Control-Allow-Origin'))
