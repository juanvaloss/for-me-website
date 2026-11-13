import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useState } from "react";
import { Link, NavLink } from "react-router";

import { INSTAGRAM_DM_URL, INSTAGRAM_URL } from "../config";
import styles from "./Header.module.css";
import { InstagramIcon } from "./icons";
import { Logo } from "./Logo";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.navLink} ${isActive ? styles.active : ""}`;

export function Header() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setIsScrolled(latest > 24);
    setIsHidden(latest > previous && latest > 320);
  });

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <motion.header
      className={`${styles.header} ${isScrolled || isMenuOpen ? styles.solid : ""}`}
      animate={{ y: isHidden && !isMenuOpen ? "-100%" : "0%" }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <div className={styles.inner}>
        <nav className={styles.nav} aria-label="Principal">
          <NavLink to="/" end className={navClass}>
            Inicio
          </NavLink>
          <NavLink to="/catalog" className={navClass}>
            Catálogo
          </NavLink>
        </nav>

        <button
          type="button"
          className={`${styles.menuButton} ${isMenuOpen ? styles.menuOpen : ""}`}
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <span />
          <span />
        </button>

        <Link to="/" className={styles.logo} aria-label="forme, inicio" onClick={closeMenu}>
          <Logo />
        </Link>

        <div className={styles.actions}>
          <a
            className={styles.instagram}
            href={INSTAGRAM_DM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Pide por DM en Instagram"
          >
            <InstagramIcon />
            <span className={styles.actionLabel}>Pide por DM</span>
          </a>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <nav className={styles.mobileNav} aria-label="Menú">
              {[
                { to: "/", label: "Inicio" },
                { to: "/catalog", label: "Catálogo" },
              ].map((link, index) => (
                <motion.div
                  key={link.to}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.15 + index * 0.08, ease: EASE_OUT }}
                >
                  <Link to={link.to} onClick={closeMenu}>
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <a className={styles.mobileInstagram} href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              <InstagramIcon /> @forme.activewearr
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
