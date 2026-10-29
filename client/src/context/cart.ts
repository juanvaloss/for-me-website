import { createContext, useContext } from "react";

import type { Size } from "../api/types";

export interface CartItem {
  variantId: number;
  productSlug: string;
  productName: string;
  categorySlug: string;
  colorName: string;
  colorHex: string;
  photo: string;
  size: Size;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
}

export interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "quantity">) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  quantityOf: (variantId: number) => number;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return value;
}
