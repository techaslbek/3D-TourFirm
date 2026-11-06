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
  /** Export functions (set by ui/exports.ts) for the end-to-end test. */
  exports: {} as Record<string, (...args: never[]) => unknown>,
  /** Saves the autosave slot immediately (set by autosave.ts). */
  flushAutosave: async (): Promise<void> => {},
  getState: () => useStore.getState(),
  /** Screen position (CSS px) of a layout point (x, y, height). Set by the scene. */
  project: (_x: number, _y: number, _h = 0): [number, number] => [0, 0],
};

declare global {
  interface Window { __tourfirm?: typeof debug }
}

if (typeof window !== 'undefined') window.__tourfirm = debug;
