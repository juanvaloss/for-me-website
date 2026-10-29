from rest_framework.test import APIClient, APITestCase

from api import models
from api.tests.data.common_setup import CommonSetup

REGISTER_URL = "/api/v1/auth/register/"
LOGIN_URL = "/api/v1/auth/login/"
LOGOUT_URL = "/api/v1/auth/logout/"
SESSION_URL = "/api/v1/auth/session/"
ME_URL = "/api/v1/me/"
CATEGORIES_URL = "/api/v1/categories/"
PRODUCTS_URL = "/api/v1/products/"
ORDERS_URL = "/api/v1/orders/"


class HealthViewTests(CommonSetup, APITestCase):
    def test_health_is_public(self):
        response = self.client.get("/api/health/")

        assert response.status_code == 200
        assert response.data == {"status": "ok"}


class AuthViewSetTests(CommonSetup, APITestCase):
    def _register_payload(self, **kwargs):
        payload = {
            "email": "New.Customer@Example.com",
            "password": self.password,
            "first_name": "Ana",
        }
        payload.update(kwargs)
        return payload

    def test_register_creates_customer_and_starts_session(self):
        response = self.client.post(
            REGISTER_URL, self._register_payload(), format="json"
        )

        assert response.status_code == 201
        assert response.data["email"] == "new.customer@example.com"
        assert response.data["has_shipping_details"] is False
        assert self.client.get(ME_URL).status_code == 200

    def test_register_with_taken_email_returns_email_taken_code(self):
        response = self.client.post(
            REGISTER_URL,
            self._register_payload(email=self.customer.email.upper()),
            format="json",
        )

        assert response.status_code == 400
        assert response.data["fields"]["email"][0]["code"] == "email_taken"

    def test_register_with_weak_password_returns_validator_codes(self):
        response = self.client.post(
            REGISTER_URL, self._register_payload(password="12345678"), format="json"
        )

        assert response.status_code == 400
        codes = {error["code"] for error in response.data["fields"]["password"]}
        assert "password_entirely_numeric" in codes

    def test_login_starts_session_ignoring_email_case(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": self.customer.email.upper(), "password": self.password},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["id"] == str(self.customer.id)
        assert self.client.get(ME_URL).status_code == 200

    def test_login_with_wrong_password_returns_invalid_credentials(self):
        response = self.client.post(
            LOGIN_URL,
            {"email": self.customer.email, "password": "wrong-password"},
            format="json",
        )

        assert response.status_code == 400
        error = response.data["fields"]["non_field_errors"][0]
        assert error["code"] == "invalid_credentials"

    def test_login_without_csrf_token_is_rejected(self):
        client = APIClient(enforce_csrf_checks=True)

        response = client.post(
            LOGIN_URL,
            {"email": self.customer.email, "password": self.password},
            format="json",
        )

        assert response.status_code == 403
        assert response.data["code"] == "permission_denied"

    def test_login_with_csrf_token_from_session_endpoint_succeeds(self):
        client = APIClient(enforce_csrf_checks=True)
        client.get(SESSION_URL)

        response = client.post(
            LOGIN_URL,
            {"email": self.customer.email, "password": self.password},
            format="json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )

        assert response.status_code == 200

    def test_login_is_throttled_after_too_many_attempts(self):
        payload = {"email": self.customer.email, "password": "wrong-password"}
        for _ in range(10):
            self.client.post(LOGIN_URL, payload, format="json")

        response = self.client.post(LOGIN_URL, payload, format="json")

        assert response.status_code == 429
        assert response.data["code"] == "throttled"

    def test_session_for_anonymous_visitor_returns_no_user_and_csrf_cookie(self):
        response = self.client.get(SESSION_URL)

        assert response.status_code == 200
        assert response.data == {"user": None}
        assert "csrftoken" in response.cookies

    def test_session_for_logged_in_customer_returns_profile(self):
        self.client.login(email=self.customer.email, password=self.password)

        response = self.client.get(SESSION_URL)

        assert response.data["user"]["email"] == self.customer.email

    def test_logout_ends_session(self):
        self.client.login(email=self.customer.email, password=self.password)

        response = self.client.post(LOGOUT_URL)

        assert response.status_code == 204
        assert self.client.get(ME_URL).status_code == 403


class ProfileViewTests(CommonSetup, APITestCase):
    def test_profile_requires_authentication(self):
        response = self.client.get(ME_URL)

        assert response.status_code == 403
        assert response.data["code"] == "not_authenticated"

    def test_update_profile_keeps_only_phone_digits(self):
        self.client.force_authenticate(self.customer)

        response = self.client.patch(
            ME_URL, {"phone": "+52 (33) 1111-2222", "city": "Zapopan"}, format="json"
        )

        assert response.status_code == 200
        self.customer.refresh_from_db()
        assert self.customer.phone == "523311112222"
        assert self.customer.city == "Zapopan"

    def test_update_profile_rejects_invalid_postal_code(self):
        self.client.force_authenticate(self.customer)

        response = self.client.patch(ME_URL, {"postal_code": "4416"}, format="json")

        assert response.status_code == 400
        error = response.data["fields"]["postal_code"][0]
        assert error["code"] == "invalid_postal_code"

    def test_email_cannot_be_changed_from_profile(self):
        self.client.force_authenticate(self.customer)

        self.client.patch(ME_URL, {"email": "other@example.com"}, format="json")

        self.customer.refresh_from_db()
        assert self.customer.email != "other@example.com"


class CatalogViewTests(CommonSetup, APITestCase):
    def test_list_products_nests_colors_with_stock_per_size(self):
        response = self.client.get(PRODUCTS_URL)

        assert response.status_code == 200
        leggings = next(p for p in response.data if p["slug"] == "leggings-sculpt")
        assert leggings["units_in_stock"] == 5
        assert leggings["features"] == ["Cintura alta"]
        negro, army_green = leggings["colors"]
        assert negro["name"] == "Negro"
        assert negro["photo"] == "/products/leggings-sculpt-negro.webp"
        assert [v["size"] for v in negro["variants"]] == ["XS", "S", "M"]
        assert [v["stock"] for v in negro["variants"]] == [0, 2, 2]
        assert army_green["units_in_stock"] == 1

    def test_filter_products_by_category(self):
        response = self.client.get(PRODUCTS_URL, {"category": "skirts"})

        assert [product["name"] for product in response.data] == ["Falda tennis"]

    def test_hidden_products_are_not_listed(self):
        self.tennis_skirt.is_active = False
        self.tennis_skirt.save()

        response = self.client.get(PRODUCTS_URL)

        assert "Falda tennis" not in [product["name"] for product in response.data]

    def test_retrieve_product_by_slug(self):
        response = self.client.get(f"{PRODUCTS_URL}{self.tennis_skirt.slug}/")

        assert response.status_code == 200
        assert [color["name"] for color in response.data["colors"]] == [
            "Rosa",
            "Lila",
        ]

    def test_list_categories_includes_catalog_counts(self):
        response = self.client.get(CATEGORIES_URL)

        assert response.status_code == 200
        leggings = next(c for c in response.data if c["slug"] == "leggings")
        assert leggings["product_count"] == 1
        assert leggings["units_in_stock"] == 5


class OrderViewSetTests(CommonSetup, APITestCase):
    def _order_payload(self, *lines, notes=""):
        return {
            "items": [
                {"variant_id": variant.id, "quantity": quantity}
                for variant, quantity in lines
            ],
            "notes": notes,
        }

    def test_create_order_reserves_stock(self):
        self.client.force_authenticate(self.customer)

        response = self.client.post(
            ORDERS_URL,
            self._order_payload((self.small_leggings, 2), (self.small_skirt, 1)),
            format="json",
        )

        assert response.status_code == 201
        assert response.data["status"] == models.Order.Status.PENDING
        assert response.data["total"] == "2670.00"
        assert {item["color_name"] for item in response.data["items"]} == {
            "Negro",
            "Rosa",
        }
        self.small_leggings.refresh_from_db()
        assert self.small_leggings.stock == 0

    def test_create_order_requires_authentication(self):
        response = self.client.post(
            ORDERS_URL, self._order_payload((self.small_leggings, 1)), format="json"
        )

        assert response.status_code == 403

    def test_create_order_without_shipping_details_returns_code(self):
        self.client.force_authenticate(self.customer_without_address)

        response = self.client.post(
            ORDERS_URL, self._order_payload((self.small_leggings, 1)), format="json"
        )

        assert response.status_code == 400
        error = response.data["fields"]["non_field_errors"][0]
        assert error["code"] == "incomplete_shipping_details"

    def test_create_order_beyond_stock_returns_conflict(self):
        self.client.force_authenticate(self.customer)

        response = self.client.post(
            ORDERS_URL, self._order_payload((self.small_leggings, 3)), format="json"
        )

        assert response.status_code == 409
        assert response.data["code"] == "out_of_stock"
        assert response.data["meta"]["available"] == 2
        assert response.data["meta"]["color_name"] == "Negro"
        assert not models.Order.objects.exists()

    def test_create_order_with_unknown_variant_returns_code(self):
        self.client.force_authenticate(self.customer)

        response = self.client.post(
            ORDERS_URL,
            {"items": [{"variant_id": 999999, "quantity": 1}]},
            format="json",
        )

        assert response.status_code == 400
        assert response.data["fields"]["items"][0]["code"] == "variant_unavailable"

    def test_create_order_for_hidden_product_returns_variant_unavailable(self):
        self.tennis_skirt.is_active = False
        self.tennis_skirt.save()
        self.client.force_authenticate(self.customer)

        response = self.client.post(
            ORDERS_URL, self._order_payload((self.small_skirt, 1)), format="json"
        )

        assert response.status_code == 400
        assert response.data["fields"]["items"][0]["code"] == "variant_unavailable"

    def test_list_orders_only_returns_own_orders(self):
        own = models.Order.place(self.customer, [(self.small_leggings, 1)])
        models.Order.place(self.other_customer, [(self.small_skirt, 1)])
        self.client.force_authenticate(self.customer)

        response = self.client.get(ORDERS_URL)

        assert [order["reference"] for order in response.data] == [own.reference]

    def test_retrieve_other_customers_order_returns_not_found(self):
        order = models.Order.place(self.other_customer, [(self.small_skirt, 1)])
        self.client.force_authenticate(self.customer)

        response = self.client.get(f"{ORDERS_URL}{order.id}/")

        assert response.status_code == 404

    def test_cancel_order_restores_stock(self):
        order = models.Order.place(self.customer, [(self.small_leggings, 2)])
        self.client.force_authenticate(self.customer)

        response = self.client.post(f"{ORDERS_URL}{order.id}/cancel/")

        assert response.status_code == 200
        assert response.data["status"] == models.Order.Status.CANCELLED
        assert response.data["can_be_cancelled"] is False
        self.small_leggings.refresh_from_db()
        assert self.small_leggings.stock == 2

    def test_cancel_delivered_order_returns_conflict(self):
        order = models.Order.place(self.customer, [(self.small_leggings, 1)])
        models.Order.objects.filter(pk=order.pk).advance_to(
            models.Order.Status.DELIVERED
        )
        self.client.force_authenticate(self.customer)

        response = self.client.post(f"{ORDERS_URL}{order.id}/cancel/")

        assert response.status_code == 409
        assert response.data["code"] == "order_not_cancellable"
