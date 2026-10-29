from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = "Create an admin user for the store team (usable from the Lambda handler)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        if User.objects.email_is_taken(options["email"]):
            raise CommandError(f"A user with email {options['email']} already exists.")
        User.objects.create_superuser(options["email"], options["password"])
        self.stdout.write(self.style.SUCCESS(f"Created admin {options['email']}."))
