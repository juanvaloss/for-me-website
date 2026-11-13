import json
import time
from unittest import mock

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

from accounts import google

CLIENT_ID = "1234567890-test.apps.googleusercontent.com"
KEY_ID = "test-key"
GOOGLE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
JWKS = {
    "keys": [
        {
            **json.loads(RSAAlgorithm.to_jwk(GOOGLE_KEY.public_key())),
            "kid": KEY_ID,
            "alg": "RS256",
            "use": "sig",
        }
    ]
}


def make_id_token(signing_key=GOOGLE_KEY, **claims) -> str:
    now = int(time.time())
    payload = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "110169484474386276334",
        "email": "Ana.Garcia@gmail.com",
        "email_verified": True,
        "given_name": "Ana",
        "family_name": "García",
        "iat": now,
        "exp": now + 3600,
    }
    payload.update(claims)
    return jwt.encode(payload, signing_key, algorithm="RS256", headers={"kid": KEY_ID})


def serve_google_keys(test_case) -> mock.MagicMock:
    """Serves the test key instead of downloading Google's, for one test."""
    google._jwks_client.cache_clear()
    patcher = mock.patch.object(jwt.PyJWKClient, "fetch_data", return_value=JWKS)
    test_case.addCleanup(patcher.stop)
    return patcher.start()
