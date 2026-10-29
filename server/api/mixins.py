from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import SAFE_METHODS
from rest_framework.request import Request


class CSRFProtectedMixin:
    """
    DRF only checks CSRF for authenticated sessions; anonymous login and register
    requests need it too, otherwise a third-party site could log a visitor in.
    """

    def initial(self, request: Request, *args, **kwargs) -> None:
        super().initial(request, *args, **kwargs)
        if request.method not in SAFE_METHODS:
            SessionAuthentication().enforce_csrf(request)
