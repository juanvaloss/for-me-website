from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "forme admin"
admin.site.site_title = "forme"
admin.site.index_title = "Store management"

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
