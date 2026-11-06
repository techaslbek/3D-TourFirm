/*
 * Dimensioned SVG floor plan of a layout. Shared by the app (Export → Floor plan) and the
 * command-line tool (tools/render-plan.mjs runs this file directly with Node's TypeScript support),
 * so it must stay self-contained: only `import type` from other modules.
 */
import type { Item, Layout, Partition, WallItem } from './types';

export interface PlanOptions {
  /** Title line; defaults to the layout name. */
  title?: string;
  /** Pixels per metre. */
  scale?: number;
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (n: number) => +n.toFixed(1);

const C = {
  wall: '#3b3026', glass: '#7fb3c8', item: '#fbf7f0', stroke: '#5b4a3a', text: '#2b2118',
  dim: '#8a6d4f', rug: '#b85c3c', route: '#2a8c8c', ceiling: '#6b4a2f', mark: '#1f4e8c', warn: '#a0442a',
};
const CAT_FILL: Record<string, string> = {
  seating: '#f3e3c8', tables: '#e9d2ad', desks: '#d9b98c', storage: '#e6dccd', decor: '#d8a27e',
  plants: '#b9c7a0', beverage: '#d6e4e4', equipment: '#d3d3d8', security: '#c9c9cf', accessories: '#ece4d6',
  acoustics: '#9fb0c9', lighting: '#f6e6a8',
};

export function renderPlanSvg(layout: Layout, opts: PlanOptions = {}): string {
  const { width: W, depth: D } = layout.room;
  const S = opts.scale ?? 80;
  const ML = 70, MT = 115, MB = 110, LEG = 400;
  const PW = W * S, PH = D * S;
  const X = (x: number) => ML + x * S;
  const Y = (y: number) => MT + (D - y) * S; // street side (y = 0) at the bottom
  const T = 0.2 * S;
  const parts: string[] = [];
  const add = (s: string) => parts.push(s);

  const items = layout.items.filter((i) => !i.hidden);
  const numbered = items.filter((i) => i.layer === 'floor' || i.layer === 'under');
  const rows = Math.ceil(numbered.length / 2) + Math.ceil(layout.wallItems.length / 2);
  const VW = ML + PW + 60 + LEG;
  const VH = Math.max(MT + PH + MB, MT + rows * 15 + 260);

  add(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" width="${VW}" height="${VH}" font-family="Inter, 'Segoe UI', Arial, sans-serif">`);
  add(`<defs>
  <pattern id="rugPat" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#e8c9a8"/><path d="M8 1 L15 8 L8 15 L1 8 Z" fill="none" stroke="${C.rug}" stroke-width="1.2" opacity=".7"/><circle cx="8" cy="8" r="1.6" fill="#1f4e8c" opacity=".7"/></pattern>
  <pattern id="slats" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0 L0 8" stroke="${C.ceiling}" stroke-width="1" opacity=".35"/></pattern>
  <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.dim}"/></marker>
</defs>`);
  add(`<rect width="${VW}" height="${VH}" fill="#fffdf9"/>`);
  add(`<text x="${ML}" y="34" font-size="20" font-weight="700" fill="${C.text}">${esc(opts.title ?? layout.name)}</text>`);
  add(`<text x="${ML}" y="56" font-size="12.5" fill="${C.dim}">Floor plan · interior ${W.toFixed(2)} × ${D.toFixed(2)} m = ${(W * D).toFixed(1)} m² · ceiling ${layout.room.ceilingHeight} m · scale ${S} px = 1 m · ASSUMED UNIT, NOT MEASURED</text>`);

  for (const z of layout.zones) {
    add(`<rect x="${X(z.x0)}" y="${Y(z.y1)}" width="${(z.x1 - z.x0) * S}" height="${(z.y1 - z.y0) * S}" fill="${z.color}" opacity=".08"/>`);
  }
  for (const c of layout.ceiling) {
    if (!('x0' in c)) continue;
    add(`<rect x="${X(c.x0)}" y="${Y(c.y1)}" width="${(c.x1 - c.x0) * S}" height="${(c.y1 - c.y0) * S}" fill="url(#slats)" stroke="${C.ceiling}" stroke-dasharray="6 4" stroke-width="1"/>`);
  }
  for (const z of layout.zones) {
    const [lx, ly] = z.labelAt ?? [z.x0 + 0.08, z.y1 - 0.2];
    add(`<text x="${X(lx)}" y="${Y(ly)}" font-size="11" font-weight="700" fill="${z.color}" letter-spacing=".04em">${esc(z.label.toUpperCase())}</text>`);
  }
  for (const i of items.filter((q) => q.layer === 'rug')) {
    add(`<rect x="${X(i.x - i.w / 2)}" y="${Y(i.y + i.d / 2)}" width="${i.w * S}" height="${i.d * S}" fill="url(#rugPat)" stroke="${C.rug}" stroke-width="2" opacity=".85"/>`);
  }

  // Entrance turning circle (Ø1.5 m just inside the door)
  const door = layout.room.facade.door;
  const tc = { x: (door.x0 + door.x1) / 2, y: 1.6, r: 0.75 };
  add(`<circle cx="${X(tc.x)}" cy="${Y(tc.y)}" r="${tc.r * S}" fill="none" stroke="${C.route}" stroke-dasharray="3 4" stroke-width="1.2"/>`);
  add(`<text x="${X(tc.x)}" y="${Y(tc.y) + 4}" font-size="10" text-anchor="middle" fill="${C.route}">Ø${(tc.r * 2).toFixed(1)} m clear</text>`);

  // Floor items, numbered for the legend
  const num = new Map<string, number>();
  numbered.forEach((i, n) => {
    num.set(i.id, n + 1);
    const fill = i.color ?? CAT_FILL[i.cat] ?? C.item;
    const dash = i.layer === 'under' ? ' stroke-dasharray="2 2"' : '';
    if (i.shape === 'round') {
      add(`<ellipse cx="${X(i.x)}" cy="${Y(i.y)}" rx="${(i.w / 2) * S}" ry="${(i.d / 2) * S}" fill="${fill}" fill-opacity="${i.color ? 0.55 : 1}" stroke="${C.stroke}" stroke-width="1.2"${dash}/>`);
    } else {
      add(`<rect x="${X(i.x - i.w / 2)}" y="${Y(i.y + i.d / 2)}" width="${i.w * S}" height="${i.d * S}" rx="2" fill="${fill}" fill-opacity="${i.color ? 0.55 : 1}" stroke="${C.stroke}" stroke-width="1.2"${dash}/>`);
    }
    if (i.faces && i.cat === 'seating') seatBack(i);
    const fs = Math.min(i.w, i.d) * S < 22 ? 9 : 11;
    const ty = i.d < 0.1 ? Y(i.y) - 6 : Y(i.y) + 4;
    add(`<text x="${X(i.x)}" y="${ty}" font-size="${fs}" font-weight="700" text-anchor="middle" fill="${C.text}">${n + 1}</text>`);
  });
  function seatBack(i: Item) {
    const v = { '+x': [1, 0], '-x': [-1, 0], '+y': [0, 1], '-y': [0, -1] }[i.faces!]!;
    const back = [i.x - v[0] * (i.w / 2 - 0.08), i.y - v[1] * (i.d / 2 - 0.08)];
    const len = (v[0] ? i.d : i.w) * 0.7;
    const p = [-v[1], v[0]];
    add(`<line x1="${f1(X(back[0] - (p[0] * len) / 2))}" y1="${f1(Y(back[1] - (p[1] * len) / 2))}" x2="${f1(X(back[0] + (p[0] * len) / 2))}" y2="${f1(Y(back[1] + (p[1] * len) / 2))}" stroke="${C.stroke}" stroke-width="3" stroke-linecap="round"/>`);
  }
  for (const c of layout.ceiling) {
    if ('x0' in c) continue;
    add(`<circle cx="${X(c.x)}" cy="${Y(c.y)}" r="9" fill="none" stroke="${C.ceiling}" stroke-width="1" stroke-dasharray="2 2"/>`);
  }

  // Exterior walls (drawn outside the interior line) with facade openings
  add(`<rect x="${X(0) - T}" y="${Y(D) - T}" width="${PW + 2 * T}" height="${T}" fill="${C.wall}"/>`);
  add(`<rect x="${X(0) - T}" y="${Y(D) - T}" width="${T}" height="${PH + 2 * T}" fill="${C.wall}"/>`);
  add(`<rect x="${X(W)}" y="${Y(D) - T}" width="${T}" height="${PH + 2 * T}" fill="${C.wall}"/>`);
  const fac = layout.room.facade;
  const openings = [...fac.windows.map((w) => [w.x0, w.x1]), [fac.door.x0, fac.door.x1]].sort((a, b) => a[0] - b[0]);
  let cur = 0;
  for (const [a, b] of openings) {
    if (a > cur) add(`<rect x="${X(cur)}" y="${Y(0)}" width="${(a - cur) * S}" height="${T}" fill="${C.wall}"/>`);
    cur = b;
  }
  if (cur < W) add(`<rect x="${X(cur)}" y="${Y(0)}" width="${(W - cur) * S}" height="${T}" fill="${C.wall}"/>`);
  add(`<rect x="${X(-0.2)}" y="${Y(0)}" width="${T}" height="${T}" fill="${C.wall}"/><rect x="${X(W)}" y="${Y(0)}" width="${T}" height="${T}" fill="${C.wall}"/>`);
  for (const w of fac.windows) {
    add(`<rect x="${X(w.x0)}" y="${Y(0) + T * 0.35}" width="${(w.x1 - w.x0) * S}" height="${T * 0.3}" fill="${C.glass}" stroke="#4d8aa3" stroke-width=".8"/>`);
  }
  {
    const hx = door.hinge === 'right' ? door.x1 : door.x0;
    const ox = door.hinge === 'right' ? door.x0 : door.x1;
    add(`<line x1="${X(hx)}" y1="${Y(0)}" x2="${X(hx)}" y2="${Y(door.leaf)}" stroke="${C.wall}" stroke-width="3"/>`);
    add(`<path d="M ${X(hx)} ${Y(door.leaf)} A ${door.leaf * S} ${door.leaf * S} 0 0 ${door.hinge === 'right' ? 0 : 1} ${X(ox)} ${Y(0)}" fill="none" stroke="${C.wall}" stroke-width="1" stroke-dasharray="4 3"/>`);
    add(`<text x="${X((door.x0 + door.x1) / 2)}" y="${Y(0) + T + 16}" font-size="11" font-weight="700" text-anchor="middle" fill="${C.text}">ENTRANCE</text>`);
  }
  for (const p of layout.partitions) drawPartition(p);
  function drawPartition(p: Partition) {
    const horizontal = p.x1 - p.x0 >= p.y1 - p.y0;
    let segs: [number, number][] = [[horizontal ? p.x0 : p.y0, horizontal ? p.x1 : p.y1]];
    for (const o of p.openings) {
      segs = segs.flatMap(([s, e]) => ([[s, Math.min(e, o.x0)], [Math.max(s, o.x1), e]] as [number, number][]).filter(([a, b]) => b - a > 1e-6));
      const lw = o.x1 - o.x0;
      add(`<rect x="${X(o.x0 - lw)}" y="${Y(p.y0) + 1}" width="${lw * S}" height="5" fill="#c8a477" stroke="${C.wall}" stroke-width=".8"/>`);
    }
    for (const [s, e] of segs) {
      if (horizontal) add(`<rect x="${X(s)}" y="${Y(p.y1)}" width="${(e - s) * S}" height="${(p.y1 - p.y0) * S}" fill="${C.wall}"/>`);
      else add(`<rect x="${X(p.x0)}" y="${Y(e)}" width="${(p.x1 - p.x0) * S}" height="${(e - s) * S}" fill="${C.wall}"/>`);
    }
  }
  // Storage room label when an L-shaped partition encloses the back-left corner
  const front = layout.partitions.find((p) => p.x1 - p.x0 >= p.y1 - p.y0);
  const side = layout.partitions.find((p) => p.y1 - p.y0 > p.x1 - p.x0);
  if (front && side) {
    const cx = side.x0 / 2, cy = (front.y1 + D) / 2;
    add(`<text x="${X(cx)}" y="${Y(cy) + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="${C.text}">STORAGE · IT</text>`);
    add(`<text x="${X(cx)}" y="${Y(cy) + 18}" font-size="10" text-anchor="middle" fill="${C.dim}">${side.x0.toFixed(2)} × ${(D - front.y1).toFixed(2)} m</text>`);
  }

  // Wall items as markers
  const tags = new Map<string, string>();
  const wallPos = (w: WallItem): [number, number, 'v' | 'h'] | null => {
    switch (w.wall) {
      case 'left': return [0, w.at, 'v'];
      case 'right': return [W, w.at, 'v'];
      case 'back': return [w.at, D, 'h'];
      case 'front': return [w.at, 0, 'h'];
      case 'partition-east': return side ? [side.x1, w.at, 'v'] : null;
      case 'partition-west': return side ? [side.x0, w.at, 'v'] : null;
    }
    return null;
  };
  const marks: string[] = [];
  layout.wallItems.forEach((w, k) => {
    const tag = k < 26 ? String.fromCharCode(65 + k) : `${String.fromCharCode(65 + Math.floor(k / 26) - 1)}${String.fromCharCode(65 + (k % 26))}`;
    tags.set(w.id, tag);
    const p = wallPos(w);
    if (!p) return;
    const [x, y, o] = p;
    const half = (w.width / 2) * S;
    const inward = w.wall === 'right' || w.wall === 'partition-west' ? -1 : 1;
    if (o === 'v') {
      const xx = X(x) + inward * 4;
      const outside = w.wall === 'left' || w.wall === 'right';
      add(`<line x1="${xx}" y1="${Y(y) - half}" x2="${xx}" y2="${Y(y) + half}" stroke="${C.mark}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`);
      const mx = outside ? xx - inward * (T + 18) : xx + inward * 13;
      marks.push(`<circle cx="${mx}" cy="${Y(y)}" r="8" fill="${C.mark}"/><text x="${mx}" y="${Y(y) + 3.5}" font-size="9.5" font-weight="700" fill="#fff" text-anchor="middle">${tag}</text>`);
    } else {
      const yy = Y(y) + (w.wall === 'back' ? 4 : -4);
      add(`<line x1="${X(x) - half}" y1="${yy}" x2="${X(x) + half}" y2="${yy}" stroke="${C.mark}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`);
      const my = w.wall === 'back' ? yy - 4 - T - 14 : yy - 13;
      marks.push(`<circle cx="${X(x)}" cy="${my}" r="8" fill="${C.mark}"/><text x="${X(x)}" y="${my + 3.5}" font-size="9.5" font-weight="700" fill="#fff" text-anchor="middle">${tag}</text>`);
    }
  });
  marks.forEach(add);

  // Dimensions
  const dimH = (x0: number, x1: number, y: number, label: string) => {
    add(`<line x1="${X(x0)}" y1="${y}" x2="${X(x1)}" y2="${y}" stroke="${C.dim}" stroke-width="1" marker-start="url(#arr)" marker-end="url(#arr)"/>`);
    add(`<text x="${(X(x0) + X(x1)) / 2}" y="${y + 14}" font-size="11" text-anchor="middle" fill="${C.dim}">${label}</text>`);
  };
  const dimV = (y0: number, y1: number, x: number, label: string) => {
    const my = (Y(y0) + Y(y1)) / 2;
    add(`<line x1="${x}" y1="${Y(y0)}" x2="${x}" y2="${Y(y1)}" stroke="${C.dim}" stroke-width="1" marker-start="url(#arr)" marker-end="url(#arr)"/>`);
    add(`<text x="${x - 8}" y="${my}" font-size="11" text-anchor="middle" fill="${C.dim}" transform="rotate(-90 ${x - 8} ${my})">${label}</text>`);
  };
  const below = MT + PH + T + 36;
  dimH(0, W, below + 34, `${W.toFixed(2)} m (interior, assumed)`);
  let prev = 0;
  for (const [a, b] of openings) {
    if (a > prev) dimH(prev, a, below, (a - prev).toFixed(2));
    dimH(a, b, below, (b - a).toFixed(2));
    prev = b;
  }
  if (prev < W) dimH(prev, W, below, (W - prev).toFixed(2));
  dimV(0, D, ML - T - 22, `${D.toFixed(2)} m (interior, assumed)`);

  // Legend
  const lx = ML + PW + 60;
  let ly = MT - 6;
  const colW = LEG / 2;
  add(`<text x="${lx}" y="${ly}" font-size="13" font-weight="700" fill="${C.text}">Floor items</text>`);
  ly += 8;
  const half1 = Math.ceil(numbered.length / 2);
  numbered.forEach((i, n) => {
    const col = n < half1 ? 0 : 1;
    const row = col ? n - half1 : n;
    add(`<text x="${lx + col * colW}" y="${ly + 16 + row * 15}" font-size="10" fill="${C.text}"><tspan font-weight="700">${num.get(i.id)}</tspan> ${esc(i.label.replace(/\s*\(.*\)/, '').slice(0, 30))} <tspan fill="${C.dim}">${Math.round(i.w * 100)}×${Math.round(i.d * 100)}</tspan></text>`);
  });
  ly += 16 + half1 * 15 + 14;
  add(`<text x="${lx}" y="${ly}" font-size="13" font-weight="700" fill="${C.text}">Wall-mounted</text>`);
  const half2 = Math.ceil(layout.wallItems.length / 2);
  layout.wallItems.forEach((w, k) => {
    const col = k < half2 ? 0 : 1;
    const row = col ? k - half2 : k;
    add(`<text x="${lx + col * colW}" y="${ly + 16 + row * 15}" font-size="10" fill="${C.text}"><tspan font-weight="700" fill="${C.mark}">${tags.get(w.id)}</tspan> ${esc(w.label.replace(/\s*\(.*\)/, ''))}</text>`);
  });
  ly += 16 + half2 * 15 + 10;
  const key: [string, string][] = [
    [`<rect width="16" height="10" fill="url(#slats)" stroke="${C.ceiling}" stroke-dasharray="3 2"/>`, 'Oak slat ceiling raft'],
    [`<circle cx="8" cy="5" r="6" fill="none" stroke="${C.ceiling}" stroke-dasharray="2 2"/>`, 'Pendant light'],
    [`<rect width="16" height="10" fill="${C.item}" stroke="${C.stroke}" stroke-dasharray="2 2"/>`, 'Under-desk / in-cabinet item'],
    [`<line x1="2" y1="5" x2="14" y2="5" stroke="${C.stroke}" stroke-width="3"/>`, 'Seat back (chairs face away from it)'],
  ];
  key.forEach(([sym, label], k) => add(`<g transform="translate(${lx} ${ly + 8 + k * 16})">${sym}<text x="24" y="9" font-size="10" fill="${C.text}">${label}</text></g>`));
  ly += 8 + key.length * 16 + 12;
  add(`<text x="${lx}" y="${ly}" font-size="10" fill="${C.warn}" font-weight="700">All dimensions and positions are assumptions for a</text>`);
  add(`<text x="${lx}" y="${ly + 13}" font-size="10" fill="${C.warn}" font-weight="700">hypothetical unit. Not a construction drawing.</text>`);
  add(`<text x="${lx}" y="${ly + 26}" font-size="10" fill="${C.dim}">Street side at bottom. Compass orientation unknown.</text>`);
  add('</svg>');
  return parts.join('\n');
}
