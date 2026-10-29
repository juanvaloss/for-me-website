import { Link } from "react-router";

import { MaskedLines } from "../components/Reveal";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  useDocumentTitle("Página no encontrada · forme");

  return (
    <div className={`container ${styles.page}`}>
      <span className="kicker">Error 404</span>
      <h1 className={styles.title}>
        <MaskedLines immediate lines={["Esta página", <em key="lost">no existe</em>]} />
      </h1>
      <Link to="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}
