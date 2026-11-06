#!/usr/bin/env node
// Geometric validation of a layout JSON file. Plain Node, no dependencies.
// It checks the layout's own geometry: items inside the room, no overlaps,
// door swing and turning circle kept clear, clearances between named pairs,
// and walkable routes from the entrance (grid search with the obstacles grown
// by half the required route width).
// This is a planning aid. It does NOT confirm compliance with any building code.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'data/layouts/concept-a.json';
const L = JSON.parse(readFileSync(file, 'utf8'));
const { width: W, depth: D } = L.room;
const EPS = 1e-6;

const rectOf = (i) => ({ id: i.id, x0: i.x - i.w / 2, x1: i.x + i.w / 2, y0: i.y - i.d / 2, y1: i.y + i.d / 2 });
const overlap = (a, b) => a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.y0 < b.y1 - EPS && b.y0 < a.y1 - EPS;
const rectGap = (a, b) => {
  const dx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1);
  const dy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
  return Math.hypot(dx, dy);
};
const pointRectDist = (px, py, r) => Math.hypot(Math.max(r.x0 - px, 0, px - r.x1), Math.max(r.y0 - py, 0, py - r.y1));

// Partitions become solid rectangles, minus their door openings.
const partitionRects = [];
for (const p of L.partitions ?? []) {
  const horizontal = p.x1 - p.x0 >= p.y1 - p.y0;
  let segs = [[horizontal ? p.x0 : p.y0, horizontal ? p.x1 : p.y1]];
  for (const o of p.openings ?? []) {
    segs = segs.flatMap(([s, e]) => {
      const out = [];
      if (o.x0 > s) out.push([s, Math.min(e, o.x0)]);
      if (o.x1 < e) out.push([Math.max(s, o.x1), e]);
      return out.filter(([a, b]) => b - a > EPS);
    });
  }
  for (const [s, e] of segs) {
    partitionRects.push(horizontal
      ? { id: p.id, x0: s, x1: e, y0: p.y0, y1: p.y1 }
      : { id: p.id, x0: p.x0, x1: p.x1, y0: s, y1: e });
  }
}

const floorItems = L.items.filter((i) => i.layer === 'floor');
const solids = [...floorItems.map(rectOf), ...partitionRects];
const results = [];
const report = (ok, msg) => results.push({ ok, msg });

// 1. Inside room bounds
for (const i of L.items) {
  const r = rectOf(i);
  const inside = r.x0 >= -EPS && r.y0 >= -EPS && r.x1 <= W + EPS && r.y1 <= D + EPS;
  if (!inside) report(false, `${i.id} lies partly outside the ${W}x${D} m room`);
}
report(true, `Bounds checked for ${L.items.length} items`);

// 2. Overlaps between floor items and partitions
let overlaps = 0;
for (let a = 0; a < solids.length; a++)
  for (let b = a + 1; b < solids.length; b++)
    if (solids[a].id !== solids[b].id && overlap(solids[a], solids[b])) {
      overlaps++;
      report(false, `Collision: ${solids[a].id} overlaps ${solids[b].id}`);
    }
if (!overlaps) report(true, `No collisions among ${floorItems.length} floor items and ${partitionRects.length} partition segments`);

// 3. Door swing kept clear (rectangle enclosing the inward arc)
const door = L.room.facade.door;
if (door.swing === 'inward') {
  const sw = { x0: door.x0, x1: door.x1, y0: 0, y1: door.leaf };
  const hits = solids.filter((s) => overlap(s, sw));
  report(!hits.length, hits.length ? `Door swing blocked by ${hits.map((h) => h.id).join(', ')}` : `Main door swing (${door.leaf} m inward) is clear`);
}

// 4. Entry turning circle
const tc = L.checks.entryTurningCircle;
const tcHits = solids.filter((s) => pointRectDist(tc.x, tc.y, s) < tc.r - EPS);
report(!tcHits.length, tcHits.length ? `Turning circle Ø${tc.r * 2} m blocked by ${tcHits.map((h) => h.id).join(', ')}` : `Ø${tc.r * 2} m turning circle inside the entrance is clear`);

// 5. Named pair clearances
const byId = Object.fromEntries(L.items.map((i) => [i.id, rectOf(i)]));
for (const c of L.checks.pairClearances ?? []) {
  const g = rectGap(byId[c.a], byId[c.b]);
  report(g >= c.min - EPS, `${c.label}: ${g.toFixed(2)} m (target ≥ ${c.min} m)`);
}

// 6. Routes: grid search on a 2.5 cm grid, obstacles grown by the route half-width.
const STEP = 0.025;
const NX = Math.round(W / STEP), NY = Math.round(D / STEP);
function reachable(radius, target) {
  const free = (gx, gy) => {
    const px = (gx + 0.5) * STEP, py = (gy + 0.5) * STEP;
    if (px < radius || py < radius || px > W - radius || py > D - radius) return false;
    for (const s of solids) if (pointRectDist(px, py, s) < radius) return false;
    return true;
  };
  const cell = ([x, y]) => [Math.min(NX - 1, Math.floor(x / STEP)), Math.min(NY - 1, Math.floor(y / STEP))];
  const [sx, sy] = cell(L.checks.routeStart);
  const [tx, ty] = cell(target);
  if (!free(sx, sy) || !free(tx, ty)) return false;
  const seen = new Uint8Array(NX * NY);
  const q = [sx, sy]; seen[sy * NX + sx] = 1;
  for (let h = 0; h < q.length; h += 2) {
    const x = q[h], y = q[h + 1];
    if (x === tx && y === ty) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
      const k = ny * NX + nx;
      if (seen[k]) continue;
      seen[k] = 1;
      if (free(nx, ny)) q.push(nx, ny);
    }
  }
  return false;
}
for (const r of L.routes ?? []) {
  const ok = reachable(r.minWidth / 2, r.to);
  // Largest passable width to 5 cm resolution (for information only)
  let best = 0;
  for (let w = 0.5; w <= 2.0 + EPS; w += 0.05) { if (reachable(w / 2, r.to)) best = w; else break; }
  report(ok, `Route "${r.label}": needs ${r.minWidth.toFixed(2)} m, widest passable ≈ ${best.toFixed(2)} m`);
}

// Output
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.msg}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed for "${L.name}" (geometric self-consistency only, not code compliance).`);
process.exit(failed.length ? 1 : 0);
