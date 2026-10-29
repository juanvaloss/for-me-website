import type Lenis from "lenis";

export function scrollToTop(lenis: Lenis | undefined) {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true });
  } else {
    window.scrollTo(0, 0);
  }
}
