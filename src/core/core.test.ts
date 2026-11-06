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

describe('furniture models', () => {
  it('maps every item in the default layout to a dedicated model', async () => {
    const { modelKind } = await import('./furniture');
    const generic = DEFAULT_LAYOUT.items.filter((i) => modelKind(i) === 'generic').map((i) => i.id);
    expect(generic).toEqual([]);
  });

  it('swaps local width and depth for items facing sideways', async () => {
    const { localFrame } = await import('./furniture');
    expect(localFrame({ w: 0.4, d: 1.2, faces: '-x' })).toEqual({ rotY: Math.PI / 2, W: 1.2, D: 0.4 });
    expect(localFrame({ w: 1.4, d: 0.7, faces: '-y' })).toEqual({ rotY: Math.PI, W: 1.4, D: 0.7 });
    expect(localFrame({ w: 2, d: 0.9, faces: '+y' })).toEqual({ rotY: 0, W: 2, D: 0.9 });
  });

  it('puts the front of a +x facing model towards +x in three.js space', async () => {
    const { localFrame } = await import('./furniture');
    const { rotY } = localFrame({ w: 0.8, d: 0.8, faces: '+x' });
    // Local front is -Z; rotating about Y by rotY gives x' = -sin(rotY)
    expect(-Math.sin(rotY)).toBeCloseTo(1);
  });
});

describe('editor operations', () => {
  it('rotates in 90° steps, swapping the footprint, and returns after four turns', async () => {
    const { rotateItem } = await import('./edit');
    const sofa = DEFAULT_LAYOUT.items.find((i) => i.id === 'sofa')!;
    const once = rotateItem(sofa, 1);
    expect(once.faces).toBe('+x');
    expect([once.w, once.d]).toEqual([sofa.d, sofa.w]);
    const four = [1, 1, 1].reduce((it) => rotateItem(it, 1), once);
    expect(four.faces).toBe(sofa.faces);
    expect([four.w, four.d]).toEqual([sofa.w, sofa.d]);
  });

  it('snaps edges to the grid and to nearby walls, and keeps items inside the room', async () => {
    const { snapPosition } = await import('./edit');
    const desk = DEFAULT_LAYOUT.items.find((i) => i.id === 'desk-2')!;
    // 6 cm from the right wall: wall snap pulls it flush
    const [x] = snapPosition(DEFAULT_LAYOUT, desk, 10 - desk.w / 2 - 0.06, 4.05, 0.05);
    expect(x + desk.w / 2).toBeCloseTo(10, 3);
    // Far outside: clamped inside
    const [cx, cy] = snapPosition(DEFAULT_LAYOUT, desk, 50, -5, 0.05);
    expect(cx + desk.w / 2).toBeLessThanOrEqual(10.0001);
    expect(cy - desk.d / 2).toBeGreaterThanOrEqual(-0.0001);
  });

  it('adds catalogue items at a free spot and duplicates without overlap', async () => {
    const { addFromCatalog, duplicateItem } = await import('./edit');
    const { catalogById } = await import('./catalog');
    const { findConflicts } = await import('./validate');
    const added = addFromCatalog(DEFAULT_LAYOUT, catalogById('armchair')!);
    expect(added.layout.items).toHaveLength(DEFAULT_LAYOUT.items.length + 1);
    expect(findConflicts(added.layout).count).toBe(0);
    const dup = duplicateItem(added.layout, 'desk-1')!;
    expect(dup.id).not.toBe('desk-1');
    expect(findConflicts(dup.layout).count).toBe(0);
  });

  it('swaps a desk for a wider model keeping its centre', async () => {
    const { swapCatalog } = await import('./edit');
    const { catalogById } = await import('./catalog');
    const L = swapCatalog(DEFAULT_LAYOUT, 'desk-1', catalogById('desk-160')!);
    const d = L.items.find((i) => i.id === 'desk-1')!;
    expect([d.x, d.y, d.w, d.d]).toEqual([6.3, 4.05, 1.6, 0.8]);
  });
});

describe('live checks', () => {
  it('finds no conflicts in the approved layout', async () => {
    const { findConflicts } = await import('./validate');
    expect(findConflicts(DEFAULT_LAYOUT).count).toBe(0);
  });

  it('flags overlaps, blocked door swing and entrance circle', async () => {
    const { findConflicts } = await import('./validate');
    const { updateItem } = await import('./edit');
    const L = updateItem(DEFAULT_LAYOUT, 'armchair-r', { x: 5.0, y: 0.6 });
    const c = findConflicts(L);
    expect(c.doorSwing).toContain('armchair-r');
    expect(c.entrance).toContain('armchair-r');
    const L2 = updateItem(DEFAULT_LAYOUT, 'visitor-1a', { x: 6.3, y: 4.05 });
    expect(findConflicts(L2).overlaps).toContainEqual(['desk-1', 'visitor-1a']);
  });

  it('can reach every seat, desk and cabinet from the entrance in the approved layout', async () => {
    const { checkAccess } = await import('./validate');
    const res = checkAccess(DEFAULT_LAYOUT);
    expect(res.length).toBeGreaterThan(15);
    expect(res.filter((r) => !r.tight).map((r) => r.id)).toEqual([]);
  });
});

describe('budget and project files', () => {
  it('counts furniture from the layout and totals with contingency', async () => {
    const { computeBudget, DEFAULT_BUDGET } = await import('./budget');
    const b = computeBudget(DEFAULT_LAYOUT, DEFAULT_BUDGET);
    const visitor = b.lines.find((l) => l.catalogId === 'visitor-chair')!;
    expect(visitor.qty).toBe(4);
    expect(b.totalUsd).toBeCloseTo(b.subtotalUsd * 1.1, 6);
    expect(b.verifiedShare).toBe(0);
  });

  it('round-trips a project through JSON and rejects bad files with a clear message', async () => {
    const { parseProject } = await import('./project');
    const { DEFAULT_BUDGET } = await import('./budget');
    const data = { schema: 'tourfirm.project/1', name: 'Test', savedAt: '2026-11-06T00:00:00Z', layout: DEFAULT_LAYOUT, brandName: 'B', brandTagline: 'T', destinations: ['a', 'b', 'c', 'd', 'e'], budget: DEFAULT_BUDGET };
    const back = parseProject(JSON.parse(JSON.stringify(data)));
    expect(back.layout.items).toHaveLength(DEFAULT_LAYOUT.items.length);
    expect(back.name).toBe('Test');
    expect(() => parseProject({ hello: 1 })).toThrow(/not an Office Sandbox project/);
    expect(() => parseProject({ ...data, layout: { ...DEFAULT_LAYOUT, items: [{ id: 'x' }] } })).toThrow(/item 1/);
  });
});

describe('floor plan export', () => {
  it('draws every visible floor item, numbered, with the room dimensions', async () => {
    const { renderPlanSvg } = await import('./planSvg');
    const svg = renderPlanSvg(DEFAULT_LAYOUT, { title: 'Test <plan>' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Test &lt;plan&gt;');
    expect(svg).toContain('10.00 m (interior, assumed)');
    const floor = DEFAULT_LAYOUT.items.filter((i) => i.layer !== 'rug').length;
    expect(svg).toContain(`>${floor}</text>`);
  });

  it('leaves hidden items out and grows the sheet for long legends', async () => {
    const { renderPlanSvg } = await import('./planSvg');
    const { updateItem } = await import('./edit');
    const L = updateItem(DEFAULT_LAYOUT, 'sofa', { hidden: true });
    expect(renderPlanSvg(L)).not.toContain('3-seat sofa');
    const many = { ...DEFAULT_LAYOUT, items: [...DEFAULT_LAYOUT.items, ...DEFAULT_LAYOUT.items.map((i) => ({ ...i, id: `${i.id}-copy` }))] };
    const h = Number(renderPlanSvg(many).match(/height="(\d+)"/)![1]);
    expect(h).toBeGreaterThan(750);
  });
});
