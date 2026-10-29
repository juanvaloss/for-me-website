import re
from typing import Dict, List, Tuple

from django.contrib import auth
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.fields import get_error_detail

from api import models
from store.models import MAX_UNITS_PER_ITEM

PHONE_PATTERN = re.compile(r"^\d{10,15}$")
POSTAL_CODE_PATTERN = re.compile(r"^\d{5}$")


# ---------- Accounts ---------- #


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "address_line",
            "neighborhood",
            "city",
            "state",
            "postal_code",
            "has_shipping_details",
        ]
        read_only_fields = ["id", "email", "has_shipping_details"]

    def validate_phone(self, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits and not PHONE_PATTERN.match(digits):
            raise serializers.ValidationError(
                "Enter a valid phone number.", code="invalid_phone"
            )
        return digits

    def validate_postal_code(self, value: str) -> str:
        value = value.strip()
        if value and not POSTAL_CODE_PATTERN.match(value):
            raise serializers.ValidationError(
                "Enter a 5-digit postal code.", code="invalid_postal_code"
            )
        return value


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        write_only=True, max_length=128, trim_whitespace=False
    )
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value: str) -> str:
        if models.User.objects.email_is_taken(value):
            raise serializers.ValidationError(
                "An account with this email already exists.", code="email_taken"
            )
        return value.lower()

    def validate(self, attrs: Dict) -> Dict:
        candidate = models.User(
            email=attrs["email"],
            first_name=attrs["first_name"],
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": get_error_detail(exc)})
        return attrs

    def create(self, validated_data: Dict) -> models.User:
        return models.User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs: Dict) -> Dict:
        user = auth.authenticate(
            self.context["request"],
            username=attrs["email"],
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password.", code="invalid_credentials"
            )
        attrs["user"] = user
        return attrs


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


# ---------- Orders ---------- #


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = models.OrderItem
        fields = [
            "product_name",
            "color_name",
            "size",
            "unit_price",
            "quantity",
            "subtotal",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = models.Order
        fields = [
            "id",
            "reference",
            "status",
            "total",
            "item_count",
            "contact_name",
            "contact_phone",
            "shipping_address",
            "notes",
            "can_be_cancelled",
            "created_at",
            "items",
        ]
        read_only_fields = fields


class OrderLineSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_UNITS_PER_ITEM)


class CreateOrderSerializer(serializers.Serializer):
    items = OrderLineSerializer(many=True, allow_empty=False, max_length=50)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_items(
        self, items: List[Dict[str, int]]
    ) -> List[Tuple[models.ProductVariant, int]]:
        variant_ids = {item["variant_id"] for item in items}
        variants = (
            models.ProductVariant.objects.select_related("color__product__category")
            .filter(id__in=variant_ids, color__product__is_active=True)
            .in_bulk()
        )
        if len(variants) != len(variant_ids):
            raise serializers.ValidationError(
                "Some items are no longer available.", code="variant_unavailable"
            )
        return [(variants[item["variant_id"]], item["quantity"]) for item in items]

    def validate(self, attrs: Dict) -> Dict:
        if not self.context["request"].user.has_shipping_details:
            raise serializers.ValidationError(
                "Complete your shipping details before placing an order.",
                code="incomplete_shipping_details",
            )
        return attrs

    def create(self, validated_data: Dict) -> models.Order:
        return models.Order.place(
            customer=self.context["request"].user,
            items=validated_data["items"],
            notes=validated_data.get("notes", ""),
        )

    def to_representation(self, instance: models.Order) -> Dict:
        return OrderSerializer(instance, context=self.context).data
