import { useLenis } from "lenis/react";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router";

import { ArrowIcon } from "../icons";
import styles from "./Hero.module.css";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const LETTERS = ["f", "o", "r", "m", "e"];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "-38%"]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className={styles.hero}>
      <motion.div
        className={styles.glow}
        style={{ y: glowY, scale: glowScale }}
        aria-hidden="true"
      />

      <motion.div className={styles.corners} style={{ opacity: fade }} aria-hidden="true">
        <motion.span
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.9, ease: EASE_OUT }}
        >
          Your form.
        </motion.span>
        <motion.span
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 1, ease: EASE_OUT }}
        >
          Your way.
        </motion.span>
      </motion.div>

      <motion.div className={styles.center} style={{ y: copyY, opacity: fade }}>
        <h1 className={styles.wordmark} aria-label="forme">
          {LETTERS.map((letter, index) => (
            <span className={styles.letterMask} key={letter} aria-hidden="true">
              <motion.span
                className={letter === "m" ? styles.italic : undefined}
                initial={{ y: "115%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.4, delay: 0.25 + index * 0.08, ease: EASE_OUT }}
              >
                {letter}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          className={styles.activewear}
          initial={{ opacity: 0, letterSpacing: "0.3em" }}
          animate={{ opacity: 1, letterSpacing: "0.62em" }}
          transition={{ duration: 1.6, delay: 0.8, ease: EASE_OUT }}
        >
          activewear
        </motion.p>

        <motion.div
          className={styles.ctas}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.25, ease: EASE_OUT }}
        >
          <Link to="/catalog" className="btn btn-light">
            Ver Drop 01
          </Link>
          <button
            type="button"
            className={styles.storyLink}
            onClick={() => lenis?.scrollTo("#historia", { offset: -40 })}
          >
            Nuestra historia <ArrowIcon size={16} />
          </button>
        </motion.div>
      </motion.div>

      <motion.div className={styles.scrollCue} style={{ opacity: fade }} aria-hidden="true">
        <span>Desliza</span>
        <span className={styles.scrollLine} />
      </motion.div>
    </section>
  );
}
