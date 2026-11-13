export type Size = "XS" | "S" | "M" | "L" | "XL";

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
