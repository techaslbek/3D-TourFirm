import { pointRectDistance } from './collision';
import { doorLeafRect, partitionSegments } from './geometry';
import { itemRect } from './layout';
import type { Layout, Rect } from './types';

/*
 * Live design checks shown in the editor. These check the model's own geometry (overlaps,
 * clearances, reachability). They are planning aids, NOT a building-code compliance check.
 */

export interface Conflicts {
  overlaps: [string, string][];
  outside: string[];
  partition: string[];
  doorSwing: string[];
  entrance: string[];
  /** Every item involved in any conflict, for highlighting. */
  items: Set<string>;
  count: number;
}

const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.y0 < b.y1 - 1e-6 && b.y0 < a.y1 - 1e-6;

/** Entrance turning circle: Ø1.5 m just inside the door. */
export function entranceCircle(layout: Layout) {
  const d = layout.room.facade.door;
  return { x: (d.x0 + d.x1) / 2, y: 1.6, r: 0.75 };
}

export function findConflicts(layout: Layout): Conflicts {
  const { width: W, depth: D } = layout.room;
  const floor = layout.items.filter((i) => i.layer === 'floor' && !i.hidden);
  const rects = floor.map((i) => ({ id: i.id, r: itemRect(i) }));
  const walls = layout.partitions.flatMap(partitionSegments);
  const out: Conflicts = { overlaps: [], outside: [], partition: [], doorSwing: [], entrance: [], items: new Set(), count: 0 };

  for (const i of layout.items.filter((q) => !q.hidden)) {
    const r = itemRect(i);
    if (r.x0 < -1e-6 || r.y0 < -1e-6 || r.x1 > W + 1e-6 || r.y1 > D + 1e-6) out.outside.push(i.id);
  }
  for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
    if (overlap(rects[a].r, rects[b].r)) out.overlaps.push([rects[a].id, rects[b].id]);
  }
  for (const { id, r } of rects) if (walls.some((w) => overlap(r, w))) out.partition.push(id);

  const door = layout.room.facade.door;
  const swing = door.swing === 'inward' ? { x0: door.x0, x1: door.x1, y0: 0, y1: door.leaf } : null;
  if (swing) for (const { id, r } of rects) if (overlap(r, swing)) out.doorSwing.push(id);
  const c = entranceCircle(layout);
  for (const { id, r } of rects) if (pointRectDistance(c.x, c.y, r) < c.r - 1e-6) out.entrance.push(id);

  for (const id of [...out.outside, ...out.partition, ...out.doorSwing, ...out.entrance]) out.items.add(id);
  for (const [a, b] of out.overlaps) { out.items.add(a); out.items.add(b); }
  out.count = out.overlaps.length + out.outside.length + out.partition.length + out.doorSwing.length + out.entrance.length;
  return out;
}

export interface AccessResult {
  id: string;
  label: string;
  /** Reachable from the entrance by someone needing a 0.9 m wide path. */
  comfortable: boolean;
  /** Reachable with at least 0.6 m (tight, staff only). */
  tight: boolean;
}


/**
 * Checks that every seat, desk and cabinet can be reached from the entrance: a walker needing a
 * 0.9 m (comfortable) or 0.6 m (tight, staff) path must get within arm's reach (30 cm) of it.
 * Grid search (5 cm) with obstacles grown by half the path width. Runs in tens of milliseconds.
 */
export function checkAccess(layout: Layout, doorOpen = true): AccessResult[] {
  const { width: W, depth: D } = layout.room;
  const STEP = 0.05;
  const NX = Math.round(W / STEP), NY = Math.round(D / STEP);
  // Only interior obstacles matter; the door leaf counts when open.
  const solids: Rect[] = [
    ...layout.items.filter((i) => i.layer === 'floor' && !i.hidden && i.h >= 0.3).map(itemRect),
    ...layout.partitions.flatMap(partitionSegments),
    doorLeafRect(layout.room.facade.door, doorOpen),
  ];
  const door = layout.room.facade.door;
  const start: [number, number] = [(door.x0 + door.x1) / 2, 1.6]; // centre of the entrance turning circle

  const reach = (radius: number) => {
    const free = new Uint8Array(NX * NY);
    for (let gy = 0; gy < NY; gy++) for (let gx = 0; gx < NX; gx++) {
      const px = (gx + 0.5) * STEP, py = (gy + 0.5) * STEP;
      if (px < radius || py < radius || px > W - radius || py > D - radius) continue;
      if (solids.some((s) => pointRectDistance(px, py, s) < radius)) continue;
      free[gy * NX + gx] = 1;
    }
    const seen = new Uint8Array(NX * NY);
    const sx = Math.floor(start[0] / STEP), sy = Math.floor(start[1] / STEP);
    if (!free[sy * NX + sx]) return seen;
    const q = [sx, sy];
    seen[sy * NX + sx] = 1;
    for (let h = 0; h < q.length; h += 2) {
      const x = q[h], y = q[h + 1];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
        const k = ny * NX + nx;
        if (seen[k] || !free[k]) continue;
        seen[k] = 1;
        q.push(nx, ny);
      }
    }
    return seen;
  };

  const comfy = reach(0.45);
  const tight = reach(0.3);
  // Reachable = the walker can stand with their body edge within arm's reach (30 cm) of the item.
  const ARM = 0.3;
  const reachable = (seen: Uint8Array, radius: number, r: Rect) => {
    const pad = radius + ARM;
    const gx0 = Math.max(0, Math.floor((r.x0 - pad) / STEP)), gx1 = Math.min(NX - 1, Math.ceil((r.x1 + pad) / STEP));
    const gy0 = Math.max(0, Math.floor((r.y0 - pad) / STEP)), gy1 = Math.min(NY - 1, Math.ceil((r.y1 + pad) / STEP));
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      if (!seen[gy * NX + gx]) continue;
      if (pointRectDistance((gx + 0.5) * STEP, (gy + 0.5) * STEP, r) <= pad) return true;
    }
    return false;
  };
  const targets = layout.items.filter((i) => !!i.faces && i.layer === 'floor' && !i.hidden && i.cat !== 'decor');
  return targets.map((i) => {
    const r = itemRect(i);
    return { id: i.id, label: i.label, comfortable: reachable(comfy, 0.45, r), tight: reachable(tight, 0.3, r) };
  });
}
