from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.crypto import constant_time_compare


class OriginVerifyMiddleware:
    """Reject requests that reach the Lambda URL without going through CloudFront."""

    header = "X-Origin-Verify"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        secret = settings.ORIGIN_VERIFY_SECRET
        if secret and not constant_time_compare(
            request.headers.get(self.header, ""), secret
        ):
            return JsonResponse({"detail": "Forbidden."}, status=403)
        return self.get_response(request)
