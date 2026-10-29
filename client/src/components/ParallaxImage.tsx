import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import styles from "./ParallaxImage.module.css";

interface ParallaxImageProps {
  src: string;
  alt: string;
  shape?: "arch" | "rect";
  /** How far the photo drifts inside its frame while scrolling, in %. */
  strength?: number;
  className?: string;
  priority?: boolean;
}

export function ParallaxImage({
  src,
  alt,
  shape = "rect",
  strength = 8,
  className = "",
  priority = false,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);

  return (
    <motion.div
      ref={ref}
      className={`${styles.frame} ${styles[shape]} ${className}`}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.img
        src={src}
        alt={alt}
        className={styles.image}
        style={{ y, scale: 1 + (strength * 2.4) / 100 }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </motion.div>
  );
}
