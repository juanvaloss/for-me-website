import { useLenis } from "lenis/react";
import { motion } from "motion/react";
import { useState, type CSSProperties } from "react";
import { Link } from "react-router";

import { ApiError } from "../api/http";
import { api } from "../api/endpoints";
import type { Order, Profile } from "../api/types";
import { AuthForms } from "../components/AuthForms";
import { CheckIcon, InstagramIcon } from "../components/icons";
import { ProductPhoto } from "../components/ProductPhoto";
import { ProfileForm } from "../components/ProfileForm";
import { MaskedLines } from "../components/Reveal";
import { INSTAGRAM_DM_URL } from "../config";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { refreshProducts } from "../hooks/useProducts";
import { formError } from "../lib/errors";
import { formatPrice, pluralize } from "../lib/format";
import { scrollToTop } from "../lib/scroll";
import styles from "./CheckoutPage.module.css";

export function CheckoutPage() {
  useDocumentTitle("Tu pedido · forme");
  const { user, isReady } = useAuth();
  const cart = useCart();
  const lenis = useLenis();
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  if (placedOrder) {
    return <Confirmation order={placedOrder} />;
  }

  if (cart.items.length === 0) {
    return (
      <div className={`container ${styles.empty}`}>
        <h1 className={styles.title}>
          <MaskedLines immediate lines={["Tu bolsa", <em key="empty">está vacía</em>]} />
        </h1>
        <Link to="/catalog" className="btn btn-primary">
          Ver catálogo
        </Link>
      </div>
    );
  }

  const placeOrder = async () => {
    setIsPlacing(true);
    setError(null);
    try {
      const order = await api.createOrder({
        items: cart.items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
        notes,
      });
      cart.clear();
      setPlacedOrder(order);
      scrollToTop(lenis);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "out_of_stock") {
        cart.setQuantity(Number(caught.meta.variant_id), Number(caught.meta.available));
      }
      setError(caught);
    } finally {
      setIsPlacing(false);
      void refreshProducts();
    }
  };

  const showShippingForm = user && (!user.has_shipping_details || isEditingShipping);

  return (
    <div className={`container ${styles.checkout}`}>
      <header className={styles.head}>
        <span className="kicker">Checkout</span>
        <h1 className={styles.title}>
          <MaskedLines immediate lines={["Tu pedido"]} />
        </h1>
      </header>

      <div className={styles.grid}>
        <section className={styles.steps}>
          <div className={styles.step}>
            <h2 className={styles.stepTitle}>
              <span>01</span> Tu cuenta
            </h2>
            {!isReady ? null : user ? (
              <p className={styles.muted}>
                Comprando como <strong>{user.email}</strong>
              </p>
            ) : (
              <>
                <p className={styles.muted}>
                  Inicia sesión o crea tu cuenta para apartar tus piezas.
                </p>
                <AuthForms />
              </>
            )}
          </div>

          {user && (
            <div className={styles.step}>
              <h2 className={styles.stepTitle}>
                <span>02</span> Datos de envío
              </h2>
              {showShippingForm ? (
                <ProfileForm
                  profile={user}
                  submitLabel="Guardar datos de envío"
                  onSaved={(saved) => setIsEditingShipping(!saved.has_shipping_details)}
                />
              ) : (
                <ShippingSummary user={user} onEdit={() => setIsEditingShipping(true)} />
              )}
            </div>
          )}

          {user && (
            <div className={styles.step}>
              <h2 className={styles.stepTitle}>
                <span>03</span> Confirmación
              </h2>
              <div className="field">
                <label htmlFor="order-notes">Notas para tu pedido (opcional)</label>
                <textarea
                  id="order-notes"
                  maxLength={500}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Horario de entrega, referencias de tu domicilio…"
                />
              </div>
              <p className={styles.muted}>
                Al confirmar apartamos tus piezas. Después te escribimos por
                mensaje directo para coordinar el pago y la entrega.
              </p>
              {formError(error) && <p className="form-error">{formError(error)}</p>}
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={!user.has_shipping_details || isEditingShipping || isPlacing}
                onClick={placeOrder}
              >
                {isPlacing ? "Apartando tus piezas…" : "Confirmar pedido"}
              </button>
            </div>
          )}
        </section>

        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>
            Resumen <span>· {pluralize(cart.count, "pieza", "piezas")}</span>
          </h2>
          <ul className={styles.lines}>
            {cart.items.map((item) => (
              <li key={item.variantId}>
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
                  <span className={styles.quantity}>{item.quantity}</span>
                </div>
                <div>
                  <p className={styles.lineName}>{item.productName}</p>
                  <p className={styles.muted}>
                    {item.colorName} · Talla {item.size}
                  </p>
                </div>
                <p>{formatPrice(item.unitPrice * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className={styles.total}>
            <span>Total</span>
            <span>{formatPrice(cart.subtotal)} MXN</span>
          </div>
          <p className={styles.muted}>El costo de envío se confirma por mensaje.</p>
        </aside>
      </div>
    </div>
  );
}

function ShippingSummary({ user, onEdit }: { user: Profile; onEdit: () => void }) {
  return (
    <div className={styles.address}>
      <div>
        <p className={styles.lineName}>
          {user.first_name} {user.last_name}
        </p>
        <p className={styles.muted}>{user.phone}</p>
        <p className={styles.muted}>
          {user.address_line}, {user.neighborhood}, {user.postal_code} {user.city},{" "}
          {user.state}
        </p>
      </div>
      <button type="button" className="link-arrow" onClick={onEdit}>
        Editar
      </button>
    </div>
  );
}

function Confirmation({ order }: { order: Order }) {
  const [isCopied, setIsCopied] = useState(false);

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(order.reference);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div className={`container ${styles.confirmation}`}>
      <motion.svg
        className={styles.seal}
        viewBox="0 0 80 80"
        initial="hidden"
        animate="visible"
        aria-hidden="true"
      >
        <motion.circle
          cx="40"
          cy="40"
          r="38"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
        <motion.path
          d="M26 41l9 9 19-20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
          transition={{ duration: 0.7, delay: 0.9, ease: "easeOut" }}
        />
      </motion.svg>
      <span className="kicker">Pedido apartado</span>
      <h1 className={styles.title}>
        <MaskedLines
          immediate
          delay={0.3}
          lines={[
            <span key="thanks">
              ¡Gracias, <em>{order.contact_name.split(" ")[0]}</em>!
            </span>,
          ]}
        />
      </h1>
      <p className={styles.confirmationLead}>
        Tus piezas quedaron apartadas con el número de pedido
      </p>
      <button type="button" className={styles.reference} onClick={copyReference}>
        {order.reference}
        <span>{isCopied ? <><CheckIcon size={14} /> Copiado</> : "Copiar"}</span>
      </button>
      <p className={styles.confirmationLead}>
        Mándanos tu número de pedido por DM en Instagram para coordinar el pago
        y la entrega. Total: <strong>{formatPrice(order.total)} MXN</strong>.
      </p>
      <div className={styles.confirmationActions}>
        <a className="btn btn-primary" href={INSTAGRAM_DM_URL} target="_blank" rel="noreferrer">
          <InstagramIcon size={16} /> Enviar DM
        </a>
        <Link to="/profile" className="btn btn-outline">
          Ver mis pedidos
        </Link>
      </div>
    </div>
  );
}
