import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import SimpleTestCase, override_settings

from accounts import google
from accounts.tests.data.google_tokens import (
    CLIENT_ID,
    make_id_token,
    serve_google_keys,
)


@override_settings(GOOGLE_CLIENT_ID=CLIENT_ID)
class VerifyIdTokenTests(SimpleTestCase):
    def setUp(self):
        self.fetch_keys = serve_google_keys(self)

    def test_valid_token_returns_identity(self):
        identity = google.verify_id_token(make_id_token())

        assert identity == google.GoogleIdentity(
            sub="110169484474386276334",
            email="ana.garcia@gmail.com",
            first_name="Ana",
            last_name="García",
            is_email_authoritative=True,
        )

    def test_workspace_email_is_authoritative(self):
        token = make_id_token(email="ana@forme.mx", hd="forme.mx")

        assert google.verify_id_token(token).is_email_authoritative is True

    def test_other_email_is_not_authoritative(self):
        token = make_id_token(email="ana@hotmail.com")

        assert google.verify_id_token(token).is_email_authoritative is False

    def test_token_for_another_app_is_rejected(self):
        with pytest.raises(google.GoogleTokenError):
            google.verify_id_token(make_id_token(aud="another-app"))

    def test_token_from_another_issuer_is_rejected(self):
        with pytest.raises(google.GoogleTokenError):
            google.verify_id_token(make_id_token(iss="https://evil.example.com"))

    def test_expired_token_is_rejected(self):
        an_hour_ago = int(time.time()) - 3600

        with pytest.raises(google.GoogleTokenError):
            google.verify_id_token(make_id_token(exp=an_hour_ago))

    def test_token_signed_with_another_key_is_rejected(self):
        forger_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

        with pytest.raises(google.GoogleTokenError):
            google.verify_id_token(make_id_token(signing_key=forger_key))

    def test_unverified_email_is_rejected(self):
        with pytest.raises(google.GoogleTokenError):
            google.verify_id_token(make_id_token(email_verified=False))

    def test_garbage_token_is_rejected(self):
        with pytest.raises(google.GoogleTokenError):
            google.verify_id_token("not-a-token")

    def test_unreachable_keys_raise_unavailable(self):
        self.fetch_keys.side_effect = jwt.PyJWKClientConnectionError("timed out")

        with pytest.raises(google.GoogleKeysUnavailableError):
            google.verify_id_token(make_id_token())
