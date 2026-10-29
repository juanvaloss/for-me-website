from decimal import Decimal
from itertools import count
from typing import Dict

from django.utils.text import slugify

from accounts.models import User
from store.models import Category, Product, ProductColor, ProductVariant

_sequence = count(1)


class UserFactory:
    def create(self, **kwargs) -> User:
        number = next(_sequence)
        defaults = {
            "email": f"customer{number}@example.com",
            "password": "a-Strong-passw0rd",
            "first_name": "Ana",
            "last_name": "García",
            "phone": "3312345678",
            "address_line": "Av. Chapultepec 123",
            "neighborhood": "Americana",
            "city": "Guadalajara",
            "state": "Jalisco",
            "postal_code": "44160",
        }
        defaults.update(kwargs)
        return User.objects.create_user(**defaults)


class CategoryFactory:
    def create(self, **kwargs) -> Category:
        number = next(_sequence)
        defaults = {"name": f"Category {number}", "slug": f"category-{number}"}
        defaults.update(kwargs)
        return Category.objects.create(**defaults)


class ColorFactory:
    def create(
        self, product: Product, stock: Dict[str, int] = None, **kwargs
    ) -> ProductColor:
        defaults = {"name": "Black", "hex": "#1F1D1C"}
        defaults.update(kwargs)
        defaults.setdefault(
            "photo", f"/products/{product.slug}-{slugify(defaults['name'])}.webp"
        )
        color = ProductColor.objects.create(product=product, **defaults)
        for size, units in (stock or {"S": 2, "M": 1}).items():
            ProductVariant.objects.create(color=color, size=size, stock=units)
        return color


class ProductFactory:
    def create(
        self, stock: Dict[str, int] = None, color: str = "Black", **kwargs
    ) -> Product:
        number = next(_sequence)
        defaults = {
            "name": f"Leggings {number}",
            "price": Decimal("890.00"),
            "features": ["Cintura alta"],
        }
        defaults.update(kwargs)
        defaults.setdefault("slug", slugify(defaults["name"]))
        if "category" not in defaults:
            defaults["category"] = CategoryFactory().create()
        product = Product.objects.create(**defaults)
        ColorFactory().create(product, stock=stock, name=color)
        return product
