import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useState } from "react";
import { Link, NavLink } from "react-router";

import { INSTAGRAM_URL } from "../config";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import styles from "./Header.module.css";
import { BagIcon, InstagramIcon, UserIcon } from "./icons";
import { Logo } from "./Logo";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.navLink} ${isActive ? styles.active : ""}`;

export function Header() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const cart = useCart();
  const [seenCount, setSeenCount] = useState(cart.count);

  // Reveal the header when something is added so the bag count is visible.
  if (cart.count !== seenCount) {
    setSeenCount(cart.count);
    if (cart.count > seenCount) {
      setIsHidden(false);
    }
  }

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
          <NavLink to="/profile" className={navClass}>
            <UserIcon />
            <span className={styles.actionLabel}>
              {user ? `Hola, ${user.first_name}` : "Iniciar sesión"}
            </span>
          </NavLink>
          <button
            type="button"
            className={styles.bag}
            onClick={cart.open}
            aria-label={`Abrir bolsa (${cart.count})`}
          >
            <BagIcon />
            <span className={styles.actionLabel}>Bolsa</span>
            <AnimatePresence>
              {cart.count > 0 && (
                <motion.span
                  key={cart.count}
                  className={styles.count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  {cart.count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
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
                { to: "/profile", label: user ? "Mi perfil" : "Iniciar sesión" },
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
