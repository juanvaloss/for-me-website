from django.urls import include, path
from rest_framework import routers

from api import views

router = routers.DefaultRouter()
router.register(r"auth", views.AuthViewSet, "auth")
router.register(r"categories", views.CategoryViewSet, "category")
router.register(r"products", views.ProductViewSet, "product")
router.register(r"orders", views.OrderViewSet, "order")

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("v1/me/", views.ProfileView.as_view(), name="me"),
    path("v1/", include(router.urls)),
]
