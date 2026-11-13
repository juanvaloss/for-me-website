from rest_framework.test import APITestCase

from api.tests.data.common_setup import CommonSetup

CATEGORIES_URL = "/api/v1/categories/"
PRODUCTS_URL = "/api/v1/products/"


class HealthViewTests(CommonSetup, APITestCase):
    def test_health_is_public(self):
        response = self.client.get("/api/health/")

        assert response.status_code == 200
        assert response.data == {"status": "ok"}


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

    def test_catalog_is_read_only(self):
        response = self.client.post(PRODUCTS_URL, {"name": "Nuevo"}, format="json")

        assert response.status_code == 405

    def test_shopper_accounts_and_orders_are_gone(self):
        for url in ["/api/v1/auth/login/", "/api/v1/orders/", "/api/v1/me/"]:
            assert self.client.post(url, {}, format="json").status_code == 404
