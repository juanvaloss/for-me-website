import uuid
from collections import Counter
from decimal import Decimal
from typing import Iterable, List, Tuple

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models, transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.crypto import get_random_string

from store import exceptions

MAX_UNITS_PER_ITEM = 10


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

    def reserve(self, quantity: int) -> None:
        # The conditional UPDATE is atomic, so two shoppers can never both take
        # the last piece.
        reserved = ProductVariant.objects.filter(
            pk=self.pk, stock__gte=quantity
        ).update(stock=F("stock") - quantity)
        self.refresh_from_db(fields=["stock"])
        if not reserved:
            raise exceptions.OutOfStockError(self, quantity)

    def release(self, quantity: int) -> None:
        ProductVariant.objects.filter(pk=self.pk).update(stock=F("stock") + quantity)
        self.refresh_from_db(fields=["stock"])


class OrderQuerySet(models.QuerySet):
    def advance_to(self, status: str) -> int:
        # Cancelled orders already returned their stock, so they stay cancelled.
        return self.exclude(status=Order.Status.CANCELLED).update(
            status=status, updated_at=timezone.now()
        )


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    CANCELLABLE_STATUSES = [Status.PENDING, Status.CONFIRMED]
    REFERENCE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=12, unique=True, editable=False)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders"
    )
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.PENDING
    )
    total = models.DecimalField(
        "total (MXN)", max_digits=10, decimal_places=2, default=Decimal("0")
    )
    contact_name = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=20)
    shipping_address = models.TextField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = OrderQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.reference

    @classmethod
    def place(
        cls,
        customer,
        items: Iterable[Tuple[ProductVariant, int]],
        notes: str = "",
    ) -> "Order":
        variants = {}
        quantities = Counter()
        for variant, quantity in items:
            variants[variant.pk] = variant
            quantities[variant.pk] += quantity

        with transaction.atomic():
            order = cls.objects.create(
                reference=cls._generate_reference(),
                customer=customer,
                contact_name=customer.full_name,
                contact_phone=customer.phone,
                shipping_address=customer.shipping_address,
                notes=notes,
            )
            for variant_id, quantity in quantities.items():
                order._add_item(variants[variant_id], quantity)
            order.total = sum(item.subtotal for item in order.items.all())
            order.save(update_fields=["total"])
        return order

    @classmethod
    def _generate_reference(cls) -> str:
        while True:
            reference = f"FM-{get_random_string(6, cls.REFERENCE_CHARS)}"
            if not cls.objects.filter(reference=reference).exists():
                return reference

    def _add_item(self, variant: ProductVariant, quantity: int) -> "OrderItem":
        variant.reserve(quantity)
        return self.items.create(
            variant=variant,
            product_name=variant.product.name,
            color_name=variant.color.name,
            size=variant.size,
            unit_price=variant.product.price,
            quantity=quantity,
        )

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in self.CANCELLABLE_STATUSES

    @property
    def item_count(self) -> int:
        return sum(item.quantity for item in self.items.all())

    def cancel(self) -> None:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=self.pk)
            if not order.can_be_cancelled:
                raise exceptions.OrderNotCancellableError(order)
            for item in order.items.select_related("variant"):
                item.variant.release(item.quantity)
            order.status = self.Status.CANCELLED
            order.save(update_fields=["status", "updated_at"])
        self.status = order.status


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.PROTECT, related_name="order_items"
    )
    product_name = models.CharField(max_length=200)
    color_name = models.CharField(max_length=60)
    size = models.CharField(max_length=3)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product_name} {self.color_name} ({self.size})"

    @property
    def subtotal(self) -> Decimal:
        return self.unit_price * self.quantity
