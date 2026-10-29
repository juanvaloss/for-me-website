import { Link } from "react-router";

import { INSTAGRAM_DM_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../config";
import styles from "./Footer.module.css";
import { InstagramIcon } from "./icons";
import { Reveal } from "./Reveal";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.top}`}>
        <Reveal>
          <p className={styles.tagline}>
            Your form.
            <br />
            <em>Your way.</em>
          </p>
        </Reveal>
        <div className={styles.columns}>
          <div className={styles.column}>
            <h4 className={styles.heading}>Tienda</h4>
            <Link to="/catalog">Catálogo</Link>
            <Link to="/profile">Mi perfil</Link>
            <Link to="/checkout">Mi bolsa</Link>
          </div>
          <div className={styles.column}>
            <h4 className={styles.heading}>Contacto</h4>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              <InstagramIcon size={15} /> @{INSTAGRAM_HANDLE}
            </a>
            <a href={INSTAGRAM_DM_URL} target="_blank" rel="noreferrer">
              Mándanos un DM
            </a>
            <span>Guadalajara, Jalisco</span>
          </div>
        </div>
      </div>
      <div className={styles.wordmark} aria-hidden="true">
        for<em>me</em>
      </div>
      <div className={`container ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} forme activewear</span>
        <span>Guadalajara · México</span>
      </div>
    </footer>
  );
}
