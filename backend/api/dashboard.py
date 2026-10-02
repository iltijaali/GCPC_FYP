"""Admin dashboard API (/api/dashboard/...). Every endpoint requires an app user with is_admin=True."""
import csv
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import CustomTokenAuthentication
from .complaintmail import notify_dc
from .models import Cart, CartItem, Complaint, Product, User

STATUSES = [choice[0] for choice in Complaint.STATUS_CHOICES]
MONEY = DecimalField(max_digits=14, decimal_places=2)
LINE_VALUE = ExpressionWrapper(F('quantity') * F('product__price'), output_field=MONEY)
# The same expression rooted at Cart (a cart's value joins through its items)
LINE_VALUE_FOR_CART = ExpressionWrapper(F('items__quantity') * F('items__product__price'), output_field=MONEY)


class IsAppAdmin(permissions.BasePermission):
    message = "Administrator access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and getattr(user, 'is_authenticated', False) and getattr(user, 'is_admin', False))


class DashboardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class DashboardMixin:
    authentication_classes = [CustomTokenAuthentication]
    permission_classes = [IsAppAdmin]
    pagination_class = DashboardPagination


def _ordering(request, allowed, default):
    value = request.query_params.get('ordering', default)
    return value if value in allowed else default


def _to_float(value):
    return float(value) if value is not None else 0.0


# --------------------------------------------------------------------------- statistics

def _daily(rows, start, days, keys):
    """Turn [{'d': date, ...}] into one entry per day (zeros where nothing happened)."""
    by_day = {row['d']: row for row in rows}
    out = []
    for i in range(days):
        day = start + timedelta(days=i)
        row = by_day.get(day, {})
        out.append({'date': day.isoformat(), **{k: _to_float(row.get(k)) if k == 'value' else int(row.get(k) or 0) for k in keys}})
    return out


def _complaints_daily(qs, start, days):
    """One entry per day with the day's complaints split by their current status."""
    table = {}
    for row in qs.annotate(d=TruncDate('submitted_date')).values('d', 'status').annotate(n=Count('id')):
        table.setdefault(row['d'], {})[row['status']] = row['n']
    out = []
    for i in range(days):
        day = start + timedelta(days=i)
        counts = table.get(day, {})
        out.append({
            'date': day.isoformat(), 'count': sum(counts.values()),
            'pending': counts.get('Pending', 0), 'in_progress': counts.get('In Progress', 0),
            'resolved': counts.get('Resolved', 0),
        })
    return out


def _change(current, previous):
    return {
        'value': current,
        'previous': previous,
        'change_pct': round((current - previous) / previous * 100, 1) if previous else None,
    }


class DashboardStatsView(DashboardMixin, APIView):
    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
        except ValueError:
            days = 30
        days = max(1, min(days, 365))

        today = timezone.now().date()
        start = today - timedelta(days=days - 1)
        prev_start = start - timedelta(days=days)
        prev_end = start - timedelta(days=1)

        complaints = Complaint.objects.all()
        in_range = complaints.filter(submitted_date__date__range=(start, today))
        in_prev = complaints.filter(submitted_date__date__range=(prev_start, prev_end))

        orders = Cart.objects.filter(saved=True)
        orders_range = orders.filter(created_at__date__range=(start, today))
        orders_prev = orders.filter(created_at__date__range=(prev_start, prev_end))

        def order_value(qs):
            return _to_float(CartItem.objects.filter(cart__in=qs).aggregate(v=Sum(LINE_VALUE))['v'])

        order_rows = (
            orders_range.annotate(d=TruncDate('created_at')).values('d')
            .annotate(count=Count('id', distinct=True), value=Sum(LINE_VALUE_FOR_CART))
        )

        status_counts = {s: 0 for s in STATUSES}
        for row in in_range.values('status').annotate(n=Count('id')):
            status_counts[row['status']] = row['n']
        range_total = sum(status_counts.values())

        emailed = in_range.filter(dc_notified_at__isnull=False).count()
        resolved = status_counts.get('Resolved', 0)

        top_products = (
            CartItem.objects.filter(cart__in=orders_range)
            .values('product__id', 'product__name', 'product__category')
            .annotate(units=Sum('quantity'), value=Sum(LINE_VALUE))
            .order_by('-units', 'product__name')[:8]
        )

        recent = complaints.select_related('user').order_by('-submitted_date')[:6]
        map_points = in_range.exclude(latitude__isnull=True).exclude(longitude__isnull=True).values(
            'id', 'shop_name', 'status', 'latitude', 'longitude')[:300]

        return Response({
            'range': {'days': days, 'start': start.isoformat(), 'end': today.isoformat()},
            'kpis': {
                'complaints': {**_change(range_total, in_prev.count())},
                'orders': {**_change(orders_range.count(), orders_prev.count())},
                'order_value': {**_change(order_value(orders_range), order_value(orders_prev))},
                'open_complaints': complaints.exclude(status='Resolved').count(),
                'open_by_status': {s: complaints.filter(status=s).count() for s in STATUSES if s != 'Resolved'},
                'resolution_rate': round(resolved / range_total * 100, 1) if range_total else None,
                'users': User.objects.count(),
                'admins': User.objects.filter(is_admin=True).count(),
                'products': Product.objects.count(),
            },
            'complaints_by_day': _complaints_daily(in_range, start, days),
            'orders_by_day': _daily(order_rows, start, days, ['count', 'value']),
            'complaints_by_status': [{'status': s, 'count': status_counts[s]} for s in STATUSES],
            'email_delivery': {'emailed': emailed, 'total': range_total},
            'top_products': [
                {'id': r['product__id'], 'name': r['product__name'], 'category': r['product__category'],
                 'units': r['units'], 'value': _to_float(r['value'])}
                for r in top_products
            ],
            'recent_complaints': DashboardComplaintSerializer(recent, many=True, context={'request': request}).data,
            'map_points': list(map_points),
        })


# --------------------------------------------------------------------------- complaints

class ReporterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']


class DashboardComplaintSerializer(serializers.ModelSerializer):
    user = ReporterSerializer(read_only=True)

    class Meta:
        model = Complaint
        fields = ['id', 'user', 'shop_name', 'shopkeeper_name', 'dc_email', 'location', 'description', 'photo',
                  'status', 'submitted_date', 'latitude', 'longitude', 'dc_notified_at']
        read_only_fields = [f for f in fields if f != 'status']


def _csv_safe(value):
    """Spreadsheet programs run cells that start with = + - @ as formulas; neutralise them."""
    text = '' if value is None else str(value)
    return "'" + text if text[:1] in ('=', '+', '-', '@', '\t', '\r') else text


class DashboardComplaintViewSet(DashboardMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                                mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = DashboardComplaintSerializer
    http_method_names = ['get', 'patch', 'post', 'head', 'options']
    ORDERING = {'submitted_date', '-submitted_date', 'shop_name', '-shop_name', 'status', '-status'}

    def get_queryset(self):
        qs = Complaint.objects.select_related('user')
        params = self.request.query_params
        if params.get('status') in STATUSES:
            qs = qs.filter(status=params['status'])
        emailed = params.get('emailed')
        if emailed in ('true', 'false'):
            qs = qs.filter(dc_notified_at__isnull=(emailed == 'false'))
        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(shop_name__icontains=search) | Q(shopkeeper_name__icontains=search)
                | Q(location__icontains=search) | Q(description__icontains=search)
                | Q(user__username__icontains=search) | Q(user__email__icontains=search)
                | Q(user__full_name__icontains=search)
            )
        if params.get('days', '').isdigit():
            qs = qs.filter(submitted_date__gte=timezone.now() - timedelta(days=int(params['days'])))
        return qs.order_by(_ordering(self.request, self.ORDERING, '-submitted_date'), '-id')

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="complaints-{timezone.now():%Y%m%d}.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Submitted (UTC)', 'Status', 'Shop', 'Shopkeeper', 'Location', 'Latitude', 'Longitude',
                         'DC email', 'Emailed to DC (UTC)', 'Reporter', 'Reporter email', 'Description'])
        for c in self.filter_queryset(self.get_queryset()):
            writer.writerow([_csv_safe(v) for v in [
                c.id, c.submitted_date.strftime('%Y-%m-%d %H:%M'), c.status, c.shop_name, c.shopkeeper_name,
                c.location, c.latitude, c.longitude, c.dc_email,
                c.dc_notified_at.strftime('%Y-%m-%d %H:%M') if c.dc_notified_at else '',
                c.user.username, c.user.email, c.description]])
        return response

    @action(detail=True, methods=['post'], url_path='resend-email')
    def resend_email(self, request, pk=None):
        complaint = self.get_object()
        if not notify_dc(complaint.pk):
            return Response({'detail': 'The email could not be sent. Check the email settings on the server.'},
                            status=status.HTTP_502_BAD_GATEWAY)
        complaint.refresh_from_db()
        return Response(self.get_serializer(complaint).data)


# --------------------------------------------------------------------------- products

class DashboardProductSerializer(serializers.ModelSerializer):
    in_open_carts = serializers.SerializerMethodField()
    in_saved_orders = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'price', 'date_updated', 'in_open_carts', 'in_saved_orders']
        read_only_fields = ['date_updated', 'in_open_carts', 'in_saved_orders']

    def get_in_open_carts(self, obj):
        return obj.cartitem_set.filter(cart__saved=False).count()

    def get_in_saved_orders(self, obj):
        return obj.cartitem_set.filter(cart__saved=True).count()

    def validate_name(self, value):
        value = ' '.join(value.split())
        if not value:
            raise serializers.ValidationError('Name is required.')
        return value

    def validate_price(self, value):
        if value <= Decimal('0'):
            raise serializers.ValidationError('Price must be greater than zero.')
        return value

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', None))
        category = attrs.get('category', getattr(self.instance, 'category', None))
        clash = Product.objects.filter(name__iexact=name, category=category)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError({'name': f'A {category.lower()} called "{name}" already exists.'})
        return attrs


class DashboardProductViewSet(DashboardMixin, viewsets.ModelViewSet):
    serializer_class = DashboardProductSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    ORDERING = {'name', '-name', 'price', '-price', 'date_updated', '-date_updated', 'category', '-category'}

    def get_queryset(self):
        qs = Product.objects.all()
        params = self.request.query_params
        if params.get('category') in [c[0] for c in Product.CATEGORY_CHOICES]:
            qs = qs.filter(category=params['category'])
        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by(_ordering(self.request, self.ORDERING, 'name'), 'id')

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        used = product.cartitem_set.filter(cart__saved=True).count()
        if used:
            # Deleting would also delete those order lines and silently change past order totals.
            return Response(
                {'detail': f'"{product.name}" appears in {used} saved order line(s), so it cannot be deleted. '
                           'Edit its name or price instead.'},
                status=status.HTTP_409_CONFLICT)
        return super().destroy(request, *args, **kwargs)


# --------------------------------------------------------------------------- orders

class OrderLineSerializer(serializers.Serializer):
    product = serializers.CharField(source='product.name')
    category = serializers.CharField(source='product.category')
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2)
    total = serializers.SerializerMethodField()

    def get_total(self, obj):
        return obj.get_total_price()


class DashboardOrderSerializer(serializers.ModelSerializer):
    user = ReporterSerializer(read_only=True)
    items = OrderLineSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'created_at', 'items', 'item_count', 'total']

    def get_total(self, obj):
        return obj.get_total_price()

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())


class DashboardOrderViewSet(DashboardMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = DashboardOrderSerializer
    ORDERING = {'created_at', '-created_at'}

    def get_queryset(self):
        qs = Cart.objects.filter(saved=True).select_related('user').prefetch_related('items__product')
        params = self.request.query_params
        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(user__username__icontains=search) | Q(user__email__icontains=search)
                           | Q(items__product__name__icontains=search)).distinct()
        if params.get('days', '').isdigit():
            qs = qs.filter(created_at__gte=timezone.now() - timedelta(days=int(params['days'])))
        return qs.order_by(_ordering(self.request, self.ORDERING, '-created_at'), '-id')


# --------------------------------------------------------------------------- users

class DashboardUserSerializer(serializers.ModelSerializer):
    complaints = serializers.IntegerField(read_only=True)
    orders = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'is_admin', 'complaints', 'orders']
        read_only_fields = ['id', 'username', 'email', 'full_name', 'complaints', 'orders']


class DashboardUserViewSet(DashboardMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                           mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = DashboardUserSerializer
    http_method_names = ['get', 'patch', 'head', 'options']
    ORDERING = {'username', '-username', 'complaints', '-complaints', 'orders', '-orders', 'id', '-id'}

    def get_queryset(self):
        qs = User.objects.annotate(
            complaints=Count('complaint', distinct=True),
            orders=Count('cart', filter=Q(cart__saved=True), distinct=True),
        )
        params = self.request.query_params
        if params.get('role') == 'admin':
            qs = qs.filter(is_admin=True)
        elif params.get('role') == 'user':
            qs = qs.filter(is_admin=False)
        search = params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search) | Q(full_name__icontains=search))
        return qs.order_by(_ordering(self.request, self.ORDERING, 'username'), 'id')

    def partial_update(self, request, *args, **kwargs):
        target = self.get_object()
        if target.pk == request.user.pk:
            # The only way to lose the last admin is an admin demoting themselves, so forbid it.
            return Response({'detail': 'You cannot change your own role.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)
