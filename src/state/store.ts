import { create } from 'zustand';
import { DEFAULT_BUDGET, type BudgetSettings } from '../core/budget';
import { catalogById } from '../core/catalog';
import { addFromCatalog, deleteItem, duplicateItem, resizeItem, rotateItem, swapCatalog, updateItem } from '../core/edit';
import { DEFAULT_LAYOUT, resizeRoom } from '../core/layout';
import { cameraPresets, type CameraMode, type CameraPreset } from '../core/presets';
import type { ProjectData } from '../core/project';
import { DEFAULT_FINISHES, DEFAULT_LIGHTING, type Finishes, type Item, type Layout, type LightingSettings } from '../core/types';
import type { Lang } from '../ui/i18n';

export type WallMode = 'cutaway' | 'solid' | 'transparent' | 'hidden';
export type Quality = 'low' | 'balanced' | 'high';
export type CeilingMode = 'auto' | 'on' | 'off';
export type PanelTab = 'design' | 'room' | 'brand' | 'budget' | 'project' | 'settings';

export interface CameraRequest { preset: CameraPreset; nonce: number }

interface Settings {
  lang: Lang;
  quality: Quality;
  autoQuality: boolean;
  eyeHeight: number;
  walkSpeed: number;
  collision: boolean;
  showFps: boolean;
  /** Placeholder brand: the real name and identity are not decided yet. */
  brandName: string;
  brandTagline: string;
  /** Destinations shown on posters and the TV loop (editable). */
  destinations: string[];
  /** Grid step for moving furniture, in metres (0 = off). */
  grid: number;
  snapWalls: boolean;
}

export interface AppState extends Settings {
  layout: Layout;
  past: Layout[];
  future: Layout[];
  budget: BudgetSettings;
  projectName: string;
  cameraMode: CameraMode;
  cameraRequest: CameraRequest | null;
  wallMode: WallMode;
  ceilingMode: CeilingMode;
  showFurniture: boolean;
  showWallItems: boolean;
  showZones: boolean;
  showGrid: boolean;
  doorOpen: boolean;
  helpOpen: boolean;
  panelOpen: boolean;
  panelTab: PanelTab;
  hovered: string | null;
  selected: string | null;
  dragging: boolean;
  pointerLocked: boolean;
  fps: number;
  qualityNotice: string | null;
  notice: string | null;

  /**
   * Applies a layout change as one undoable step. Changes with the same `mergeKey` within one
   * second (typing a name, dragging a colour picker) merge into a single step.
   */
  commit: (layout: Layout, mergeKey?: string) => void;
  undo: () => void;
  redo: () => void;
  setRoomSize: (size: { width?: number; depth?: number; height?: number }) => void;
  resetRoom: () => void;
  resetDesign: () => void;
  addItem: (catalogId: string, near?: [number, number]) => void;
  moveItem: (id: string, x: number, y: number) => void;
  patchItem: (id: string, patch: Partial<Item>, mergeKey?: string) => void;
  rotateSelected: (dir: 1 | -1) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  swapSelected: (catalogId: string) => void;
  resizeSelected: (size: { w?: number; d?: number; h?: number }) => void;
  setFinishes: (patch: Partial<Finishes>) => void;
  setLighting: (patch: Partial<LightingSettings>) => void;
  toProject: (name?: string) => ProjectData;
  loadProject: (data: ProjectData) => void;
  applyPreset: (id: string) => void;
  setCameraMode: (mode: CameraMode) => void;
  set: (patch: Partial<AppState>) => void;
}

const SETTINGS_KEY = 'tourfirm.settings.v1';
const defaults: Settings = {
  lang: 'en', quality: 'balanced', autoQuality: true, eyeHeight: 1.6, walkSpeed: 1.4, collision: true, showFps: false,
  brandName: 'YOUR BRAND', brandTagline: 'Travel', destinations: ['Maldives', 'Turkey', 'Vietnam', 'Egypt', 'China'],
  grid: 0.05, snapWalls: true,
};

function loadSettings(): Settings {
  let saved: Partial<Settings> = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
  } catch { /* storage unavailable: use defaults */ }
  const s = { ...defaults, ...saved };
  if (!Array.isArray(s.destinations) || s.destinations.length !== 5) s.destinations = defaults.destinations;
  // URL overrides (used for testing and for sharing a view): ?quality=high&auto=0&lang=ru
  try {
    const q = new URLSearchParams(location.search);
    const quality = q.get('quality');
    if (quality === 'low' || quality === 'balanced' || quality === 'high') s.quality = quality;
    if (q.get('auto') === '0') s.autoQuality = false;
    const lang = q.get('lang');
    if (lang === 'en' || lang === 'uz' || lang === 'ru') s.lang = lang;
  } catch { /* no location */ }
  return s;
}

let nonce = 0;
const presetById = (layout: Layout, id: string) => cameraPresets(layout).find((p) => p.id === id);
const HISTORY_LIMIT = 100;

export const useStore = create<AppState>()((set, get) => {
  let last: { key: string; time: number } | null = null;
  const commit = (layout: Layout, mergeKey?: string) => {
    const { layout: prev, past } = get();
    if (layout === prev) return;
    const now = Date.now();
    const merge = !!mergeKey && last?.key === mergeKey && now - last.time < 1000 && past.length > 0;
    last = mergeKey ? { key: mergeKey, time: now } : null;
    if (merge) set({ layout, future: [] });
    else set({ layout, past: [...past.slice(-(HISTORY_LIMIT - 1)), prev], future: [] });
  };
  const withSelected = (fn: (id: string, layout: Layout) => Layout | null) => {
    const { selected, layout } = get();
    if (!selected) return;
    const next = fn(selected, layout);
    if (next) commit(next);
  };
  return {
    ...loadSettings(),
    layout: DEFAULT_LAYOUT,
    past: [],
    future: [],
    budget: DEFAULT_BUDGET,
    projectName: 'Concept A',
    cameraMode: 'orbit',
    cameraRequest: { preset: presetById(DEFAULT_LAYOUT, 'overview')!, nonce: ++nonce },
    wallMode: 'cutaway',
    ceilingMode: 'auto',
    showFurniture: true,
    showWallItems: true,
    showZones: false,
    showGrid: false,
    doorOpen: true,
    helpOpen: false,
    panelOpen: typeof window === 'undefined' || window.innerWidth > 900,
    panelTab: 'design',
    hovered: null,
    selected: null,
    dragging: false,
    pointerLocked: false,
    fps: 0,
    qualityNotice: null,
    notice: null,

    commit,
    undo: () => {
      const { past, layout, future, selected } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      set({ layout: prev, past: past.slice(0, -1), future: [layout, ...future], selected: prev.items.some((i) => i.id === selected) ? selected : null });
    },
    redo: () => {
      const { past, layout, future, selected } = get();
      if (!future.length) return;
      const next = future[0];
      set({ layout: next, past: [...past, layout], future: future.slice(1), selected: next.items.some((i) => i.id === selected) ? selected : null });
    },
    setRoomSize: (size) => commit(resizeRoom(get().layout, size)),
    resetRoom: () => commit({ ...get().layout, room: DEFAULT_LAYOUT.room, partitions: DEFAULT_LAYOUT.partitions, zones: DEFAULT_LAYOUT.zones, ceiling: DEFAULT_LAYOUT.ceiling }),
    resetDesign: () => { commit(DEFAULT_LAYOUT); set({ selected: null }); },
    addItem: (catalogId, near) => {
      const entry = catalogById(catalogId);
      if (!entry) return;
      const res = addFromCatalog(get().layout, entry, near);
      commit(res.layout);
      set({ selected: res.id });
    },
    moveItem: (id, x, y) => commit(updateItem(get().layout, id, { x, y }), `move:${id}`),
    patchItem: (id, patch, mergeKey) => commit(updateItem(get().layout, id, patch), mergeKey),
    rotateSelected: (dir) => withSelected((id, L) => {
      const item = L.items.find((i) => i.id === id);
      return item ? updateItem(L, id, rotateItem(item, dir)) : null;
    }),
    duplicateSelected: () => {
      const { selected, layout } = get();
      if (!selected) return;
      const res = duplicateItem(layout, selected);
      if (!res) return;
      commit(res.layout);
      set({ selected: res.id });
    },
    deleteSelected: () => {
      withSelected((id, L) => deleteItem(L, id));
      set({ selected: null, hovered: null });
    },
    swapSelected: (catalogId) => withSelected((id, L) => {
      const entry = catalogById(catalogId);
      return entry ? swapCatalog(L, id, entry) : null;
    }),
    resizeSelected: (size) => {
      const { selected, layout } = get();
      if (selected) commit(resizeItem(layout, selected, size), `size:${selected}`);
    },
    setFinishes: (patch) => {
      const L = get().layout;
      commit({ ...L, finishes: { ...(L.finishes ?? DEFAULT_FINISHES), ...patch } }, `finish:${Object.keys(patch).join()}`);
    },
    setLighting: (patch) => {
      const L = get().layout;
      commit({ ...L, lighting: { ...(L.lighting ?? DEFAULT_LIGHTING), ...patch } }, `light:${Object.keys(patch).join()}`);
    },
    toProject: (name) => {
      const s = get();
      return {
        schema: 'tourfirm.project/1',
        name: name ?? s.projectName,
        savedAt: new Date().toISOString(),
        layout: s.layout,
        brandName: s.brandName,
        brandTagline: s.brandTagline,
        destinations: s.destinations,
        budget: s.budget,
      };
    },
    loadProject: (data) => {
      set({
        layout: data.layout, past: [], future: [], selected: null, hovered: null,
        projectName: data.name, brandName: data.brandName, brandTagline: data.brandTagline,
        destinations: data.destinations, budget: data.budget,
      });
    },
    applyPreset: (id) => {
      const preset = presetById(get().layout, id);
      if (!preset) return;
      const patch: Partial<AppState> = { cameraMode: preset.mode, cameraRequest: { preset, nonce: ++nonce } };
      if (preset.mode === 'walk') patch.eyeHeight = preset.pos[2];
      if (preset.mode === 'dollhouse') patch.wallMode = 'cutaway';
      set(patch);
    },
    setCameraMode: (mode) => {
      const fallback: Record<CameraMode, string> = { orbit: 'overview', dollhouse: 'dollhouse', plan: 'plan', walk: 'entrance' };
      get().applyPreset(fallback[mode]);
    },
    set: (patch) => set(patch),
  };
});

// Persist per-viewer settings in localStorage. Design data is autosaved to IndexedDB (see autosave.ts).
useStore.subscribe((s) => {
  const settings: Settings = {
    lang: s.lang, quality: s.quality, autoQuality: s.autoQuality, eyeHeight: s.eyeHeight,
    walkSpeed: s.walkSpeed, collision: s.collision, showFps: s.showFps,
    brandName: s.brandName, brandTagline: s.brandTagline, destinations: s.destinations,
    grid: s.grid, snapWalls: s.snapWalls,
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
});
