import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, type ReactNode } from "react";

import styles from "./Reveal.module.css";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, y = 36, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

interface MaskedLinesProps {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean;
}

export function MaskedLines({ lines, className, delay = 0, immediate }: MaskedLinesProps) {
  // The wrapper is observed, not the lines: a line pushed below its mask is
  // clipped away entirely, so the observer would never see it enter the view.
  return (
    <motion.span
      className={`${styles.masked} ${className ?? ""}`}
      initial="hidden"
      animate={immediate ? "visible" : undefined}
      whileInView={immediate ? undefined : "visible"}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {lines.map((line, index) => (
        <span className={styles.line} key={index}>
          <motion.span
            className={styles.lineInner}
            variants={{ hidden: { y: "110%" }, visible: { y: "0%" } }}
            transition={{ duration: 1.1, delay: delay + index * 0.12, ease: EASE_OUT }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

interface ScrollRevealTextProps {
  /** Words wrapped in *asterisks* are set in italics. */
  text: string;
  className?: string;
}

export function ScrollRevealText({ text, className }: ScrollRevealTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });
  const words = text.split(" ");

  return (
    <p ref={ref} className={className}>
      {words.map((word, index) => (
        <Word
          key={index}
          progress={scrollYProgress}
          range={[index / words.length, (index + 1) / words.length]}
          word={word}
        />
      ))}
    </p>
  );
}

function Word({
  progress,
  range,
  word,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  word: string;
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  const isEmphasis = word.startsWith("*") && word.includes("*", 1);
  const content = isEmphasis ? <em>{word.replaceAll("*", "")}</em> : word;
  return (
    <>
      <motion.span style={{ opacity }}>{content}</motion.span>{" "}
    </>
  );
}
