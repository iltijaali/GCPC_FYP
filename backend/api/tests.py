from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User, Product, Cart, CartHistory, Complaint, Notification
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ProductSerializer,
    CartSerializer,
    CartHistorySerializer,
    ComplaintSerializer,
    NotificationSerializer,
)

class UserViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.user_data = {'username': 'newuser', 'email': 'new@example.com', 'password': 'newpassword'}

    def test_list_users(self):
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), User.objects.count())

    def test_create_user(self):
        url = reverse('user-list')
        response = self.client.post(url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 2)
        self.assertEqual(response.data['username'], self.user_data['username'])

    def test_retrieve_user(self):
        url = reverse('user-detail', kwargs={'pk': self.user.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user.username)

    def test_update_user(self):
        url = reverse('user-detail', kwargs={'pk': self.user.id})
        updated_data = {'username': 'updateduser', 'email': 'updated@example.com'}
        response = self.client.put(url, updated_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], updated_data['username'])

    def test_delete_user(self):
        url = reverse('user-detail', kwargs={'pk': self.user.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(User.objects.count(), 0)


class RegisterViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_data = {'username': 'registeruser', 'email': 'register@example.com', 'password': 'registerpassword'}

    def test_create_user_registration(self):
        url = reverse('register-list')
        response = self.client.post(url, self.register_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(response.data['username'], self.register_data['username'])


class ProductViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(name='Test Product', price=10.00)
        self.product_data = {'name': 'New Product', 'price': 20.00}

    def test_list_products(self):
        url = reverse('product-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), Product.objects.count())

    def test_create_product(self):
        url = reverse('product-list')
        response = self.client.post(url, self.product_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)
        self.assertEqual(response.data['name'], self.product_data['name'])

    def test_retrieve_product(self):
        url = reverse('product-detail', kwargs={'pk': self.product.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.product.name)

    def test_update_product(self):
        url = reverse('product-detail', kwargs={'pk': self.product.id})
        updated_data = {'name': 'Updated Product', 'price': 15.00}
        response = self.client.put(url, updated_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], updated_data['name'])

    def test_delete_product(self):
        url = reverse('product-detail', kwargs={'pk': self.product.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Product.objects.count(), 0)


class CartViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(name='Test Product', price=10.00)
        self.cart_item = Cart.objects.create(user=self.user, product=self.product, quantity=2)
        self.cart_data = {'user': self.user.id, 'product': self.product.id, 'quantity': 1}

    def test_list_carts(self):
        url = reverse('cart-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), Cart.objects.count())

    def test_create_cart(self):
        url = reverse('cart-list')
        response = self.client.post(url, self.cart_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cart.objects.count(), 2)
        self.assertEqual(response.data['user'], self.cart_data['user'])

    def test_retrieve_cart(self):
        url = reverse('cart-detail', kwargs={'pk': self.cart_item.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['product'], self.cart_item.product.id)

    def test_update_cart(self):
        url = reverse('cart-detail', kwargs={'pk': self.cart_item.id})
        updated_data = {'quantity': 3}
        response = self.client.patch(url, updated_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['quantity'], updated_data['quantity'])

    def test_delete_cart(self):
        url = reverse('cart-detail', kwargs={'pk': self.cart_item.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Cart.objects.count(), 0)


class CartHistoryViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.product = Product.objects.create(name='Test Product', price=10.00)
        self.cart_history_item = CartHistory.objects.create(user=self.user, items=[{'product': self.product.name, 'price': self.product.price, 'quantity': 1}], total=10.00)
        self.cart_history_data = {'user': self.user.id, 'items': [{'product': 'Another Product', 'price': 5.00, 'quantity': 2}], 'total': 10.00}

    def test_list_cart_histories(self):
        url = reverse('carthistory-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), CartHistory.objects.count())

    def test_create_cart_history(self):
        url = reverse('carthistory-list')
        response = self.client.post(url, self.cart_history_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CartHistory.objects.count(), 2)
        self.assertEqual(response.data['user'], self.cart_history_data['user'])

    def test_retrieve_cart_history(self):
        url = reverse('carthistory-detail', kwargs={'pk': self.cart_history_item.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user'], self.cart_history_item.user.id)

    # Add tests for update and delete if your CartHistoryViewSet supports them


class ComplaintViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.complaint = Complaint.objects.create(user=self.user, description='Test Complaint')
        self.complaint_data = {'user': self.user.id, 'description': 'New Complaint'}

    def test_list_complaints(self):
        url = reverse('complaint-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), Complaint.objects.count())

    def test_create_complaint(self):
        url = reverse('complaint-list')
        response = self.client.post(url, self.complaint_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Complaint.objects.count(), 2)
        self.assertEqual(response.data['user'], self.complaint_data['user'])

    def test_retrieve_complaint(self):
        url = reverse('complaint-detail', kwargs={'pk': self.complaint.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], self.complaint.description)

    # Add tests for update and delete if your ComplaintViewSet supports them


class NotificationViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpassword')
        self.client.force_authenticate(user=self.user)
        self.notification = Notification.objects.create(user=self.user, message='Test Notification')
        self.notification_data = {'user': self.user.id, 'message': 'New Notification'}

    def test_list_notifications(self):
        url = reverse('notification-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), Notification.objects.count())

    def test_create_notification(self):
        url = reverse('notification-list')
        response = self.client.post(url, self.notification_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Notification.objects.count(), 2)
        self.assertEqual(response.data['message'], self.notification_data['message'])

    def test_retrieve_notification(self):
        url = reverse('notification-detail', kwargs={'pk': self.notification.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], self.notification.message)

    # Add tests for update and delete if your NotificationViewSet supports them