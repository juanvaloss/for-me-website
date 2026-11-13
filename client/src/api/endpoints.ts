import { request } from "./http";
import type { Product } from "./types";

export const api = {
  health: () => request<{ status: string }>("/health/"),
  products: () => request<Product[]>("/v1/products/"),
};
