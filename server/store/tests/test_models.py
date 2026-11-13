from django.test import TestCase

from store.models import Category
from store.tests.data.factories import CategoryFactory, ColorFactory, ProductFactory


class ProductColorTests(TestCase):
    def test_sorted_variants_follow_size_order(self):
        product = ProductFactory().create(stock={"L": 1, "XS": 0, "M": 3})
        color = product.colors.get()

        assert [variant.size for variant in color.sorted_variants()] == [
            "XS",
            "M",
            "L",
        ]

    def test_units_in_stock_sums_every_size(self):
        product = ProductFactory().create(stock={"XS": 1, "S": 3, "M": 1})

        assert product.colors.get().units_in_stock == 5


class ProductTests(TestCase):
    def test_units_in_stock_sums_every_color(self):
        product = ProductFactory().create(stock={"S": 2})
        ColorFactory().create(product, name="Sage", stock={"S": 1, "M": 3})

        assert product.units_in_stock == 6


class CategoryTests(TestCase):
    def test_catalog_counts_ignore_hidden_products(self):
        category = CategoryFactory().create()
        product = ProductFactory().create(category=category, stock={"S": 2, "M": 1})
        ColorFactory().create(product, name="Sage", stock={"S": 2})
        ProductFactory().create(category=category, stock={"S": 4}, is_active=False)

        annotated = Category.objects.with_catalog_counts().get(pk=category.pk)

        assert annotated.product_count == 1
        assert annotated.units_in_stock == 5
