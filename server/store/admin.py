from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from store.models import Category, Product, ProductColor, ProductVariant


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
