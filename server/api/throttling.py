from rest_framework.request import Request
from rest_framework.throttling import ScopedRateThrottle


class ViewerScopedRateThrottle(ScopedRateThrottle):
    """
    CloudFront overwrites X-Viewer-IP with the connecting client's address, so
    unlike X-Forwarded-For it cannot be spoofed to dodge the rate limit.
    """

    def get_ident(self, request: Request) -> str:
        return request.headers.get("X-Viewer-IP") or super().get_ident(request)
