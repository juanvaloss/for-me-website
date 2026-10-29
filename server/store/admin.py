from django.contrib import admin, messages
from django.db.models import QuerySet
from django.http import HttpRequest

from store import exceptions
from store.models import (
    Category,
    Order,
    OrderItem,
    Product,
    ProductColor,
    ProductVariant,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "position"]
    list_editable = ["position"]
    prepopulated_fields = {"slug": ["name"]}


class ProductColorInline(admin.TabularInline):
    model = ProductColor
    extra = 0
    fields = ["name", "hex", "photo", "position", "units_in_stock"]
    readonly_fields = ["units_in_stock"]
    show_change_link = True


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "price",
        "color_count",
        "units_in_stock",
        "is_active",
    ]
    list_editable = ["price", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "category__name"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [ProductColorInline]

    def get_queryset(self, request: HttpRequest) -> QuerySet:
        return (
            super()
            .get_queryset(request)
            .select_related("category")
            .prefetch_related("colors__variants")
        )

    @admin.display(description="colors")
    def color_count(self, obj: Product) -> int:
        return len(obj.colors.all())


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


@admin.register(ProductColor)
class ProductColorAdmin(admin.ModelAdmin):
    list_display = ["__str__", "units_in_stock"]
    list_filter = ["product__category"]
    search_fields = ["name", "product__name"]
    inlines = [ProductVariantInline]

    def get_queryset(self, request: HttpRequest) -> QuerySet:
        return (
            super()
            .get_queryset(request)
            .select_related("product")
            .prefetch_related("variants")
        )


@admin.register(ProductVariant)
class StockAdmin(admin.ModelAdmin):
    """Every product, color and size in one editable table, like the stock sheet."""

    list_display = ["product_name", "color_name", "size", "stock"]
    list_editable = ["stock"]
    list_filter = ["color__product__category", "color__product", "size"]
    search_fields = ["color__name", "color__product__name"]
    ordering = [
        "color__product__category__position",
        "color__product__position",
        "color__position",
        "id",
    ]
    list_per_page = 100

    def get_queryset(self, request: HttpRequest) -> QuerySet:
        return super().get_queryset(request).select_related("color__product")

    @admin.display(description="product", ordering="color__product__name")
    def product_name(self, obj: ProductVariant) -> str:
        return obj.product.name

    @admin.display(description="color", ordering="color__name")
    def color_name(self, obj: ProductVariant) -> str:
        return obj.color.name


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    fields = ["product_name", "color_name", "size", "unit_price", "quantity"]
    readonly_fields = fields

    def has_add_permission(self, request: HttpRequest, obj=None) -> bool:
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["reference", "contact_name", "status", "total", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["reference", "contact_name", "contact_phone", "customer__email"]
    fields = [
        "reference",
        "customer",
        "status",
        "total",
        "contact_name",
        "contact_phone",
        "shipping_address",
        "notes",
        "created_at",
        "updated_at",
    ]
    # Status only changes through the actions below, so stock always stays in sync.
    readonly_fields = [
        "reference",
        "customer",
        "status",
        "total",
        "created_at",
        "updated_at",
    ]
    inlines = [OrderItemInline]
    actions = ["mark_confirmed", "mark_shipped", "mark_delivered", "cancel_orders"]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj=None) -> bool:
        return False

    @admin.action(description="Mark selected orders as confirmed")
    def mark_confirmed(self, request: HttpRequest, queryset: QuerySet) -> None:
        self._advance(request, queryset, Order.Status.CONFIRMED)

    @admin.action(description="Mark selected orders as shipped")
    def mark_shipped(self, request: HttpRequest, queryset: QuerySet) -> None:
        self._advance(request, queryset, Order.Status.SHIPPED)

    @admin.action(description="Mark selected orders as delivered")
    def mark_delivered(self, request: HttpRequest, queryset: QuerySet) -> None:
        self._advance(request, queryset, Order.Status.DELIVERED)

    @admin.action(description="Cancel selected orders and restock")
    def cancel_orders(self, request: HttpRequest, queryset: QuerySet) -> None:
        cancelled = 0
        for order in queryset:
            try:
                order.cancel()
                cancelled += 1
            except exceptions.OrderNotCancellableError as exc:
                self.message_user(request, str(exc), messages.WARNING)
        self.message_user(request, f"{cancelled} order(s) cancelled and restocked.")

    def _advance(self, request: HttpRequest, queryset: QuerySet, status: str) -> None:
        updated = queryset.advance_to(status)
        label = Order.Status(status).label.lower()
        self.message_user(request, f"{updated} order(s) marked as {label}.")
