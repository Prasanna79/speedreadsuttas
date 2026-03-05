import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const storageState = new Map<string, string>();

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: (key: string) => storageState.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storageState.set(key, value);
    },
    removeItem: (key: string) => {
      storageState.delete(key);
    },
    clear: () => {
      storageState.clear();
    },
    key: (index: number) => [...storageState.keys()][index] ?? null,
    get length() {
      return storageState.size;
    },
  } satisfies Storage,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
});
