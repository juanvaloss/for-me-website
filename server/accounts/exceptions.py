from typing import Any, Dict


class AccountError(Exception):
    """Sign-in rule violation; the API reports it as 409 Conflict."""

    code = "conflict"

    @property
    def meta(self) -> Dict[str, Any]:
        return {}


class GoogleAccountConflictError(AccountError):
    code = "account_exists"

    def __init__(self):
        super().__init__(
            "An account with this email already exists; sign in with its password."
        )


class AccountDisabledError(AccountError):
    code = "account_disabled"

    def __init__(self):
        super().__init__("This account is disabled.")
