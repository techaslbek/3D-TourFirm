import { create } from 'zustand';
import { DEFAULT_LAYOUT, resizeRoom } from '../core/layout';
import { cameraPresets, type CameraMode, type CameraPreset } from '../core/presets';
import type { Layout } from '../core/types';
import type { Lang } from '../ui/i18n';

export type WallMode = 'cutaway' | 'solid' | 'transparent' | 'hidden';
export type Quality = 'low' | 'balanced' | 'high';
export type CeilingMode = 'auto' | 'on' | 'off';

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
}

export interface AppState extends Settings {
  layout: Layout;
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
  hovered: string | null;
  inspected: string | null;
  pointerLocked: boolean;
  fps: number;
  qualityNotice: string | null;

  setRoomSize: (size: { width?: number; depth?: number; height?: number }) => void;
  resetRoom: () => void;
  applyPreset: (id: string) => void;
  setCameraMode: (mode: CameraMode) => void;
  set: (patch: Partial<AppState>) => void;
}

const SETTINGS_KEY = 'tourfirm.settings.v1';
const defaults: Settings = { lang: 'en', quality: 'balanced', autoQuality: true, eyeHeight: 1.6, walkSpeed: 1.4, collision: true, showFps: false,
  brandName: 'YOUR BRAND', brandTagline: 'Travel', destinations: ['Maldives', 'Turkey', 'Vietnam', 'Egypt', 'China'] };

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

export const useStore = create<AppState>()((set, get) => ({
  ...loadSettings(),
  layout: DEFAULT_LAYOUT,
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
  hovered: null,
  inspected: null,
  pointerLocked: false,
  fps: 0,
  qualityNotice: null,

  setRoomSize: (size) => set({ layout: resizeRoom(get().layout, size) }),
  resetRoom: () => set({ layout: DEFAULT_LAYOUT }),
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
}));

// Persist per-viewer settings only. Project data persistence arrives in Phase 4.
useStore.subscribe((s) => {
  const settings: Settings = {
    lang: s.lang, quality: s.quality, autoQuality: s.autoQuality, eyeHeight: s.eyeHeight,
    walkSpeed: s.walkSpeed, collision: s.collision, showFps: s.showFps,
    brandName: s.brandName, brandTagline: s.brandTagline, destinations: s.destinations,
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
});
