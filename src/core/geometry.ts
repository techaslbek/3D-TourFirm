import type { DoorSpec, Partition, Rect, Room } from './types';

export const WALL_THICKNESS = 0.2;
export const DOOR_HEIGHT = 2.1;
export const PARTITION_DOOR_HEIGHT = 2.1;

/** Layout (x, y) plus height to a Three.js position. */
export const toThree = (x: number, y: number, h = 0): [number, number, number] => [x, h, -y];

/** A rectangle in wall space: u along the wall, v = height above the floor. */
export interface WallRect { u0: number; u1: number; v0: number; v1: number }

/**
 * Splits a wall of the given length and height into solid pieces around rectangular openings.
 * Openings may not overlap. Each opening yields an optional piece below (sill) and above (head).
 */
export function wallPieces(u0: number, u1: number, height: number, openings: WallRect[]): WallRect[] {
  const sorted = [...openings]
    .map((o) => ({ ...o, u0: Math.max(o.u0, u0), u1: Math.min(o.u1, u1), v0: Math.max(0, o.v0), v1: Math.min(height, o.v1) }))
    .filter((o) => o.u1 > o.u0 + 1e-6 && o.v1 > o.v0 + 1e-6)
    .sort((a, b) => a.u0 - b.u0);
  const out: WallRect[] = [];
  let cur = u0;
  for (const o of sorted) {
    if (o.u0 > cur + 1e-6) out.push({ u0: cur, u1: o.u0, v0: 0, v1: height });
    if (o.v0 > 1e-6) out.push({ u0: o.u0, u1: o.u1, v0: 0, v1: o.v0 });
    if (o.v1 < height - 1e-6) out.push({ u0: o.u0, u1: o.u1, v0: o.v1, v1: height });
    cur = Math.max(cur, o.u1);
  }
  if (u1 > cur + 1e-6) out.push({ u0: cur, u1, v0: 0, v1: height });
  return out;
}

export type ExteriorWallId = 'front' | 'back' | 'left' | 'right';

export interface ExteriorWall {
  id: ExteriorWallId;
  /** Layout point where u = 0 on the interior face line. */
  origin: [number, number];
  /** Unit direction of increasing u, in layout coordinates. */
  dir: [number, number];
  /** Outward unit normal, in layout coordinates. */
  normal: [number, number];
  /** u range covered by the wall (front/back walls extend over the corners). */
  u0: number;
  u1: number;
  openings: (WallRect & { kind: 'window' | 'door'; id: string })[];
}

export function exteriorWalls(room: Room): ExteriorWall[] {
  const { width: W, depth: D } = room;
  const T = WALL_THICKNESS;
  const facadeOpenings: ExteriorWall['openings'] = [
    ...room.facade.windows.map((w) => ({ id: w.id, kind: 'window' as const, u0: w.x0, u1: w.x1, v0: w.sill, v1: w.head })),
    { id: room.facade.door.id, kind: 'door' as const, u0: room.facade.door.x0, u1: room.facade.door.x1, v0: 0, v1: DOOR_HEIGHT },
  ];
  return [
    { id: 'front', origin: [0, 0], dir: [1, 0], normal: [0, -1], u0: -T, u1: W + T, openings: facadeOpenings },
    { id: 'back', origin: [0, D], dir: [1, 0], normal: [0, 1], u0: -T, u1: W + T, openings: [] },
    { id: 'left', origin: [0, 0], dir: [0, 1], normal: [-1, 0], u0: 0, u1: D, openings: [] },
    { id: 'right', origin: [W, 0], dir: [0, 1], normal: [1, 0], u0: 0, u1: D, openings: [] },
  ];
}

/** Footprint (layout rect) of a wall-space span, thickened outward from the interior face. */
export function wallSpanRect(wall: ExteriorWall, u0: number, u1: number): Rect {
  const T = WALL_THICKNESS;
  const [ox, oy] = wall.origin;
  const [dx, dy] = wall.dir;
  const [nx, ny] = wall.normal;
  const xs = [ox + dx * u0, ox + dx * u1, ox + dx * u0 + nx * T, ox + dx * u1 + nx * T];
  const ys = [oy + dy * u0, oy + dy * u1, oy + dy * u0 + ny * T, oy + dy * u1 + ny * T];
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Solid wall segments of a partition (layout rects), with its openings removed. */
export function partitionSegments(p: Partition): Rect[] {
  const horizontal = p.x1 - p.x0 >= p.y1 - p.y0;
  const a0 = horizontal ? p.x0 : p.y0;
  const a1 = horizontal ? p.x1 : p.y1;
  const pieces = wallPieces(a0, a1, 1, p.openings.map((o) => ({ u0: o.x0, u1: o.x1, v0: 0, v1: 1 })));
  return pieces
    .filter((s) => s.v0 === 0 && s.v1 === 1)
    .map((s) => (horizontal ? { x0: s.u0, x1: s.u1, y0: p.y0, y1: p.y1 } : { x0: p.x0, x1: p.x1, y0: s.u0, y1: s.u1 }));
}

/** The door leaf footprint for collision, closed or open (inward swing only for now). */
export function doorLeafRect(door: DoorSpec, open: boolean): Rect {
  const t = 0.05;
  if (!open) return { x0: door.x0, x1: door.x1, y0: -t, y1: 0 };
  const hx = door.hinge === 'right' ? door.x1 : door.x0;
  const sign = door.swing === 'inward' ? 1 : -1;
  const ya = 0, yb = sign * door.leaf;
  return door.hinge === 'right'
    ? { x0: hx - t, x1: hx, y0: Math.min(ya, yb), y1: Math.max(ya, yb) }
    : { x0: hx, x1: hx + t, y0: Math.min(ya, yb), y1: Math.max(ya, yb) };
}
