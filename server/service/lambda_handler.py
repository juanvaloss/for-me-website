from io import StringIO
from typing import Any, Dict

from apig_wsgi import make_lambda_handler
from django.core.management import call_command

from service.wsgi import application

handler = make_lambda_handler(application, binary_support=True)


def manage(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Entry point of the private ManageFunction: {"command": ["migrate"]}."""
    output = StringIO()
    call_command(*event["command"], stdout=output)
    return {"command": event["command"], "output": output.getvalue()}
