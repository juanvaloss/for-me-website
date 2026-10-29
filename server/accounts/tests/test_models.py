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

    def test_has_shipping_details_requires_every_shipping_field(self):
        assert self.user_factory.create().has_shipping_details is True
        assert self.user_factory.create(postal_code="").has_shipping_details is False

    def test_shipping_address_joins_the_filled_parts(self):
        user = self.user_factory.create(neighborhood="")

        assert (
            user.shipping_address == "Av. Chapultepec 123, 44160 Guadalajara, Jalisco"
        )
