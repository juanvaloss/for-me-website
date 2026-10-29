import type { Product, ProductColor } from "../api/types";

export interface CategorySummary {
  slug: string;
  name: string;
  productCount: number;
  units: number;
  swatches: string[];
  cover?: ProductColor;
}

/** A product card opens on its first color with stock, so shoppers land on what they can buy. */
export function defaultColorIndex(product: Product): number {
  const index = product.colors.findIndex((color) => color.units_in_stock > 0);
  return Math.max(index, 0);
}

/** Products with stock first; the API order (the catalog's) is kept within each group. */
export function sortByAvailability(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) => Number(b.units_in_stock > 0) - Number(a.units_in_stock > 0),
  );
}

/** Categories in catalog order, derived from the product list. */
export function summarizeCategories(products: Product[]): CategorySummary[] {
  const categories = new Map<string, CategorySummary>();
  for (const product of products) {
    const summary = categories.get(product.category) ?? {
      slug: product.category,
      name: product.category_name,
      productCount: 0,
      units: 0,
      swatches: [],
    };
    summary.productCount += 1;
    summary.units += product.units_in_stock;
    summary.swatches.push(...product.colors.map((color) => color.hex));

    const candidate = product.colors[defaultColorIndex(product)];
    const isBetterCover =
      candidate?.photo &&
      (!summary.cover ||
        (candidate.units_in_stock > 0 && summary.cover.units_in_stock === 0));
    if (isBetterCover) {
      summary.cover = candidate;
    }
    categories.set(product.category, summary);
  }
  return [...categories.values()];
}
