from typing import List

from django.contrib import auth
from django.db import connection
from django.db.models import QuerySet
from django.middleware.csrf import get_token
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from api import filtersets, models, permissions, serializers
from api.mixins import CSRFProtectedMixin
from api.throttling import ViewerScopedRateThrottle


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request: Request, **kwargs) -> Response:
        # The storefront pings this on load so a paused Aurora cluster is already
        # resuming while the visitor reads the home page.
        connection.ensure_connection()
        return Response({"status": "ok"})


# ---------- Accounts ---------- #


class AuthViewSet(CSRFProtectedMixin, GenericViewSet):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def get_serializer_class(self):
        if self.action == "register":
            return serializers.RegisterSerializer
        elif self.action == "login":
            return serializers.LoginSerializer
        return serializers.ProfileSerializer

    def get_throttles(self) -> List[BaseThrottle]:
        if self.action in ["register", "login"]:
            return [ViewerScopedRateThrottle()]
        return []

    @action(["GET"], detail=False, url_path="session")
    def session(self, request: Request, *args, **kwargs) -> Response:
        # Always 200, so anonymous visitors don't log a failed request on every
        # page load; it also hands out the CSRF cookie the storefront needs.
        get_token(request)
        user = request.user if request.user.is_authenticated else None
        return Response({"user": self.get_serializer(user).data if user else None})

    @action(["POST"], detail=False, url_path="register")
    def register(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        auth.login(request, user)
        return Response(
            serializers.ProfileSerializer(user).data, status=status.HTTP_201_CREATED
        )

    @action(["POST"], detail=False, url_path="login")
    def login(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        auth.login(request, user)
        return Response(serializers.ProfileSerializer(user).data)

    @action(["POST"], detail=False, url_path="logout")
    def logout(self, request: Request, *args, **kwargs) -> Response:
        auth.logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(RetrieveUpdateAPIView):
    serializer_class = serializers.ProfileSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self) -> models.User:
        return self.request.user


# ---------- Catalog ---------- #


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


# ---------- Orders ---------- #


class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    GenericViewSet,
):
    permission_classes = [IsAuthenticated, permissions.IsOrderOwner]

    def get_queryset(self) -> QuerySet:
        return models.Order.objects.filter(customer=self.request.user).prefetch_related(
            "items"
        )

    def get_serializer_class(self):
        if self.action == "create":
            return serializers.CreateOrderSerializer
        return serializers.OrderSerializer

    @action(["POST"], detail=True, url_path="cancel")
    def cancel(self, request: Request, *args, **kwargs) -> Response:
        order: models.Order = self.get_object()
        order.cancel()
        return Response(self.get_serializer(order).data)
