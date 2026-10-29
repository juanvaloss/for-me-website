from io import StringIO

from django.core.management import call_command
from django.db.models import Sum
from django.test import TestCase

from store.models import Category, Product, ProductColor, ProductVariant


class SeedCatalogTests(TestCase):
    def _seed(self) -> str:
        output = StringIO()
        call_command("seed_catalog", stdout=output)
        return output.getvalue()

    def test_seed_loads_drop_01_and_the_stock_count(self):
        output = self._seed()

        assert "7 categories, 18 products, 138 colors and 59 units" in output
        assert ProductVariant.objects.aggregate(total=Sum("stock"))["total"] == 59
        night_sea = ProductColor.objects.get(
            product__slug="leggings-sculpt", name="Night sea"
        )
        assert {v.size: v.stock for v in night_sea.variants.all()} == {
            "XS": 1,
            "S": 3,
            "M": 1,
            "L": 0,
            "XL": 0,
        }

    def test_seed_twice_updates_instead_of_duplicating(self):
        self._seed()
        ProductVariant.objects.update(stock=7)

        self._seed()

        assert Category.objects.count() == 7
        assert Product.objects.count() == 18
        assert ProductColor.objects.count() == 138
        assert ProductVariant.objects.aggregate(total=Sum("stock"))["total"] == 59

    def test_every_color_has_a_photo_except_racerback_pink(self):
        self._seed()

        without_photo = ProductColor.objects.filter(photo="")

        assert [str(color) for color in without_photo] == ["Top racerback · Pink"]
