import { motion } from "motion/react";

import { MaskedLines, Reveal } from "../Reveal";
import styles from "./Principles.module.css";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const PRINCIPLES = [
  { name: "Autenticidad", description: "ser fieles a quiénes somos." },
  { name: "Confianza", description: "sentirte segura siendo tú." },
  { name: "Compromiso", description: "hacer las cosas con intención." },
  { name: "Evolución", description: "crecer, aprender y seguir avanzando." },
  { name: "Calidad", description: "hacerlo bien, siempre." },
];

export function Principles() {
  return (
    <section className={styles.principles}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.aside}>
          <div className={styles.sticky}>
            <Reveal>
              <span className="kicker">03 — Principios</span>
            </Reveal>
            <h2 className={styles.title}>
              <MaskedLines
                lines={[
                  "Nuestros principios",
                  "guían cada decisión",
                  <span key="brand">
                    detrás de <em>forme</em>
                  </span>,
                ]}
              />
            </h2>
          </div>
        </div>

        <ol className={styles.list}>
          {PRINCIPLES.map((principle, index) => (
            <motion.li
              key={principle.name}
              className={styles.item}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "0px 0px -18% 0px" }}
            >
              <motion.span
                className={styles.rule}
                variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1 } }}
                transition={{ duration: 1.3, ease: EASE_OUT }}
              />
              <motion.div
                className={styles.row}
                variants={{ hidden: { opacity: 0, y: 34 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 1, delay: 0.12, ease: EASE_OUT }}
              >
                <span className={styles.number}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className={styles.name}>{principle.name}</h3>
                <p className={styles.description}>{principle.description}</p>
              </motion.div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
