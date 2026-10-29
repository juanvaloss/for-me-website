import django_filters

from api import models


class ProductFilterSet(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug")

    class Meta:
        model = models.Product
        fields = ["category"]
