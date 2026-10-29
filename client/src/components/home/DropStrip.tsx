import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router";

import { ArrowIcon } from "../icons";
import { MaskedLines, Reveal } from "../Reveal";
import styles from "./DropStrip.module.css";

interface Tile {
  photo: string;
  category: string;
  label: string;
}

const ROWS: Tile[][] = [
  [
    { photo: "set-scoop-chocolate", category: "sets", label: "Set Scoop · Chocolate" },
    { photo: "leggings-sculpt-army-green", category: "leggings", label: "Leggings Sculpt · Army green" },
    { photo: "falda-tennis-rosa", category: "skirts", label: "Falda tennis · Rosa" },
    { photo: "jacket-clasica-beige", category: "jackets", label: "Jacket clásica · Beige" },
    { photo: "top-halter-v-wine", category: "tops", label: "Top halter V · Wine" },
    { photo: "biker-shorts-con-bolsillos-espresso", category: "biker-shorts", label: "Biker shorts · Espresso" },
    { photo: "set-cami-turquoise", category: "sets", label: "Set Cami · Turquoise" },
    { photo: "running-shorts-butter", category: "shorts", label: "Running shorts · Butter" },
  ],
  [
    { photo: "leggings-sculpt-night-sea", category: "leggings", label: "Leggings Sculpt · Night sea" },
    { photo: "top-halter-corazon-pink", category: "tops", label: "Top halter corazón · Pink" },
    { photo: "set-scoop-sage", category: "sets", label: "Set Scoop · Sage" },
    { photo: "flare-leggings-espresso", category: "leggings", label: "Flare Leggings · Espresso" },
    { photo: "falda-tennis-pearl-yellow", category: "skirts", label: "Falda tennis · Pearl yellow" },
    { photo: "top-racerback-mocha", category: "tops", label: "Top racerback · Mocha" },
    { photo: "biker-shorts-cortos-raspberry", category: "biker-shorts", label: "Biker shorts · Raspberry" },
    { photo: "jacket-con-hood-white", category: "jackets", label: "Jacket con hood · White" },
  ],
];

export function DropStrip() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const forward = useTransform(scrollYProgress, [0, 1], ["4%", "-30%"]);
  const backward = useTransform(scrollYProgress, [0, 1], ["-30%", "4%"]);

  return (
    <section ref={ref} className={styles.drop}>
      <div className={`container ${styles.head}`}>
        <div className={styles.headText}>
          <Reveal>
            <span className="kicker">Drop 01</span>
          </Reveal>
          <h2 className={styles.title}>
            <MaskedLines lines={["Designed to", <em key="move">move with you</em>]} />
          </h2>
        </div>
        <Reveal delay={0.1} className={styles.aside}>
          <p>
            18 estilos entre sets, leggings, biker shorts, shorts, faldas, tops
            y jackets, en más de 130 combinaciones de color.
          </p>
          <Link to="/catalog" className="link-arrow">
            Ver el catálogo <ArrowIcon size={16} />
          </Link>
        </Reveal>
      </div>

      <div className={styles.rows}>
        <Row tiles={ROWS[0]} x={forward} />
        <Row tiles={ROWS[1]} x={backward} />
      </div>
    </section>
  );
}

function Row({ tiles, x }: { tiles: Tile[]; x: MotionValue<string> }) {
  return (
    <motion.div className={styles.row} style={{ x }}>
      {tiles.map((tile) => (
        <Link
          key={tile.photo}
          to={`/catalog?category=${tile.category}`}
          className={styles.tile}
          aria-label={tile.label}
        >
          <img src={`/products/${tile.photo}.webp`} alt="" loading="lazy" decoding="async" />
          <span className={styles.caption}>{tile.label}</span>
        </Link>
      ))}
    </motion.div>
  );
}
