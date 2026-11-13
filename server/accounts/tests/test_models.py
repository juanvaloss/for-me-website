import pytest
from django.contrib import auth
from django.test import TestCase

from accounts import exceptions
from accounts.google import GoogleIdentity
from accounts.models import User
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


class GoogleSignInTests(TestCase):
    password = "a-Strong-passw0rd"

    def setUp(self):
        self.user_factory = UserFactory()

    def _identity(self, **kwargs) -> GoogleIdentity:
        defaults = {
            "sub": "110169484474386276334",
            "email": "ana@gmail.com",
            "first_name": "Ana",
            "last_name": "García",
            "is_email_authoritative": True,
        }
        defaults.update(kwargs)
        return GoogleIdentity(**defaults)

    def test_first_google_sign_in_creates_customer_without_password(self):
        user = User.objects.get_or_create_for_google(self._identity())

        assert user.email == "ana@gmail.com"
        assert user.first_name == "Ana"
        assert user.google_sub == "110169484474386276334"
        assert user.has_usable_password() is False
        assert user.is_staff is False

    def test_next_google_sign_in_finds_customer_by_sub_even_if_email_changed(self):
        user = User.objects.get_or_create_for_google(self._identity())

        again = User.objects.get_or_create_for_google(
            self._identity(email="ana.nueva@gmail.com")
        )

        assert again == user
        assert User.objects.count() == 1

    def test_gmail_sign_in_links_existing_account_and_drops_its_password(self):
        customer = self.user_factory.create(
            email="ana@gmail.com", password=self.password
        )

        user = User.objects.get_or_create_for_google(self._identity())

        assert user == customer
        assert user.google_sub == "110169484474386276334"
        customer.refresh_from_db()
        assert customer.has_usable_password() is False
        assert (
            auth.authenticate(username="ana@gmail.com", password=self.password) is None
        )

    def test_non_gmail_sign_in_does_not_take_over_existing_account(self):
        self.user_factory.create(email="ana@hotmail.com", password=self.password)

        with pytest.raises(exceptions.GoogleAccountConflictError):
            User.objects.get_or_create_for_google(
                self._identity(email="ana@hotmail.com", is_email_authoritative=False)
            )

    def test_account_linked_to_another_google_account_is_not_relinked(self):
        User.objects.get_or_create_for_google(self._identity(sub="first-google-id"))

        with pytest.raises(exceptions.GoogleAccountConflictError):
            User.objects.get_or_create_for_google(self._identity(sub="other-google-id"))

    def test_google_sign_in_never_opens_staff_accounts(self):
        self.user_factory.create(email="ana@gmail.com", is_staff=True)

        with pytest.raises(exceptions.GoogleAccountConflictError):
            User.objects.get_or_create_for_google(self._identity())

    def test_disabled_account_cannot_sign_in_with_google(self):
        self.user_factory.create(email="ana@gmail.com", is_active=False)

        with pytest.raises(exceptions.AccountDisabledError):
            User.objects.get_or_create_for_google(self._identity())
