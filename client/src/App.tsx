import { ReactLenis, useLenis } from "lenis/react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router";

import { api } from "./api/endpoints";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthProvider } from "./context/AuthProvider";
import { CartProvider } from "./context/CartProvider";
import { scrollToTop } from "./lib/scroll";
import { CatalogPage } from "./pages/CatalogPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function App() {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Wakes the API (and a paused database) while the visitor reads the page.
    api.health().catch(() => undefined);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ReactLenis root options={{ lerp: 0.1, smoothWheel: !prefersReducedMotion }}>
        <AuthProvider>
          <CartProvider>
            <Header />
            <AnimatedRoutes />
            <Footer />
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </ReactLenis>
    </MotionConfig>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const lenis = useLenis();

  return (
    <AnimatePresence mode="wait" onExitComplete={() => scrollToTop(lenis)}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><HomePage /></Page>} />
        <Route path="/catalog" element={<Page><CatalogPage /></Page>} />
        <Route path="/profile" element={<Page><ProfilePage /></Page>} />
        <Route path="/checkout" element={<Page><CheckoutPage /></Page>} />
        <Route path="*" element={<Page><NotFoundPage /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      {children}
    </motion.main>
  );
}
