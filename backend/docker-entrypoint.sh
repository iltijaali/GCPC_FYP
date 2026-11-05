#!/bin/sh
set -e

python manage.py migrate --noinput

if [ "$SEED_DEMO_DATA" = "true" ]; then
    echo "Loading demo data (SEED_DEMO_DATA=true)..."
    python manage.py seed_data --no-admin
fi

if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ]; then
    # --noinput reads the DJANGO_SUPERUSER_* variables; it fails harmlessly if the user already exists
    python manage.py createsuperuser --noinput 2>&1 | grep -v "already taken" || true
fi

if [ -n "$APP_ADMIN_USERNAME" ] && [ -n "$APP_ADMIN_EMAIL" ] && [ -n "$APP_ADMIN_PASSWORD" ]; then
    # the dashboard admin (the Django superuser above only opens /admin/ on the API)
    python manage.py create_app_admin
fi

exec "$@"
