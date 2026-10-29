import meliImage from "../../assets/images/founder-meli.webp";
import renImage from "../../assets/images/founder-ren.webp";
import meetImage from "../../assets/images/meet-the-founders.webp";
import { ParallaxImage } from "../ParallaxImage";
import { MaskedLines, Reveal } from "../Reveal";
import styles from "./Founders.module.css";

const FOUNDERS = [
  {
    name: "ren",
    image: renImage,
    alt: "Ren, fundadora de forme",
    quote:
      "me encanta descubrir cosas nuevas y disfrutar el proceso de cada proyecto. creo que las mejores cosas pasan cuando haces algo que realmente se siente tuyo.",
  },
  {
    name: "meli",
    image: meliImage,
    alt: "Meli, fundadora de forme",
    quote:
      "me encanta crear y convertir mis ideas en algo real. disfruto mucho los pequeños momentos, rodearme de personas que me inspiran y hacer cosas nuevas.",
  },
];

export function Founders() {
  return (
    <section className={styles.founders}>
      <div className={`container ${styles.intro}`}>
        <ParallaxImage
          src={meetImage}
          alt="Meet the founders: las fundadoras de forme sentadas juntas"
          strength={5}
          className={styles.introImage}
        />
        <div className={styles.introText}>
          <Reveal>
            <span className="kicker">02 — Quiénes somos</span>
          </Reveal>
          <h2 className={styles.title}>
            <MaskedLines lines={["Detrás de", <em key="brand">forme</em>]} />
          </h2>
          <Reveal delay={0.15}>
            <p className={styles.lead}>
              Dos personas que creen en hacer las cosas con intención. Creamos
              forme pensando en cómo te mueves, cómo te sientes y en todo lo que
              quieres lograr.
            </p>
          </Reveal>
        </div>
      </div>

      <div className={`container ${styles.cards}`}>
        {FOUNDERS.map((founder) => (
          <article key={founder.name} className={styles.card}>
            <ParallaxImage
              src={founder.image}
              alt={founder.alt}
              shape="arch"
              strength={6}
              className={styles.cardImage}
            />
            <Reveal delay={0.1}>
              <blockquote className={styles.quote}>“{founder.quote}”</blockquote>
              <p className={styles.signature}>{founder.name}</p>
            </Reveal>
          </article>
        ))}
      </div>
    </section>
  );
}
