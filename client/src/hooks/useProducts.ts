import { useSyncExternalStore } from "react";

import { api } from "../api/endpoints";
import type { Product } from "../api/types";

// One shared catalog for every page, refreshed after an order changes stock.
interface Snapshot {
  products?: Product[];
  error?: unknown;
}

let snapshot: Snapshot = {};
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function refreshProducts(): Promise<void> {
  inflight ??= api
    .products()
    .then(
      (products) => publish({ products }),
      (error) => publish({ ...snapshot, error }),
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!snapshot.products && !inflight) {
    void refreshProducts();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useProducts() {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  return {
    products: state.products,
    error: state.error,
    isLoading: !state.products && !state.error,
    retry: () => {
      publish({});
      void refreshProducts();
    },
  };
}
