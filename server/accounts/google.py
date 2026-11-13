import functools
from dataclasses import dataclass

import jwt
from django.conf import settings

ISSUERS = ["accounts.google.com", "https://accounts.google.com"]


class GoogleTokenError(Exception):
    """The ID token is malformed, expired, or not issued by Google for this app."""


class GoogleKeysUnavailableError(Exception):
    """Google's public keys could not be loaded, so no token can be checked."""


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    first_name: str
    last_name: str
    # Google hosts the mailbox (Gmail or Workspace), so it vouches for its owner.
    is_email_authoritative: bool


@functools.cache
def _jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(settings.GOOGLE_JWKS_URL, timeout=5)


def verify_id_token(token: str) -> GoogleIdentity:
    """Checks a "Sign in with Google" ID token the way Google documents it."""
    try:
        key = _jwks_client().get_signing_key_from_jwt(token).key
    except jwt.PyJWKClientConnectionError as exc:
        raise GoogleKeysUnavailableError() from exc
    except jwt.PyJWTError as exc:
        raise GoogleTokenError() from exc

    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            issuer=ISSUERS,
            # Tolerates a server clock that runs a little behind Google's.
            leeway=60,
            options={"require": ["exp", "iat", "iss", "aud", "sub", "email"]},
        )
    except jwt.PyJWTError as exc:
        raise GoogleTokenError() from exc
    if claims.get("email_verified") is not True:
        raise GoogleTokenError()

    email = claims["email"].lower()
    return GoogleIdentity(
        sub=claims["sub"],
        email=email,
        first_name=claims.get("given_name", "")[:150],
        last_name=claims.get("family_name", "")[:150],
        is_email_authoritative=email.endswith("@gmail.com") or bool(claims.get("hd")),
    )
