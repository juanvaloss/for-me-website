import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { ProductCard } from "../components/ProductCard";
import { MaskedLines } from "../components/Reveal";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useProducts } from "../hooks/useProducts";
import { sortByAvailability, summarizeCategories } from "../lib/catalog";
import { formError } from "../lib/errors";
import { pluralize } from "../lib/format";
import styles from "./CatalogPage.module.css";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const ALL = "all";

export function CatalogPage() {
  useDocumentTitle("Catálogo · forme");
  const { products, error, retry } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? ALL;
  const inStockOnly = searchParams.get("stock") === "1";

  const categories = useMemo(() => summarizeCategories(products ?? []), [products]);
  const sortedProducts = useMemo(() => sortByAvailability(products ?? []), [products]);
  const totalUnits = categories.reduce((total, category) => total + category.units, 0);
  const visibleProducts = sortedProducts.filter(
    (product) =>
      (activeCategory === ALL || product.category === activeCategory) &&
      (!inStockOnly || product.units_in_stock > 0),
  );
  const filters = [{ slug: ALL, name: "Todo", units: totalUnits }, ...categories];

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className={styles.page}>
      <header className={styles.banner}>
        <div className={`container ${styles.bannerInner}`}>
          <motion.span
            className={styles.kicker}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Drop 01 · Your form. Your way.
          </motion.span>
          <h1 className={styles.title}>
            <MaskedLines immediate delay={0.15} lines={["Catálogo"]} />
          </h1>
          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45, ease: EASE_OUT }}
          >
            Elige tu color y tu talla. Lo que está en stock se aparta en línea;
            el resto de la colección se pide por DM.
          </motion.p>
        </div>
      </header>

      {products && (
        <motion.div
          className={`container ${styles.toolbar}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE_OUT }}
        >
          <div className={styles.filters}>
            {filters.map((filter) => {
              const isActive = filter.slug === activeCategory;
              return (
                <button
                  key={filter.slug}
                  type="button"
                  className={`${styles.chip} ${isActive ? styles.active : ""}`}
                  aria-pressed={isActive}
                  onClick={() => updateParams({ category: filter.slug === ALL ? null : filter.slug })}
                >
                  {isActive && (
                    <motion.span
                      layoutId="catalog-chip"
                      className={styles.chipBackground}
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className={styles.chipLabel}>{filter.name}</span>
                  <span className={styles.chipCount}>{filter.units}</span>
                </button>
              );
            })}
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => updateParams({ stock: event.target.checked ? "1" : null })}
            />
            <span className={styles.toggleTrack} aria-hidden="true" />
            Solo en stock
          </label>
        </motion.div>
      )}

      <div className="container">
        {error && !products ? (
          <div className={styles.state}>
            <p>{formError(error)}</p>
            <button type="button" className="btn btn-outline" onClick={retry}>
              Intentar de nuevo
            </button>
          </div>
        ) : !products ? (
          <div className={styles.grid}>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={`${styles.placeholder} skeleton`} />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className={styles.state}>
            <p>Por ahora no hay piezas en stock en esta categoría.</p>
            <button type="button" className="btn btn-outline" onClick={() => updateParams({ stock: null })}>
              Ver toda la colección
            </button>
          </div>
        ) : (
          <>
            <p className={styles.count}>
              {pluralize(visibleProducts.length, "estilo", "estilos")}
            </p>
            <motion.div layout className={styles.grid}>
              <AnimatePresence mode="popLayout">
                {visibleProducts.map((product, index) => (
                  <motion.div
                    key={product.slug}
                    layout
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.7, delay: Math.min(index, 6) * 0.05, ease: EASE_OUT }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
