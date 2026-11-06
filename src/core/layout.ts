import conceptA from '../../data/layouts/concept-a.json';
import { DOOR_HEIGHT, doorLeafRect, exteriorWalls, partitionSegments, wallPieces, wallSpanRect, WALL_THICKNESS } from './geometry';
import type { Item, Layout, Rect, WindowSpec } from './types';
import { isCeilingRect } from './types';

export const DEFAULT_LAYOUT = conceptA as unknown as Layout;

export const ROOM_LIMITS = {
  width: { min: 5, max: 16, step: 0.05 },
  depth: { min: 4, max: 12, step: 0.05 },
  height: { min: 2.5, max: 4.5, step: 0.05 },
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Returns a new layout with changed room dimensions. Dependent geometry is rebuilt safely:
 * the entrance keeps its position (clamped), facade windows are re-derived around it,
 * partitions, zones and ceiling elements are clipped to the room. Furniture is never moved:
 * items that end up outside are reported by itemsOutsideRoom() instead.
 */
export function resizeRoom(layout: Layout, size: { width?: number; depth?: number; height?: number }): Layout {
  const W = round(clamp(size.width ?? layout.room.width, ROOM_LIMITS.width.min, ROOM_LIMITS.width.max));
  const D = round(clamp(size.depth ?? layout.room.depth, ROOM_LIMITS.depth.min, ROOM_LIMITS.depth.max));
  const H = round(clamp(size.height ?? layout.room.ceilingHeight, ROOM_LIMITS.height.min, ROOM_LIMITS.height.max));

  const door = { ...layout.room.facade.door };
  const doorW = door.x1 - door.x0;
  const margin = 0.3, mullion = 0.1;
  door.x0 = round(clamp(door.x0, margin + mullion, W - margin - mullion - doorW));
  door.x1 = round(door.x0 + doorW);

  const proto = layout.room.facade.windows[0] ?? { sill: 0.3, head: 2.6 };
  const head = Math.min(proto.head, H - 0.25);
  const windows: WindowSpec[] = [];
  const left: [number, number] = [margin, door.x0 - mullion];
  const right: [number, number] = [door.x1 + mullion, W - margin];
  if (left[1] - left[0] >= 0.4) windows.push({ id: 'win-left', x0: round(left[0]), x1: round(left[1]), sill: proto.sill, head });
  if (right[1] - right[0] >= 0.4) windows.push({ id: 'win-right', x0: round(right[0]), x1: round(right[1]), sill: proto.sill, head });

  const clipX = (v: number) => clamp(v, 0, W);
  const clipY = (v: number) => clamp(v, 0, D);
  const partitions = layout.partitions
    .map((p) => ({ ...p, x0: clipX(p.x0), x1: clipX(p.x1), y0: clipY(p.y0), y1: clipY(p.y1) }))
    .filter((p) => p.x1 - p.x0 > 0.05 || p.y1 - p.y0 > 0.05)
    .filter((p) => p.x1 - p.x0 > 0.01 && p.y1 - p.y0 > 0.01);
  const zones = layout.zones
    .map((z) => ({ ...z, x0: clipX(z.x0), x1: clipX(z.x1), y0: clipY(z.y0), y1: clipY(z.y1) }))
    .filter((z) => z.x1 - z.x0 > 0.2 && z.y1 - z.y0 > 0.2);
  const ceiling = layout.ceiling
    .map((c) => (isCeilingRect(c) ? { ...c, x0: clipX(c.x0), x1: clipX(c.x1), y0: clipY(c.y0), y1: clipY(c.y1) } : c))
    .filter((c) => (isCeilingRect(c) ? c.x1 - c.x0 > 0.2 && c.y1 - c.y0 > 0.2 : c.x <= W && c.y <= D));

  return {
    ...layout,
    room: { ...layout.room, width: W, depth: D, ceilingHeight: H, facade: { ...layout.room.facade, door, windows } },
    partitions,
    zones,
    ceiling,
  };
}

export const itemRect = (i: Pick<Item, 'x' | 'y' | 'w' | 'd'>): Rect => ({ x0: i.x - i.w / 2, x1: i.x + i.w / 2, y0: i.y - i.d / 2, y1: i.y + i.d / 2 });

export function itemsOutsideRoom(layout: Layout): string[] {
  const { width: W, depth: D } = layout.room;
  return layout.items
    .filter((i) => {
      const r = itemRect(i);
      return r.x0 < -1e-6 || r.y0 < -1e-6 || r.x1 > W + 1e-6 || r.y1 > D + 1e-6;
    })
    .map((i) => i.id);
}

/** Minimum furniture height that blocks walking (rugs and very low items are walkable). */
const BLOCKING_HEIGHT = 0.3;

/** All 2D obstacles for first-person walking. */
export function walkColliders(layout: Layout, doorOpen: boolean): Rect[] {
  const rects: Rect[] = [];
  for (const wall of exteriorWalls(layout.room)) {
    // Glazing blocks walking, so only the door counts as an opening for collision.
    const doors = wall.openings.filter((o) => o.kind === 'door').map((o) => ({ ...o, v0: 0, v1: DOOR_HEIGHT }));
    for (const p of wallPieces(wall.u0, wall.u1, 1, doors.map((d) => ({ ...d, v1: 1 })))) {
      if (p.v0 === 0) rects.push(wallSpanRect(wall, p.u0, p.u1));
    }
  }
  for (const p of layout.partitions) rects.push(...partitionSegments(p));
  for (const i of layout.items) if (i.layer === 'floor' && !i.hidden && i.h >= BLOCKING_HEIGHT) rects.push(itemRect(i));
  rects.push(doorLeafRect(layout.room.facade.door, doorOpen));
  return rects;
}

/** Area the walking camera may occupy: the room plus a strip of pavement in front of it. */
export function walkBounds(layout: Layout): Rect {
  const T = WALL_THICKNESS;
  return { x0: -T - 3, x1: layout.room.width + T + 3, y0: -6, y1: layout.room.depth };
}
