import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

// Node's own global `localStorage` (added in Node 22+) is non-functional
// without --localstorage-file, and vitest's jsdom environment only merges a
// jsdom window property onto the global when the global doesn't already
// define that key - so Node's broken version wins over jsdom's real one.
// Replace it with a simple in-memory Storage so window.localStorage behaves
// like it does in a browser.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

for (const key of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(window, key, {
    configurable: true,
    value: new MemoryStorage(),
  });
}
