export type Size = "XS" | "S" | "M" | "L" | "XL";

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  has_shipping_details: boolean;
}

export type ProfileUpdate = Partial<
  Omit<Profile, "id" | "email" | "has_shipping_details">
>;

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProductVariant {
  id: number;
  size: Size;
  stock: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  photo: string;
  units_in_stock: number;
  variants: ProductVariant[];
}

export interface Product {
  slug: string;
  name: string;
  category: string;
  category_name: string;
  price: string;
  features: string[];
  units_in_stock: number;
  colors: ProductColor[];
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  product_name: string;
  color_name: string;
  size: Size;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  total: string;
  item_count: number;
  contact_name: string;
  contact_phone: string;
  shipping_address: string;
  notes: string;
  can_be_cancelled: boolean;
  created_at: string;
  items: OrderItem[];
}

export interface CreateOrderPayload {
  items: { variant_id: number; quantity: number }[];
  notes?: string;
}

export interface FieldError {
  message: string;
  code: string;
}

export interface ErrorBody {
  detail?: string;
  code?: string;
  fields?: Record<string, FieldError[]>;
  meta?: Record<string, string | number>;
}
