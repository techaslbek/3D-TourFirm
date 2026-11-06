import { describe, expect, it } from 'vitest';
import { moveWithCollision, pointRectDistance, resolveCircle } from './collision';
import { doorLeafRect, exteriorWalls, partitionSegments, wallPieces } from './geometry';
import { DEFAULT_LAYOUT, itemsOutsideRoom, resizeRoom, walkBounds, walkColliders } from './layout';
import { cameraPresets } from './presets';

const area = (rs: { u0: number; u1: number; v0: number; v1: number }[]) => rs.reduce((s, r) => s + (r.u1 - r.u0) * (r.v1 - r.v0), 0);

describe('wallPieces', () => {
  it('returns the full wall when there are no openings', () => {
    expect(wallPieces(0, 10, 3, [])).toEqual([{ u0: 0, u1: 10, v0: 0, v1: 3 }]);
  });

  it('leaves exactly the opening areas empty', () => {
    const openings = [
      { u0: 0.3, u1: 4.4, v0: 0.3, v1: 2.6 },
      { u0: 4.5, u1: 5.5, v0: 0, v1: 2.1 },
    ];
    const pieces = wallPieces(0, 10, 3, openings);
    const openArea = 4.1 * 2.3 + 1.0 * 2.1;
    expect(area(pieces)).toBeCloseTo(30 - openArea, 6);
    // No piece intersects an opening
    for (const p of pieces) for (const o of openings) {
      const overlap = p.u0 < o.u1 - 1e-9 && o.u0 < p.u1 - 1e-9 && p.v0 < o.v1 - 1e-9 && o.v0 < p.v1 - 1e-9;
      expect(overlap).toBe(false);
    }
  });

  it('clips openings that extend past the wall', () => {
    const pieces = wallPieces(0, 2, 3, [{ u0: 1.5, u1: 5, v0: 0, v1: 2 }]);
    expect(area(pieces)).toBeCloseTo(6 - 0.5 * 2, 6);
  });
});

describe('exterior walls and partitions', () => {
  it('builds four walls with the facade openings on the front', () => {
    const walls = exteriorWalls(DEFAULT_LAYOUT.room);
    expect(walls.map((w) => w.id)).toEqual(['front', 'back', 'left', 'right']);
    const front = walls[0];
    expect(front.openings.filter((o) => o.kind === 'window')).toHaveLength(2);
    expect(front.openings.filter((o) => o.kind === 'door')).toHaveLength(1);
  });

  it('removes the sliding door opening from the storage partition', () => {
    const p = DEFAULT_LAYOUT.partitions.find((q) => q.id === 'part-storage-front')!;
    const segs = partitionSegments(p);
    expect(segs).toHaveLength(2);
    expect(segs[0].x1).toBeCloseTo(1.3);
    expect(segs[1].x0).toBeCloseTo(2.1);
  });

  it('places the open inward door leaf inside the room along the hinge side', () => {
    const r = doorLeafRect(DEFAULT_LAYOUT.room.facade.door, true);
    expect(r.x1).toBeCloseTo(5.5);
    expect(r.y0).toBeCloseTo(0);
    expect(r.y1).toBeCloseTo(1.0);
  });
});

describe('collision', () => {
  const wall = { x0: 0, x1: 10, y0: 6, y1: 6.2 };

  it('measures point to rectangle distance', () => {
    expect(pointRectDistance(5, 5, wall)).toBeCloseTo(1);
    expect(pointRectDistance(5, 6.1, wall)).toBe(0);
  });

  it('stops a walker at its radius in front of a wall', () => {
    const [, y] = moveWithCollision(5, 5, 0, 3, 0.25, [wall]);
    expect(y).toBeCloseTo(5.75, 3);
  });

  it('slides along a wall when moving diagonally', () => {
    const [x, y] = moveWithCollision(5, 5.5, 1, 1, 0.25, [wall]);
    expect(x).toBeCloseTo(6, 3);
    expect(y).toBeCloseTo(5.75, 3);
  });

  it('cannot tunnel through a thin closed door in one large step', () => {
    const door = { x0: 4.5, x1: 5.5, y0: -0.05, y1: 0 };
    const [, y] = moveWithCollision(5, -1, 0, 3, 0.25, [door]);
    expect(y).toBeLessThan(-0.24);
  });

  it('pushes a centre that starts inside a rectangle out of the nearest side', () => {
    const [x, y] = resolveCircle(0.05, 3, 0.25, [{ x0: 0, x1: 1, y0: 0, y1: 6 }]);
    expect(x).toBeCloseTo(-0.25);
    expect(y).toBe(3);
  });
});

describe('walking through the default layout', () => {
  const walk = (doorOpen: boolean) => {
    const L = DEFAULT_LAYOUT;
    const rects = walkColliders(L, doorOpen);
    const dc = (L.room.facade.door.x0 + L.room.facade.door.x1) / 2;
    return moveWithCollision(dc, -3, 0, 12, 0.25, rects, walkBounds(L));
  };

  it('enters through the open door and stops at the back wall', () => {
    const [x, y] = walk(true);
    expect(x).toBeCloseTo(5, 1);
    expect(y).toBeCloseTo(DEFAULT_LAYOUT.room.depth - 0.25, 2);
  });

  it('is blocked outside by the closed door', () => {
    const [, y] = walk(false);
    expect(y).toBeLessThan(-0.24);
  });
});

describe('resizeRoom', () => {
  it('rebuilds the facade around the entrance and keeps windows inside the wall', () => {
    const L = resizeRoom(DEFAULT_LAYOUT, { width: 7 });
    const { door, windows } = L.room.facade;
    expect(door.x1 - door.x0).toBeCloseTo(1.0);
    for (const w of windows) {
      expect(w.x0).toBeGreaterThanOrEqual(0);
      expect(w.x1).toBeLessThanOrEqual(7);
      expect(w.x1 <= door.x0 || w.x0 >= door.x1).toBe(true);
    }
  });

  it('never moves furniture but reports items outside the smaller room', () => {
    const L = resizeRoom(DEFAULT_LAYOUT, { width: 8, depth: 5 });
    expect(L.items).toBe(DEFAULT_LAYOUT.items);
    const outside = itemsOutsideRoom(L);
    expect(outside).toContain('desk-2');
    expect(outside).toContain('credenza-1');
    expect(outside).not.toContain('sofa');
  });

  it('clamps dimensions to the supported range and clips partitions', () => {
    const L = resizeRoom(DEFAULT_LAYOUT, { width: 100, depth: 4.5, height: 1 });
    expect(L.room.width).toBe(16);
    expect(L.room.ceilingHeight).toBe(2.5);
    for (const p of L.partitions) expect(p.y1).toBeLessThanOrEqual(4.5);
    for (const w of L.room.facade.windows) expect(w.head).toBeLessThanOrEqual(2.25);
  });

  it('reports no items outside the default room', () => {
    expect(itemsOutsideRoom(DEFAULT_LAYOUT)).toEqual([]);
  });
});

describe('camera presets', () => {
  it('defines every walk preset inside the walkable bounds', () => {
    const b = walkBounds(DEFAULT_LAYOUT);
    for (const p of cameraPresets(DEFAULT_LAYOUT).filter((q) => q.mode === 'walk')) {
      expect(p.pos[0]).toBeGreaterThanOrEqual(b.x0);
      expect(p.pos[0]).toBeLessThanOrEqual(b.x1);
      expect(p.pos[1]).toBeGreaterThanOrEqual(b.y0);
      expect(p.pos[1]).toBeLessThanOrEqual(b.y1);
    }
  });
});
