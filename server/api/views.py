from django.db import connection
from django.db.models import QuerySet
from rest_framework import mixins
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from api import filtersets, models, serializers


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request: Request, **kwargs) -> Response:
        # The storefront pings this on load so a paused Aurora cluster is already
        # resuming while the visitor reads the home page.
        connection.ensure_connection()
        return Response({"status": "ok"})


# ---------- Catalog ---------- #
# Read-only: shoppers order by Instagram DM and the founders edit stock in the admin.


class CategoryViewSet(mixins.ListModelMixin, GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = serializers.CategorySerializer

    def get_queryset(self) -> QuerySet:
        return models.Category.objects.with_catalog_counts()


class ProductViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = serializers.ProductSerializer
    filterset_class = filtersets.ProductFilterSet
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet:
        return models.Product.objects.for_catalog()
