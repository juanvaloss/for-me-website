import styles from "./ValuesMarquee.module.css";

const VALUES = ["Autenticidad", "Confianza", "Compromiso", "Evolución", "Calidad"];

export function ValuesMarquee() {
  return (
    <section className={styles.marquee} aria-label={VALUES.join(", ")}>
      <div className={styles.track}>
        {[0, 1].map((copy) => (
          <div className={styles.group} key={copy} aria-hidden="true">
            {VALUES.map((value) => (
              <span key={value} className={styles.item}>
                <em>{value}</em>
                <span className={styles.star}>✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
