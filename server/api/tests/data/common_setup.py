from django.core.cache import cache

from api import models
from store.tests.data.factories import (
    CategoryFactory,
    ColorFactory,
    ProductFactory,
    UserFactory,
)


class CommonSetup:
    password = "a-Strong-passw0rd"

    def set_up_users(self):
        self.user_factory = UserFactory()
        self.customer = self.user_factory.create(password=self.password)
        self.other_customer = self.user_factory.create()
        self.customer_without_address = self.user_factory.create(
            address_line="", postal_code=""
        )

    def set_up_catalog(self):
        self.category_factory = CategoryFactory()
        self.product_factory = ProductFactory()
        self.color_factory = ColorFactory()
        self.leggings = self.category_factory.create(name="Leggings", slug="leggings")
        self.skirts = self.category_factory.create(name="Faldas", slug="skirts")
        self.sculpt_leggings = self.product_factory.create(
            category=self.leggings,
            name="Leggings Sculpt",
            color="Negro",
            stock={"M": 2, "XS": 0, "S": 2},
        )
        self.army_green = self.color_factory.create(
            self.sculpt_leggings, name="Army green", stock={"S": 1}
        )
        self.tennis_skirt = self.product_factory.create(
            category=self.skirts, name="Falda tennis", color="Rosa", stock={"S": 3}
        )
        self.color_factory.create(self.tennis_skirt, name="Lila", stock={"S": 0})
        self.small_leggings = models.ProductVariant.objects.get(
            color__name="Negro", size="S"
        )
        self.small_skirt = models.ProductVariant.objects.get(
            color__name="Rosa", size="S"
        )

    def setUp(self):
        # Throttle history lives in the cache and would leak between tests.
        cache.clear()
        self.set_up_users()
        self.set_up_catalog()
