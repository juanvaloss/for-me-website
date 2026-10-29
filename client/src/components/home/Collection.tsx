import { useMemo } from "react";
import { Link } from "react-router";

import { useProducts } from "../../hooks/useProducts";
import { summarizeCategories } from "../../lib/catalog";
import { pluralize } from "../../lib/format";
import { ArrowIcon } from "../icons";
import { ProductPhoto } from "../ProductPhoto";
import { MaskedLines, Reveal } from "../Reveal";
import styles from "./Collection.module.css";

const MAX_SWATCHES = 7;

export function Collection() {
  const { products, error } = useProducts();
  const categories = useMemo(() => summarizeCategories(products ?? []), [products]);
  const totalUnits = categories.reduce((total, category) => total + category.units, 0);

  return (
    <section className={styles.collection}>
      <div className="container">
        <div className={styles.head}>
          <div className={styles.headText}>
            <Reveal>
              <span className="kicker">04 — La colección</span>
            </Reveal>
            <h2 className={styles.title}>
              <MaskedLines
                lines={[
                  "Piezas para moverte",
                  <span key="way">
                    <em>a tu manera</em>
                  </span>,
                ]}
              />
            </h2>
          </div>
          <Reveal delay={0.1} className={styles.headAside}>
            <p>
              {products
                ? `${pluralize(totalUnits, "pieza", "piezas")} en stock para apartar en línea; el resto del Drop 01 se pide por DM.`
                : error
                  ? "Explora todas las piezas en el catálogo."
                  : "Revisando existencias…"}
            </p>
            <Link to="/catalog" className="link-arrow">
              Ver catálogo completo <ArrowIcon size={16} />
            </Link>
          </Reveal>
        </div>

        <div className={styles.grid}>
          {!products && !error
            ? Array.from({ length: 4 }, (_, index) => (
                <div key={index} className={`${styles.tile} ${styles.placeholder} skeleton`} />
              ))
            : categories.map((category, index) => (
                <Reveal key={category.slug} delay={(index % 4) * 0.08} className={styles.cell}>
                  <Link to={`/catalog?category=${category.slug}`} className={styles.tile}>
                    <div className={styles.media}>
                      {category.cover && (
                        <ProductPhoto
                          photo={category.cover.photo}
                          alt=""
                          category={category.slug}
                          colorHex={category.cover.hex}
                          className={styles.photo}
                        />
                      )}
                    </div>
                    <div className={styles.info}>
                      <h3>{category.name}</h3>
                      <div className={styles.swatches} aria-hidden="true">
                        {category.swatches.slice(0, MAX_SWATCHES).map((color, swatch) => (
                          <span key={`${color}-${swatch}`} style={{ background: color }} />
                        ))}
                        {category.swatches.length > MAX_SWATCHES && (
                          <em>+{category.swatches.length - MAX_SWATCHES}</em>
                        )}
                      </div>
                      <p>
                        {pluralize(category.productCount, "estilo", "estilos")} ·{" "}
                        {category.units > 0
                          ? pluralize(category.units, "pieza en stock", "piezas en stock")
                          : "se pide por DM"}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
