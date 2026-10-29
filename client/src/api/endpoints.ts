import { request } from "./http";
import type {
  CreateOrderPayload,
  LoginPayload,
  Order,
  Product,
  Profile,
  ProfileUpdate,
  RegisterPayload,
} from "./types";

export const api = {
  health: () => request<{ status: string }>("/health/"),
  session: () => request<{ user: Profile | null }>("/v1/auth/session/"),
  register: (payload: RegisterPayload) =>
    request<Profile>("/v1/auth/register/", { method: "POST", body: payload }),
  login: (payload: LoginPayload) =>
    request<Profile>("/v1/auth/login/", { method: "POST", body: payload }),
  logout: () => request<void>("/v1/auth/logout/", { method: "POST" }),
  updateProfile: (payload: ProfileUpdate) =>
    request<Profile>("/v1/me/", { method: "PATCH", body: payload }),
  products: () => request<Product[]>("/v1/products/"),
  orders: () => request<Order[]>("/v1/orders/"),
  createOrder: (payload: CreateOrderPayload) =>
    request<Order>("/v1/orders/", { method: "POST", body: payload }),
  cancelOrder: (id: string) =>
    request<Order>(`/v1/orders/${id}/cancel/`, { method: "POST" }),
};
