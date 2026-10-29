import { Link } from "react-router";

import storyImage from "../../assets/images/founders-together.webp";
import { ArrowIcon } from "../icons";
import { ParallaxImage } from "../ParallaxImage";
import { Reveal, ScrollRevealText } from "../Reveal";
import styles from "./Story.module.css";

export function Story() {
  return (
    <section id="historia" className={styles.story}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.imageColumn}>
          <ParallaxImage
            src={storyImage}
            alt="Las fundadoras de forme abrazadas y riendo"
            className={styles.image}
          />
          <Reveal delay={0.2}>
            <p className={styles.caption}>Ren &amp; Meli · fundadoras</p>
          </Reveal>
        </div>
        <div className={styles.textColumn}>
          <Reveal>
            <span className="kicker">01 — Nuestra historia</span>
          </Reveal>
          <ScrollRevealText
            className={styles.statement}
            text="*forme* nace entre nosotras, con ganas de crear algo que nos representara y compartirlo con otras personas."
          />
          <Reveal delay={0.1}>
            <p className={styles.body}>
              Queremos que cada pieza se sienta tuya: cómoda para moverte,
              bonita para tu día a día y hecha con intención, de principio a
              fin.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link to="/catalog" className="link-arrow">
              Descubre la colección <ArrowIcon size={16} />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
