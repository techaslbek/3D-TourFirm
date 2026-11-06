import * as THREE from 'three';

// Concept A palette (docs/phase-1/concept-a-brief.md §4). Editable materials arrive in Phase 4.
export const PALETTE = {
  ivory: '#f4eee4',
  sand: '#e3d3bb',
  oak: '#b9874f',
  floorOak: '#b98a5a',
  walnut: '#6b4a2f',
  terracotta: '#b85c3c',
  cobalt: '#1f4e8c',
  turquoise: '#2a8c8c',
  saffron: '#e0a43a',
  olive: '#6e7b4e',
  charcoal: '#2f2c2a',
  steel: '#8d9096',
  glass: '#a9cbd8',
};

/** Height of the bottom of the pendant shades above the floor (m). */
export const PENDANT_HEIGHT = 1.75;

export const CATEGORY_COLOR: Record<string, string> = {
  seating: '#d9b48a',
  tables: PALETTE.oak,
  desks: PALETTE.oak,
  storage: '#d8cbb6',
  decor: '#9c6a46',
  plants: PALETTE.olive,
  beverage: '#cfd8d6',
  equipment: '#55585e',
  security: '#4a4d52',
  accessories: '#7a6b5a',
  acoustics: '#7b8fa8',
  lighting: '#e8d9b0',
};

/** Simple text texture for placeholder signage (works offline, uses system fonts). */
export function textTexture(text: string, opts: { bg: string; fg: string; w?: number; h?: number; sub?: string }): THREE.CanvasTexture {
  const w = opts.w ?? 1024, h = opts.h ?? 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = opts.bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = opts.fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `600 ${Math.round(h * (opts.sub ? 0.36 : 0.45))}px "Segoe UI", Inter, Arial, sans-serif`;
  g.fillText(text, w / 2, opts.sub ? h * 0.4 : h / 2, w * 0.92);
  if (opts.sub) {
    g.globalAlpha = 0.8;
    g.font = `400 ${Math.round(h * 0.16)}px "Segoe UI", Inter, Arial, sans-serif`;
    g.fillText(opts.sub, w / 2, h * 0.78, w * 0.92);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
