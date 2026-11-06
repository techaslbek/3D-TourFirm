import type { Rect } from './types';

/** Distance from a point to the closest point of an axis-aligned rectangle (0 when inside). */
export function pointRectDistance(px: number, py: number, r: Rect): number {
  const dx = Math.max(r.x0 - px, 0, px - r.x1);
  const dy = Math.max(r.y0 - py, 0, py - r.y1);
  return Math.hypot(dx, dy);
}

/**
 * Pushes a circle out of every rectangle it penetrates. A few relaxation passes
 * make corners between neighbouring rectangles stable.
 */
export function resolveCircle(px: number, py: number, radius: number, rects: Rect[], passes = 4): [number, number] {
  let x = px, y = py;
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (const r of rects) {
      const cx = Math.min(Math.max(x, r.x0), r.x1);
      const cy = Math.min(Math.max(y, r.y0), r.y1);
      const dx = x - cx, dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist >= radius) continue;
      moved = true;
      if (dist > 1e-9) {
        const push = radius - dist;
        x += (dx / dist) * push;
        y += (dy / dist) * push;
      } else {
        // Centre is inside the rectangle: leave by the nearest side.
        const exits = [
          [x - r.x0 + radius, -1, 0],
          [r.x1 - x + radius, 1, 0],
          [y - r.y0 + radius, 0, -1],
          [r.y1 - y + radius, 0, 1],
        ].sort((a, b) => a[0] - b[0]);
        const [d, ex, ey] = exits[0];
        x += ex * d;
        y += ey * d;
      }
    }
    if (!moved) break;
  }
  return [x, y];
}

/**
 * Moves a circle by (dx, dy) in small sub-steps so it cannot tunnel through thin walls,
 * sliding along surfaces it touches. Bounds, when given, clamp the centre.
 */
export function moveWithCollision(
  x: number, y: number, dx: number, dy: number, radius: number, rects: Rect[], bounds?: Rect, maxStep = 0.05,
): [number, number] {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / maxStep));
  let px = x, py = y;
  for (let i = 0; i < steps; i++) {
    px += dx / steps;
    py += dy / steps;
    [px, py] = resolveCircle(px, py, radius, rects);
    if (bounds) {
      px = Math.min(Math.max(px, bounds.x0), bounds.x1);
      py = Math.min(Math.max(py, bounds.y0), bounds.y1);
    }
  }
  return [px, py];
}
