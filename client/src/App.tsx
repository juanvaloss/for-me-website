import { ReactLenis, useLenis } from "lenis/react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router";

import { api } from "./api/endpoints";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { scrollToTop } from "./lib/scroll";
import { CatalogPage } from "./pages/CatalogPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

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
        <Header />
        <AnimatedRoutes />
        <Footer />
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
