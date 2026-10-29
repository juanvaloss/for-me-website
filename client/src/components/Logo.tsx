import styles from "./Logo.module.css";

interface LogoProps {
  size?: "sm" | "lg";
  withTagline?: boolean;
  className?: string;
}

export function Logo({ size = "sm", withTagline = false, className = "" }: LogoProps) {
  return (
    <span className={`${styles.logo} ${styles[size]} ${className}`}>
      <span className={styles.kicker}>activewear</span>
      <span className={styles.word}>
        for<em>me</em>
      </span>
      {withTagline && <span className={styles.tagline}>Your form. Your way.</span>}
    </span>
  );
}
