from decimal import Decimal
from typing import List

from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce


class CategoryQuerySet(models.QuerySet):
    def with_catalog_counts(self) -> "CategoryQuerySet":
        active = Q(products__is_active=True)
        return self.annotate(
            product_count=Count("products", filter=active, distinct=True),
            units_in_stock=Coalesce(
                Sum("products__colors__variants__stock", filter=active), 0
            ),
        )


class Category(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(unique=True)
    position = models.PositiveSmallIntegerField(default=0)

    objects = CategoryQuerySet.as_manager()

    class Meta:
        ordering = ["position", "name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name


class ProductQuerySet(models.QuerySet):
    def active(self) -> "ProductQuerySet":
        return self.filter(is_active=True)

    def for_catalog(self) -> "ProductQuerySet":
        return (
            self.active()
            .select_related("category")
            .prefetch_related("colors__variants")
        )


class Product(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    features = models.JSONField(
        default=list, blank=True, help_text="Bullet points shown on the product card."
    )
    price = models.DecimalField(
        "price (MXN)",
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    is_active = models.BooleanField("visible in store", default=True)
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ["category__position", "position", "name"]

    def __str__(self) -> str:
        return self.name

    @property
    def units_in_stock(self) -> int:
        return sum(color.units_in_stock for color in self.colors.all())


class ProductColor(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="colors"
    )
    name = models.CharField(max_length=60)
    hex = models.CharField(
        max_length=7,
        validators=[
            RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Use a hex color such as #6B5244.")
        ],
    )
    # Photos ship with the storefront (client/public/products), so a path is enough.
    photo = models.CharField(
        max_length=500,
        blank=True,
        validators=[
            RegexValidator(
                r"^(/|https://)",
                "Use a storefront path such as /products/photo.webp or an https URL.",
            )
        ],
    )
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "name"], name="unique_product_color"
            )
        ]

    def __str__(self) -> str:
        return f"{self.product.name} · {self.name}"

    @property
    def units_in_stock(self) -> int:
        return sum(variant.stock for variant in self.variants.all())

    def sorted_variants(self) -> List["ProductVariant"]:
        return sorted(self.variants.all(), key=lambda variant: variant.size_rank)


class ProductVariant(models.Model):
    class Size(models.TextChoices):
        XS = "XS", "XS"
        S = "S", "S"
        M = "M", "M"
        L = "L", "L"
        XL = "XL", "XL"

    color = models.ForeignKey(
        ProductColor, on_delete=models.CASCADE, related_name="variants"
    )
    size = models.CharField(max_length=3, choices=Size.choices)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["color", "size"], name="unique_color_size")
        ]

    def __str__(self) -> str:
        return f"{self.color} ({self.size})"

    @property
    def product(self) -> Product:
        return self.color.product

    @property
    def size_rank(self) -> int:
        return self.Size.values.index(self.size)
