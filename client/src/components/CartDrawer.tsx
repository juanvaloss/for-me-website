import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router";

import { useCart } from "../context/cart";
import { formatPrice } from "../lib/format";
import styles from "./CartDrawer.module.css";
import { CloseIcon } from "./icons";
import { ProductPhoto } from "./ProductPhoto";
import { QuantityStepper } from "./QuantityStepper";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function CartDrawer() {
  const cart = useCart();
  const { isOpen, close } = cart;
  const navigate = useNavigate();
  const lenis = useLenis();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    lenis?.stop();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close, lenis]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            className={styles.overlay}
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.aside
            key="panel"
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label="Tu bolsa"
            data-lenis-prevent
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.75, ease: EASE_OUT }}
          >
            <header className={styles.head}>
              <h2>
                Tu bolsa <span>({cart.count})</span>
              </h2>
              <button type="button" onClick={close} aria-label="Cerrar bolsa">
                <CloseIcon size={22} />
              </button>
            </header>

            {cart.items.length === 0 ? (
              <div className={styles.empty}>
                <p>Tu bolsa está vacía por ahora.</p>
                <Link to="/catalog" className="btn btn-outline" onClick={close}>
                  Ver catálogo
                </Link>
              </div>
            ) : (
              <>
                <ul className={styles.items}>
                  <AnimatePresence initial={false}>
                    {cart.items.map((item) => (
                      <motion.li
                        key={item.variantId}
                        layout
                        className={styles.item}
                        exit={{ opacity: 0, x: 60 }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                      >
                        <div
                          className={styles.thumb}
                          style={{ "--tint": item.colorHex } as CSSProperties}
                        >
                          <ProductPhoto
                            photo={item.photo}
                            alt=""
                            category={item.categorySlug}
                            colorHex={item.colorHex}
                            className={styles.thumbPhoto}
                          />
                        </div>
                        <div className={styles.info}>
                          <p className={styles.name}>{item.productName}</p>
                          <p className={styles.meta}>
                            {item.colorName} · Talla {item.size} · {formatPrice(item.unitPrice)}
                          </p>
                          <div className={styles.controls}>
                            <QuantityStepper
                              value={item.quantity}
                              max={item.maxQuantity}
                              onChange={(quantity) => cart.setQuantity(item.variantId, quantity)}
                            />
                            <button
                              type="button"
                              className={styles.remove}
                              onClick={() => cart.remove(item.variantId)}
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                        <p className={styles.lineTotal}>
                          {formatPrice(item.unitPrice * item.quantity)}
                        </p>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <footer className={styles.foot}>
                  <div className={styles.subtotal}>
                    <span>Subtotal</span>
                    <span>{formatPrice(cart.subtotal)} MXN</span>
                  </div>
                  <p className={styles.note}>
                    El envío y el pago se coordinan contigo por mensaje directo
                    al confirmar tu pedido.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => {
                      close();
                      navigate("/checkout");
                    }}
                  >
                    Continuar con mi pedido
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
