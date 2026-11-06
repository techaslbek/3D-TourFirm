import type { CatalogEntry } from './catalog';
import { partitionSegments } from './geometry';
import { itemRect } from './layout';
import type { Facing, Item, Layout, Rect } from './types';

/*
 * Pure editing operations. Every function returns a NEW layout (never mutates), which makes
 * undo/redo a matter of keeping previous layouts. Rotation is in 90° steps: footprints stay
 * axis-aligned, so collision checks, the floor plan and walking stay exact.
 */

const round = (v: number, step = 0.005) => Math.round(v / step) * step;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const CLOCKWISE: Record<Facing, Facing> = { '+y': '+x', '+x': '-y', '-y': '-x', '-x': '+y' };
const COUNTER: Record<Facing, Facing> = { '+y': '-x', '-x': '-y', '-y': '+x', '+x': '+y' };

export function rotateItem(item: Item, dir: 1 | -1): Item {
  const faces = (dir === 1 ? CLOCKWISE : COUNTER)[item.faces ?? '+y'];
  return { ...item, faces, w: item.d, d: item.w };
}

export const updateItem = (layout: Layout, id: string, patch: Partial<Item>): Layout => ({
  ...layout,
  items: layout.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
});

export const deleteItem = (layout: Layout, id: string): Layout => ({ ...layout, items: layout.items.filter((i) => i.id !== id) });

export function uniqueId(layout: Layout, base: string): string {
  const ids = new Set(layout.items.map((i) => i.id));
  for (let k = 1; ; k++) {
    const id = `${base}-${k}`;
    if (!ids.has(id)) return id;
  }
}

/** Obstacles an item must not overlap: other visible floor items and partition walls. */
function obstacles(layout: Layout, exceptId?: string): Rect[] {
  return [
    ...layout.items.filter((i) => i.id !== exceptId && i.layer === 'floor' && !i.hidden).map(itemRect),
    ...layout.partitions.flatMap(partitionSegments),
  ];
}

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.y0 < b.y1 - 1e-6 && b.y0 < a.y1 - 1e-6;

/**
 * Snaps a proposed centre position: the item's edges snap to the grid, then to any wall or
 * partition face within `wallSnap` metres, and the item is kept inside the room.
 */
export function snapPosition(layout: Layout, item: Item, x: number, y: number, grid: number, wallSnap = 0.12): [number, number] {
  const { width: W, depth: D } = layout.room;
  const hw = item.w / 2, hd = item.d / 2;
  let x0 = x - hw, y0 = y - hd;
  if (grid > 0) {
    x0 = Math.round(x0 / grid) * grid;
    y0 = Math.round(y0 / grid) * grid;
  }
  if (wallSnap > 0) {
    // Vertical faces (constant x) and horizontal faces (constant y), each with the span they cover.
    const vertical: { x: number; y0: number; y1: number }[] = [{ x: 0, y0: 0, y1: D }, { x: W, y0: 0, y1: D }];
    const horizontal: { y: number; x0: number; x1: number }[] = [{ y: 0, x0: 0, x1: W }, { y: D, x0: 0, x1: W }];
    for (const s of layout.partitions.flatMap(partitionSegments)) {
      vertical.push({ x: s.x0, y0: s.y0, y1: s.y1 }, { x: s.x1, y0: s.y0, y1: s.y1 });
      horizontal.push({ y: s.y0, x0: s.x0, x1: s.x1 }, { y: s.y1, x0: s.x0, x1: s.x1 });
    }
    let best = wallSnap, dx = 0;
    for (const v of vertical) {
      if (v.y1 < y0 || v.y0 > y0 + item.d) continue;
      for (const edge of [x0, x0 + item.w]) {
        const d = v.x - edge;
        if (Math.abs(d) < best) { best = Math.abs(d); dx = d; }
      }
    }
    x0 += dx;
    best = wallSnap;
    let dy = 0;
    for (const h of horizontal) {
      if (h.x1 < x0 || h.x0 > x0 + item.w) continue;
      for (const edge of [y0, y0 + item.d]) {
        const d = h.y - edge;
        if (Math.abs(d) < best) { best = Math.abs(d); dy = d; }
      }
    }
    y0 += dy;
  }
  x0 = Math.min(Math.max(x0, 0), Math.max(0, W - item.w));
  y0 = Math.min(Math.max(y0, 0), Math.max(0, D - item.d));
  return [r3(x0 + hw), r3(y0 + hd)];
}

/** Nearest free spot (spiral search on a 10 cm grid) for an item of the given footprint. */
export function findFreeSpot(layout: Layout, w: number, d: number, start: [number, number], exceptId?: string): [number, number] {
  const { width: W, depth: D } = layout.room;
  const obs = obstacles(layout, exceptId);
  const fits = (x: number, y: number) => {
    const r = { x0: x - w / 2, x1: x + w / 2, y0: y - d / 2, y1: y + d / 2 };
    if (r.x0 < 0 || r.y0 < 0 || r.x1 > W || r.y1 > D) return false;
    return !obs.some((o) => overlaps(r, o));
  };
  const step = 0.1;
  for (let ring = 0; ring < 120; ring++) {
    for (let i = -ring; i <= ring; i++) for (let j = -ring; j <= ring; j++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
      const x = round(start[0] + i * step), y = round(start[1] + j * step);
      if (fits(x, y)) return [r3(x), r3(y)];
    }
  }
  return start;
}

/** Creates a new item from a catalogue entry at a free spot near `near` (default: room centre). */
export function addFromCatalog(layout: Layout, entry: CatalogEntry, near?: [number, number]): { layout: Layout; id: string } {
  const id = uniqueId(layout, entry.id);
  const start = near ?? [layout.room.width / 2, layout.room.depth / 2];
  const [x, y] = entry.layer === 'rug' ? start : findFreeSpot(layout, entry.W, entry.D, start);
  const item: Item = {
    id, label: entry.label, cat: entry.cat, layer: entry.layer ?? 'floor', catalogId: entry.id,
    x, y, w: entry.W, d: entry.D, h: entry.H,
    ...(entry.faces ? { faces: entry.faces } : {}),
    ...(entry.shape ? { shape: entry.shape } : {}),
  };
  return { layout: { ...layout, items: [...layout.items, item] }, id };
}

export function duplicateItem(layout: Layout, id: string): { layout: Layout; id: string } | null {
  const src = layout.items.find((i) => i.id === id);
  if (!src) return null;
  const base = src.catalogId ?? src.id.replace(/-\d+$/, '');
  const newId = uniqueId(layout, base);
  const [x, y] = src.layer === 'floor' ? findFreeSpot(layout, src.w, src.d, [src.x + src.w / 2 + 0.3, src.y]) : [src.x + 0.3, src.y];
  return { layout: { ...layout, items: [...layout.items, { ...src, id: newId, x, y }] }, id: newId };
}

/** Swaps an item to another catalogue entry, keeping its centre and facing. */
export function swapCatalog(layout: Layout, id: string, entry: CatalogEntry): Layout {
  const item = layout.items.find((i) => i.id === id);
  if (!item) return layout;
  const sideways = item.faces === '+x' || item.faces === '-x';
  const next: Item = {
    ...item, catalogId: entry.id, label: entry.label, cat: entry.cat,
    w: sideways ? entry.D : entry.W, d: sideways ? entry.W : entry.D, h: entry.H,
    ...(entry.shape ? { shape: entry.shape } : { shape: undefined }),
  };
  return updateItem(layout, id, next);
}

/** Resizes an item about its centre (sizes in metres, minimum 5 cm). */
export function resizeItem(layout: Layout, id: string, size: { w?: number; d?: number; h?: number }): Layout {
  const clean = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? undefined : Math.max(0.05, r3(v)));
  const patch: Partial<Item> = {};
  const w = clean(size.w), d = clean(size.d), h = clean(size.h);
  if (w !== undefined) patch.w = w;
  if (d !== undefined) patch.d = d;
  if (h !== undefined) patch.h = h;
  return updateItem(layout, id, patch);
}
