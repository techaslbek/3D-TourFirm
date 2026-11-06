import { useStore } from './state/store';

/**
 * Read-only debug/test hook, exposed as window.__tourfirm. Used by the Playwright smoke test
 * to check navigation and collision without guessing from pixels.
 */
export const debug = {
  frames: 0,
  fps: 0,
  walk: { x: 0, y: 0, yaw: 0, pitch: 0 },
  errors: [] as string[],
  getState: () => useStore.getState(),
};

declare global {
  interface Window { __tourfirm?: typeof debug }
}

if (typeof window !== 'undefined') window.__tourfirm = debug;
