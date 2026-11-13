from django.contrib import auth
from django.test import TestCase

from store.tests.data.factories import UserFactory


class UserTests(TestCase):
    def setUp(self):
        self.user_factory = UserFactory()

    def test_create_user_lowercases_email(self):
        user = self.user_factory.create(email="Ana@Example.COM")

        assert user.email == "ana@example.com"

    def test_authenticate_ignores_email_case(self):
        self.user_factory.create(email="ana@example.com", password="a-Strong-passw0rd")

        user = auth.authenticate(
            username="ANA@example.com", password="a-Strong-passw0rd"
        )

        assert user is not None
