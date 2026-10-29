import { Link } from "react-router";

import { INSTAGRAM_DM_URL, INSTAGRAM_HANDLE } from "../../config";
import { InstagramIcon } from "../icons";
import { MaskedLines, Reveal } from "../Reveal";
import styles from "./Closing.module.css";

export function Closing() {
  return (
    <section className={styles.closing}>
      <div className={`container ${styles.inner}`}>
        <Reveal>
          <span className={styles.kicker}>Move with forme</span>
        </Reveal>
        <h2 className={styles.statement}>
          <MaskedLines
            lines={[
              <span key="brand">
                <em>forme</em> no busca
              </span>,
              "ser perfecta.",
              "Busca sentirse",
              <em key="ours">nuestra.</em>,
            ]}
          />
        </h2>
        <Reveal delay={0.3} className={styles.actions}>
          <Link to="/catalog" className="btn btn-light">
            Explorar el Drop 01
          </Link>
          <a
            className={styles.instagram}
            href={INSTAGRAM_DM_URL}
            target="_blank"
            rel="noreferrer"
          >
            <InstagramIcon /> Pedidos y disponibilidad por DM · @{INSTAGRAM_HANDLE}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
