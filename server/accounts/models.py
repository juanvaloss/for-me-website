import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from accounts import exceptions
from accounts.google import GoogleIdentity


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str, **extra_fields) -> "User":
        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str = None, **extra_fields) -> "User":
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(
        self, email: str, password: str = None, **extra_fields
    ) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self._create_user(email, password, **extra_fields)

    def get_by_natural_key(self, email: str) -> "User":
        return self.get(email__iexact=email)

    def email_is_taken(self, email: str) -> bool:
        return self.filter(email__iexact=email).exists()

    def get_or_create_for_google(self, identity: GoogleIdentity) -> "User":
        user = (
            self.filter(google_sub=identity.sub).first()
            or self.filter(email__iexact=identity.email).first()
        )
        if user is None:
            return self.create_user(
                identity.email,
                google_sub=identity.sub,
                first_name=identity.first_name,
                last_name=identity.last_name,
            )
        if not user.is_active:
            raise exceptions.AccountDisabledError()
        # The admin keeps its password sign-in; a Google account never opens it.
        if user.is_staff:
            raise exceptions.GoogleAccountConflictError()
        if user.google_sub != identity.sub:
            # Only link when Google hosts the mailbox and so vouches for its owner.
            if user.google_sub or not identity.is_email_authoritative:
                raise exceptions.GoogleAccountConflictError()
            # The store never verified this email, so whoever set the password may
            # not own the mailbox. Dropping it also ends that person's sessions.
            user.google_sub = identity.sub
            user.set_unusable_password()
            user.save(update_fields=["google_sub", "password"])
        return user


class User(AbstractUser):
    SHIPPING_FIELDS = [
        "first_name",
        "phone",
        "address_line",
        "neighborhood",
        "city",
        "state",
        "postal_code",
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    address_line = models.CharField(max_length=255, blank=True)
    neighborhood = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=10, blank=True)
    # Google's stable account ID, set once the customer signs in with Google.
    google_sub = models.CharField(
        "Google account ID",
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        editable=False,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        return self.get_full_name() or self.email

    @property
    def has_shipping_details(self) -> bool:
        return all(getattr(self, field) for field in self.SHIPPING_FIELDS)

    @property
    def shipping_address(self) -> str:
        parts = [
            self.address_line,
            self.neighborhood,
            f"{self.postal_code} {self.city}".strip(),
            self.state,
        ]
        return ", ".join(part for part in parts if part)
