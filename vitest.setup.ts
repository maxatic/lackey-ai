import '@testing-library/jest-dom/vitest';

// jsdom lacks these browser APIs that GSAP / canvas marketing components touch.
// Stub them so components mount in tests (they no-op; animations don't run in jsdom).
if (!window.matchMedia) {
  // Report reduced-motion = true in tests, so GSAP/SplitText components render
  // their static, fully-visible fallback (no text splitting, no animation).
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

class StubObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
window.ResizeObserver ??= StubObserver as unknown as typeof ResizeObserver;
window.IntersectionObserver ??=
  StubObserver as unknown as typeof IntersectionObserver;
