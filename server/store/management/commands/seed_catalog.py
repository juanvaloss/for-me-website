import json
from decimal import Decimal
from pathlib import Path
from typing import Dict, List

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from store.models import Category, Product, ProductColor, ProductVariant

CATALOG_PATH = Path(__file__).resolve().parents[2] / "data" / "catalog.json"


class Command(BaseCommand):
    help = (
        "Create or update categories, products, colors and stock from "
        "store/data/catalog.json. Overwrites the stock of every size it lists."
    )

    def add_arguments(self, parser):
        parser.add_argument("--path", default=str(CATALOG_PATH))

    @transaction.atomic
    def handle(self, *args, **options):
        catalog = json.loads(Path(options["path"]).read_text(encoding="utf-8"))
        product_count = 0
        color_count = 0
        unit_count = 0
        for category_position, category_data in enumerate(catalog["categories"]):
            category, _ = Category.objects.update_or_create(
                slug=category_data["slug"],
                defaults={
                    "name": category_data["name"],
                    "position": category_position,
                },
            )
            for position, product_data in enumerate(category_data["products"]):
                product = self._upsert_product(category, product_data, position)
                for color_position, color_data in enumerate(product_data["colors"]):
                    color = self._upsert_color(product, color_data, color_position)
                    unit_count += self._sync_stock(
                        color, product_data["sizes"], color_data.get("stock", {})
                    )
                    color_count += 1
                product_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {len(catalog['categories'])} categories, "
                f"{product_count} products, {color_count} colors and {unit_count} "
                f"units (stock counted at {catalog['stock_counted_at']})."
            )
        )

    def _upsert_product(
        self, category: Category, product_data: Dict, position: int
    ) -> Product:
        product, _ = Product.objects.update_or_create(
            slug=slugify(product_data["name"]),
            defaults={
                "category": category,
                "name": product_data["name"],
                "price": Decimal(product_data["price"]),
                "features": product_data["features"],
                "position": position,
            },
        )
        return product

    def _upsert_color(
        self, product: Product, color_data: Dict, position: int
    ) -> ProductColor:
        color, _ = ProductColor.objects.update_or_create(
            product=product,
            name=color_data["name"],
            defaults={
                "hex": color_data["hex"],
                "photo": color_data["photo"],
                "position": position,
            },
        )
        return color

    def _sync_stock(
        self, color: ProductColor, sizes: List[str], stock: Dict[str, int]
    ) -> int:
        for size in sizes:
            ProductVariant.objects.update_or_create(
                color=color, size=size, defaults={"stock": stock.get(size, 0)}
            )
        return sum(stock.values())
