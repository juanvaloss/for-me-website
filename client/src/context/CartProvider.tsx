import { useEffect, useMemo, useState, type ReactNode } from "react";

import { CartContext, type CartContextValue, type CartItem } from "./cart";

// Bumped with the cart item shape, so old bags are dropped instead of misread.
const STORAGE_KEY = "forme.cart.v2";

function readStoredCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Private browsing can block storage; the bag still works for this visit.
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const setQuantity = (variantId: number, quantity: number) =>
      setItems((current) =>
        current
          .map((item) =>
            item.variantId === variantId
              ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );

    return {
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      ),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: (item) =>
        setItems((current) => {
          const existing = current.find((line) => line.variantId === item.variantId);
          if (!existing) {
            return [...current, { ...item, quantity: 1 }];
          }
          return current.map((line) =>
            line === existing
              ? {
                  ...line,
                  maxQuantity: item.maxQuantity,
                  quantity: Math.min(line.quantity + 1, item.maxQuantity),
                }
              : line,
          );
        }),
      setQuantity,
      remove: (variantId) => setQuantity(variantId, 0),
      clear: () => setItems([]),
      quantityOf: (variantId) =>
        items.find((item) => item.variantId === variantId)?.quantity ?? 0,
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
