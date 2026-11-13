from rest_framework import serializers

from api import models

# ---------- Catalog ---------- #


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    units_in_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = models.Category
        fields = ["slug", "name", "product_count", "units_in_stock"]


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ProductVariant
        fields = ["id", "size", "stock"]


class ProductColorSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(
        source="sorted_variants", many=True, read_only=True
    )

    class Meta:
        model = models.ProductColor
        fields = ["name", "hex", "photo", "units_in_stock", "variants"]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    colors = ProductColorSerializer(many=True, read_only=True)

    class Meta:
        model = models.Product
        fields = [
            "slug",
            "name",
            "category",
            "category_name",
            "price",
            "features",
            "units_in_stock",
            "colors",
        ]
