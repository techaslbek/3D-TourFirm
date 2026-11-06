import type { Item } from './types';

/** Model kinds with a dedicated parametric model. Unknown items fall back to 'generic'. */
export const MODEL_KINDS = [
  'rug', 'sofa', 'armchair', 'coffee-table', 'side-table', 'floor-lamp', 'lattice-screen', 'plant',
  'coat-stand', 'umbrella-stand', 'window-bench', 'display-unit', 'desk', 'staff-chair', 'visitor-chair',
  'credenza', 'acoustic-screen', 'tea-counter', 'water-cooler', 'tall-cabinet', 'shelving',
  'cleaning-cupboard', 'printer', 'safe', 'bin', 'generic',
] as const;
export type ModelKind = (typeof MODEL_KINDS)[number];

const BY_PREFIX: [string, ModelKind][] = [
  ['rug', 'rug'], ['sofa', 'sofa'], ['armchair', 'armchair'], ['coffee-table', 'coffee-table'],
  ['side-table', 'side-table'], ['floor-lamp', 'floor-lamp'], ['lattice', 'lattice-screen'], ['plant', 'plant'],
  ['coat-stand', 'coat-stand'], ['umbrella', 'umbrella-stand'], ['window-bench', 'window-bench'],
  ['display-unit', 'display-unit'], ['desk', 'desk'], ['staff-chair', 'staff-chair'], ['visitor', 'visitor-chair'],
  ['credenza', 'credenza'], ['acoustic', 'acoustic-screen'], ['tea-counter', 'tea-counter'],
  ['water-cooler', 'water-cooler'], ['tall-cab', 'tall-cabinet'], ['shelving', 'shelving'],
  ['cleaning', 'cleaning-cupboard'], ['printer', 'printer'], ['safe', 'safe'], ['bin', 'bin'],
];

export function modelKind(item: Pick<Item, 'id' | 'cat'>): ModelKind {
  const hit = BY_PREFIX.find(([p]) => item.id.startsWith(p));
  if (hit) return hit[1];
  if (item.cat === 'plants') return 'plant';
  return 'generic';
}

/**
 * Models are authored in a local frame: centred on the floor, local X across the front,
 * front facing three.js -Z (= layout +y). This returns the rotation for the item's facing
 * and the local width/depth (swapped when the item faces ±x).
 */
export function localFrame(item: Pick<Item, 'w' | 'd' | 'faces'>): { rotY: number; W: number; D: number } {
  switch (item.faces) {
    case '-y': return { rotY: Math.PI, W: item.w, D: item.d };
    case '+x': return { rotY: -Math.PI / 2, W: item.d, D: item.w };
    case '-x': return { rotY: Math.PI / 2, W: item.d, D: item.w };
    default: return { rotY: 0, W: item.w, D: item.d };
  }
}
