import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { api } from "../api/endpoints";
import type { Order } from "../api/types";
import { refreshProducts } from "../hooks/useProducts";
import { formError } from "../lib/errors";
import { ORDER_STATUS_LABELS, formatDate, formatPrice, pluralize } from "../lib/format";
import styles from "./OrderHistory.module.css";

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    api.orders().then(setOrders, setError);
  }, []);

  const replaceOrder = (updated: Order) =>
    setOrders((current) =>
      (current ?? []).map((order) => (order.id === updated.id ? updated : order)),
    );

  if (error) {
    return <p className="form-error">{formError(error)}</p>;
  }
  if (!orders) {
    return <div className={`${styles.placeholder} skeleton`} />;
  }
  if (orders.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Aún no tienes pedidos.</p>
        <Link to="/catalog" className="btn btn-outline">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {orders.map((order, index) => (
        <motion.li
          key={order.id}
          className={styles.order}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.06 }}
        >
          <OrderCard order={order} onChange={replaceOrder} />
        </motion.li>
      ))}
    </ul>
  );
}

function OrderCard({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const cancel = async () => {
    setError(null);
    try {
      onChange(await api.cancelOrder(order.id));
      void refreshProducts();
    } catch (caught) {
      setError(caught);
    }
    setIsConfirming(false);
  };

  return (
    <>
      <header className={styles.orderHead}>
        <div>
          <p className={styles.reference}>{order.reference}</p>
          <p className={styles.date}>{formatDate(order.created_at)}</p>
        </div>
        <span className={`${styles.status} ${styles[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </header>
      <ul className={styles.items}>
        {order.items.map((item) => (
          <li key={`${item.product_name}-${item.color_name}-${item.size}`}>
            <span>
              {item.quantity} × {item.product_name}{" "}
              <em>
                · {item.color_name} · talla {item.size}
              </em>
            </span>
            <span>{formatPrice(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <footer className={styles.orderFoot}>
        <p>
          {pluralize(order.item_count, "pieza", "piezas")} ·{" "}
          <strong>{formatPrice(order.total)} MXN</strong>
        </p>
        {order.can_be_cancelled &&
          (isConfirming ? (
            <span className={styles.confirm}>
              ¿Cancelar este pedido?
              <button type="button" onClick={cancel}>
                Sí, cancelar
              </button>
              <button type="button" onClick={() => setIsConfirming(false)}>
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={styles.cancel}
              onClick={() => setIsConfirming(true)}
            >
              Cancelar pedido
            </button>
          ))}
      </footer>
      {formError(error) && <p className="form-error">{formError(error)}</p>}
    </>
  );
}
