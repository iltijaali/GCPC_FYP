import os

from django.core.management.base import BaseCommand, CommandError

from api.models import User


class Command(BaseCommand):
    help = (
        'Create an admin for the dashboard, or promote an existing user. '
        'Values default to APP_ADMIN_USERNAME / APP_ADMIN_EMAIL / APP_ADMIN_PASSWORD / APP_ADMIN_NAME.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--username', default=os.environ.get('APP_ADMIN_USERNAME'))
        parser.add_argument('--email', default=os.environ.get('APP_ADMIN_EMAIL'))
        parser.add_argument('--password', default=os.environ.get('APP_ADMIN_PASSWORD'),
                            help='Prefer the APP_ADMIN_PASSWORD variable: arguments show up in process lists.')
        parser.add_argument('--full-name', default=os.environ.get('APP_ADMIN_NAME', 'Administrator'))

    def handle(self, *args, **opts):
        username, email, password = opts['username'], opts['email'], opts['password']
        if not (username and email and password):
            raise CommandError('username, email and password are all required.')

        user = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()
        created = user is None
        if created:
            user = User(username=username, email=email, full_name=opts['full_name'])
        user.is_admin = True
        user.set_password(password)  # always (re)set, so the environment stays the source of truth
        user.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} dashboard admin '{user.username}'."))
