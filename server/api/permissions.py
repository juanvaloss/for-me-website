from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from api import models


class IsOrderOwner(BasePermission):
    def has_object_permission(self, request: Request, view, obj: models.Order) -> bool:
        return obj.customer_id == request.user.id
