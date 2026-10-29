from typing import Any, Dict


class StoreError(Exception):
    """Business rule violation; the API reports it as 409 Conflict."""

    code = "conflict"

    @property
    def meta(self) -> Dict[str, Any]:
        return {}


class OutOfStockError(StoreError):
    code = "out_of_stock"

    def __init__(self, variant, requested: int):
        self.variant = variant
        self.requested = requested
        super().__init__(
            f"Only {variant.stock} left of {variant.product.name} "
            f"{variant.color.name} in size {variant.size}."
        )

    @property
    def meta(self) -> Dict[str, Any]:
        return {
            "variant_id": self.variant.id,
            "product_name": self.variant.product.name,
            "color_name": self.variant.color.name,
            "size": self.variant.size,
            "available": self.variant.stock,
            "requested": self.requested,
        }


class OrderNotCancellableError(StoreError):
    code = "order_not_cancellable"

    def __init__(self, order):
        self.order = order
        super().__init__(f"Order {order.reference} can no longer be cancelled.")

    @property
    def meta(self) -> Dict[str, Any]:
        return {"reference": self.order.reference, "status": self.order.status}
