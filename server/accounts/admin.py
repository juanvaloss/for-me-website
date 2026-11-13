from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "first_name", "last_name", "phone", "date_joined"]
    search_fields = ["email", "first_name", "last_name", "phone"]
    readonly_fields = ["google_sub"]
    fieldsets = [
        (None, {"fields": ["email", "password", "google_sub"]}),
        ("Personal info", {"fields": ["first_name", "last_name", "phone"]}),
        (
            "Shipping",
            {
                "fields": [
                    "address_line",
                    "neighborhood",
                    "city",
                    "state",
                    "postal_code",
                ]
            },
        ),
        (
            "Permissions",
            {"fields": ["is_active", "is_staff", "is_superuser", "groups"]},
        ),
        ("Important dates", {"fields": ["last_login", "date_joined"]}),
    ]
    add_fieldsets = [
        (
            None,
            {
                "classes": ["wide"],
                "fields": ["email", "password1", "password2"],
            },
        ),
    ]
