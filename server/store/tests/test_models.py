from decimal import Decimal

import pytest
from django.test import TestCase

from store.exceptions import OrderNotCancellableError, OutOfStockError
from store.models import Category, Order, ProductVariant
from store.tests.data.factories import (
    CategoryFactory,
    ColorFactory,
    ProductFactory,
    UserFactory,
)


class ProductVariantTests(TestCase):
    def setUp(self):
        self.product = ProductFactory().create(stock={"S": 2})
        self.variant = ProductVariant.objects.get(color__product=self.product)

    def test_reserve_decrements_stock(self):
        self.variant.reserve(2)

        assert self.variant.stock == 0

    def test_reserve_more_than_available_raises_out_of_stock(self):
        with pytest.raises(OutOfStockError) as exc_info:
            self.variant.reserve(3)

        assert exc_info.value.meta["available"] == 2
        assert exc_info.value.meta["color_name"] == "Black"
        self.variant.refresh_from_db()
        assert self.variant.stock == 2

    def test_release_restores_stock(self):
        self.variant.release(3)

        assert self.variant.stock == 5


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


class OrderTests(TestCase):
    def setUp(self):
        self.customer = UserFactory().create()
        self.product = ProductFactory().create(
            name="Leggings Sculpt",
            stock={"S": 3, "M": 1},
            color="Army green",
            price=Decimal("500.00"),
        )
        self.small = ProductVariant.objects.get(color__product=self.product, size="S")
        self.medium = ProductVariant.objects.get(color__product=self.product, size="M")

    def test_place_reserves_stock_and_snapshots_customer_details(self):
        order = Order.place(
            self.customer, [(self.small, 2), (self.medium, 1)], notes="After 5pm"
        )

        assert order.reference.startswith("FM-")
        assert order.total == Decimal("1500.00")
        assert order.item_count == 3
        assert order.contact_phone == self.customer.phone
        assert order.shipping_address == self.customer.shipping_address
        self.small.refresh_from_db()
        self.medium.refresh_from_db()
        assert (self.small.stock, self.medium.stock) == (1, 0)

    def test_place_snapshots_product_and_color_names(self):
        order = Order.place(self.customer, [(self.small, 1)])

        item = order.items.get()
        assert (item.product_name, item.color_name, item.size) == (
            "Leggings Sculpt",
            "Army green",
            "S",
        )

    def test_place_merges_repeated_variants(self):
        order = Order.place(self.customer, [(self.small, 1), (self.small, 2)])

        assert order.items.get().quantity == 3

    def test_place_rolls_back_everything_when_one_item_is_out_of_stock(self):
        with pytest.raises(OutOfStockError):
            Order.place(self.customer, [(self.small, 1), (self.medium, 2)])

        self.small.refresh_from_db()
        assert self.small.stock == 3
        assert not Order.objects.exists()

    def test_cancel_restores_stock(self):
        order = Order.place(self.customer, [(self.small, 2)])

        order.cancel()

        assert order.status == Order.Status.CANCELLED
        self.small.refresh_from_db()
        assert self.small.stock == 3

    def test_cancel_shipped_order_raises(self):
        order = Order.place(self.customer, [(self.small, 1)])
        Order.objects.filter(pk=order.pk).advance_to(Order.Status.SHIPPED)
        order.refresh_from_db()

        with pytest.raises(OrderNotCancellableError):
            order.cancel()

    def test_advance_to_skips_cancelled_orders(self):
        order = Order.place(self.customer, [(self.small, 1)])
        order.cancel()

        updated = Order.objects.all().advance_to(Order.Status.SHIPPED)

        assert updated == 0
        order.refresh_from_db()
        assert order.status == Order.Status.CANCELLED
