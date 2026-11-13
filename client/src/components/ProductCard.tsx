import { AnimatePresence, motion } from "motion/react";
import { useState, type CSSProperties } from "react";

import type { Product, Size } from "../api/types";
import { INSTAGRAM_DM_URL } from "../config";
import { defaultColorIndex } from "../lib/catalog";
import { formatPrice, pluralize } from "../lib/format";
import { CheckIcon, InstagramIcon } from "./icons";
import styles from "./ProductCard.module.css";
import { ProductPhoto } from "./ProductPhoto";

const LOW_STOCK = 2;

function dmMessage(product: Product, colorName: string, size?: Size): string {
  const piece = `${product.name} en color ${colorName}${size ? `, talla ${size}` : ""}`;
  return `¡Hola! Me interesa esta pieza: ${piece}. ¿Está disponible?`;
}

export function ProductCard({ product }: { product: Product }) {
  const [colorIndex, setColorIndex] = useState(() => defaultColorIndex(product));
  const [size, setSize] = useState<Size | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const color = product.colors[colorIndex];
  const hasStock = color.units_in_stock > 0;
  const variant = color.variants.find((item) => item.size === size && item.stock > 0);

  // Instagram links can't carry a message, so it goes to the clipboard and the
  // link opens the chat; the shopper only has to paste it.
  const askByDm = () => {
    setIsCopied(false);
    navigator.clipboard
      ?.writeText(dmMessage(product, color.name, variant?.size))
      .then(() => setIsCopied(true), () => undefined);
  };

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <AnimatePresence initial={false}>
          <motion.div
            key={color.name}
            className={styles.layer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <ProductPhoto
              photo={color.photo}
              alt={`${product.name} en color ${color.name}`}
              category={product.category}
              colorHex={color.hex}
              className={color.photo ? styles.photo : styles.art}
            />
          </motion.div>
        </AnimatePresence>
        {hasStock && (
          <span className={styles.badge}>
            {color.units_in_stock <= LOW_STOCK ? "Últimas piezas" : "En stock"}
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.category}>
              {product.category_name} · {pluralize(product.colors.length, "color", "colores")}
            </p>
            <h3 className={styles.name}>{product.name}</h3>
          </div>
          <p className={styles.price}>
            {formatPrice(product.price)} <span>mxn</span>
          </p>
        </div>

        <div>
          <p className={styles.label}>
            Color <span>· {color.name}</span>
          </p>
          <div className={styles.swatches} role="radiogroup" aria-label="Color">
            {product.colors.map((option, index) => (
              <button
                key={option.name}
                type="button"
                role="radio"
                aria-checked={index === colorIndex}
                aria-label={option.units_in_stock > 0 ? `${option.name}, en stock` : option.name}
                title={option.name}
                className={`${styles.swatch} ${index === colorIndex ? styles.swatchActive : ""} ${
                  option.units_in_stock > 0 ? styles.swatchStocked : ""
                }`}
                style={{ "--swatch": option.hex } as CSSProperties}
                onClick={() => {
                  setColorIndex(index);
                  setIsCopied(false);
                }}
              />
            ))}
          </div>
        </div>

        <fieldset className={styles.sizes}>
          <legend className={styles.label}>
            Talla{" "}
            <span>
              ·{" "}
              {hasStock
                ? pluralize(color.units_in_stock, "pieza disponible", "piezas disponibles")
                : "este color se pide por DM"}
            </span>
          </legend>
          <div className={styles.sizeRow}>
            {color.variants.map((option) => {
              const isSelected = option === variant;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.size} ${isSelected ? styles.selected : ""}`}
                  disabled={option.stock === 0}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSize(option.size);
                    setIsCopied(false);
                  }}
                >
                  <span className={styles.sizeLabel}>{option.size}</span>
                  <span className={styles.sizeStock}>
                    {option.stock === 0
                      ? "—"
                      : `${option.stock} ${option.stock === 1 ? "pza" : "pzas"}`}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <a
          className={`btn ${hasStock ? "btn-primary" : "btn-outline"} btn-block`}
          href={INSTAGRAM_DM_URL}
          target="_blank"
          rel="noreferrer"
          onClick={askByDm}
        >
          <InstagramIcon size={16} />
          {variant ? `Pide la talla ${variant.size} por DM` : "Pídelo por DM"}
        </a>
        {isCopied && (
          <p className={styles.copied} role="status">
            <CheckIcon size={14} /> Copiamos tu mensaje: pégalo en el chat.
          </p>
        )}

        {product.features.length > 0 && (
          <ul className={styles.features}>
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
