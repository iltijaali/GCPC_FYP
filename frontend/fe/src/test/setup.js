import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });

afterEach(() => {
  cleanup();
  localStorage.clear();
});
