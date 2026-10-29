import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from store.exceptions import StoreError

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Every error shares one shape so the storefront can translate it by code:
    {"detail": str, "code": str, "fields": {...}?, "meta": {...}?}
    """
    if isinstance(exc, StoreError):
        return Response(
            {"detail": str(exc), "code": exc.code, "meta": exc.meta},
            status=status.HTTP_409_CONFLICT,
        )
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()

    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            {"detail": "An internal server error occurred.", "code": "server_error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    details = exc.get_full_details()
    if isinstance(exc, exceptions.ValidationError):
        if not isinstance(details, dict):
            details = {"non_field_errors": details}
        response.data = {
            "detail": "Invalid input.",
            "code": "invalid",
            "fields": details,
        }
    else:
        response.data = {"detail": details["message"], "code": details["code"]}
    return response
