import type { ModelKind } from './furniture';
import type { Facing, Item, ItemLayer } from './types';

/**
 * Furniture catalogue. Sizes are nominal: W = front width, D = depth, H = height (metres), for an
 * item facing "+y". Prices are PLACEHOLDERS (USD) carried over from the Phase 1 draft budget;
 * they are editable in the Budget panel and marked unverified until real quotes are entered.
 */
export interface CatalogEntry {
  id: string;
  label: string;
  cat: string;
  kind: ModelKind;
  W: number;
  D: number;
  H: number;
  layer?: ItemLayer;
  faces?: Facing;
  shape?: 'round';
  priceUsd: number;
  note: string;
}

export const CATEGORIES: { id: string; label: string }[] = [
  { id: 'seating', label: 'Seating' },
  { id: 'desks', label: 'Desks' },
  { id: 'tables', label: 'Tables' },
  { id: 'storage', label: 'Storage' },
  { id: 'beverage', label: 'Tea and water' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'decor', label: 'Decor and Uzbek accents' },
  { id: 'plants', label: 'Plants' },
  { id: 'acoustics', label: 'Acoustics' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'security', label: 'Security' },
];

export const CATALOG: CatalogEntry[] = [
  { id: 'sofa-3', label: '3-seat sofa', cat: 'seating', kind: 'sofa', W: 2.0, D: 0.9, H: 0.8, faces: '+y', priceUsd: 450, note: 'Removable washable cover, commercial-grade fabric' },
  { id: 'sofa-2', label: '2-seat sofa', cat: 'seating', kind: 'sofa', W: 1.6, D: 0.88, H: 0.8, faces: '+y', priceUsd: 380, note: 'For smaller lounges' },
  { id: 'armchair', label: 'Armchair', cat: 'seating', kind: 'armchair', W: 0.8, D: 0.8, H: 0.8, faces: '+y', priceUsd: 220, note: 'Armrests help older clients stand up' },
  { id: 'staff-chair', label: 'Ergonomic staff chair', cat: 'seating', kind: 'staff-chair', W: 0.65, D: 0.65, H: 1.1, faces: '+y', priceUsd: 180, note: 'Adjustable lumbar, seat depth and armrests' },
  { id: 'visitor-chair', label: 'Visitor chair', cat: 'seating', kind: 'visitor-chair', W: 0.55, D: 0.55, H: 0.82, faces: '+y', priceUsd: 70, note: 'Upholstered, wipeable fabric' },
  { id: 'window-bench', label: 'Window bench 240 cm', cat: 'seating', kind: 'window-bench', W: 2.4, D: 0.45, H: 0.45, faces: '+y', priceUsd: 250, note: 'Local carpenter; storage drawers optional' },
  { id: 'window-bench-160', label: 'Window bench 160 cm', cat: 'seating', kind: 'window-bench', W: 1.6, D: 0.45, H: 0.45, faces: '+y', priceUsd: 190, note: 'Local carpenter' },
  { id: 'desk-140', label: 'Consultant desk 140 × 70', cat: 'desks', kind: 'desk', W: 1.4, D: 0.7, H: 0.75, faces: '+y', priceUsd: 180, note: 'Cable tray and grommet' },
  { id: 'desk-120', label: 'Compact desk 120 × 60', cat: 'desks', kind: 'desk', W: 1.2, D: 0.6, H: 0.75, faces: '+y', priceUsd: 150, note: 'Tight layouts' },
  { id: 'desk-160', label: 'Wide desk 160 × 80', cat: 'desks', kind: 'desk', W: 1.6, D: 0.8, H: 0.75, faces: '+y', priceUsd: 220, note: 'Room for two clients and documents' },
  { id: 'coffee-table', label: 'Coffee table', cat: 'tables', kind: 'coffee-table', W: 1.0, D: 0.6, H: 0.42, priceUsd: 120, note: 'Rounded corners' },
  { id: 'side-table', label: 'Side table with USB charging', cat: 'tables', kind: 'side-table', W: 0.45, D: 0.45, H: 0.55, shape: 'round', priceUsd: 40, note: 'Or a standard side table plus a USB socket' },
  { id: 'credenza-120', label: 'Lockable credenza 120', cat: 'storage', kind: 'credenza', W: 1.2, D: 0.45, H: 0.75, faces: '+y', priceUsd: 120, note: 'Client files' },
  { id: 'credenza-80', label: 'Lockable credenza 80', cat: 'storage', kind: 'credenza', W: 0.8, D: 0.45, H: 0.75, faces: '+y', priceUsd: 90, note: 'Client files' },
  { id: 'display-unit', label: 'Low display cabinet', cat: 'storage', kind: 'display-unit', W: 1.2, D: 0.4, H: 0.9, faces: '+y', priceUsd: 150, note: 'Under the TV; hides cables' },
  { id: 'tall-cabinet', label: 'Tall lockable cabinet', cat: 'storage', kind: 'tall-cabinet', W: 0.8, D: 0.4, H: 2.0, faces: '+y', priceUsd: 160, note: 'Anchor to the wall' },
  { id: 'shelving', label: 'Open shelving', cat: 'storage', kind: 'shelving', W: 0.8, D: 0.35, H: 2.0, faces: '+y', priceUsd: 70, note: 'Brochures and supplies' },
  { id: 'cleaning-cupboard', label: 'Cleaning cupboard', cat: 'storage', kind: 'cleaning-cupboard', W: 0.6, D: 0.4, H: 2.0, faces: '+y', priceUsd: 80, note: 'Ventilated' },
  { id: 'tea-counter', label: 'Tea station counter', cat: 'beverage', kind: 'tea-counter', W: 1.4, D: 0.6, H: 0.9, faces: '+y', priceUsd: 300, note: 'Under-counter fridge; includes wall shelf' },
  { id: 'water-cooler', label: 'Water cooler (19 L)', cat: 'beverage', kind: 'water-cooler', W: 0.35, D: 0.35, H: 1.1, faces: '+y', priceUsd: 100, note: 'No plumbing needed' },
  { id: 'printer', label: 'Printer/scanner on stand', cat: 'equipment', kind: 'printer', W: 0.5, D: 0.5, H: 1.0, faces: '+y', priceUsd: 330, note: 'Laser MFP, duplex scan' },
  { id: 'safe', label: 'Small safe', cat: 'security', kind: 'safe', W: 0.4, D: 0.4, H: 0.5, faces: '+y', priceUsd: 150, note: 'Bolt to floor or wall' },
  { id: 'rug-3x2', label: 'Uzbek carpet 3 × 2 m', cat: 'decor', kind: 'rug', W: 3.0, D: 2.0, H: 0.01, layer: 'rug', priceUsd: 250, note: 'Machine-woven; hand-knotted costs several times more' },
  { id: 'rug-2x1.4', label: 'Uzbek carpet 2 × 1.4 m', cat: 'decor', kind: 'rug', W: 2.0, D: 1.4, H: 0.01, layer: 'rug', priceUsd: 150, note: 'Machine-woven' },
  { id: 'lattice-screen', label: 'Carved lattice screen', cat: 'decor', kind: 'lattice-screen', W: 1.8, D: 0.05, H: 2.0, priceUsd: 350, note: 'CNC MDF is cheaper than carved hardwood' },
  { id: 'plant-tall', label: 'Tall plant', cat: 'plants', kind: 'plant', W: 0.5, D: 0.5, H: 1.6, shape: 'round', priceUsd: 45, note: 'Ficus, olive or similar' },
  { id: 'plant-medium', label: 'Medium plant', cat: 'plants', kind: 'plant', W: 0.4, D: 0.4, H: 1.1, shape: 'round', priceUsd: 30, note: 'Low-light tolerant' },
  { id: 'acoustic-screen', label: 'Acoustic felt screen 180', cat: 'acoustics', kind: 'acoustic-screen', W: 0.05, D: 1.8, H: 1.4, priceUsd: 180, note: 'Two 90 cm panels on feet' },
  { id: 'floor-lamp', label: 'Floor lamp', cat: 'lighting', kind: 'floor-lamp', W: 0.35, D: 0.35, H: 1.6, shape: 'round', priceUsd: 60, note: 'Warm 2700–3000 K' },
  { id: 'coat-stand', label: 'Coat stand', cat: 'accessories', kind: 'coat-stand', W: 0.5, D: 0.5, H: 1.8, shape: 'round', priceUsd: 35, note: '' },
  { id: 'umbrella-stand', label: 'Umbrella stand', cat: 'accessories', kind: 'umbrella-stand', W: 0.28, D: 0.28, H: 0.6, shape: 'round', priceUsd: 15, note: '' },
  { id: 'bin', label: 'Waste bin', cat: 'accessories', kind: 'bin', W: 0.25, D: 0.25, H: 0.4, shape: 'round', priceUsd: 10, note: '' },
];

export const catalogById = (id: string | undefined) => CATALOG.find((c) => c.id === id);

/** Catalogue entry for an existing layout item: explicit catalogId, else matched by model and size. */
export function catalogFor(item: Item, kind: ModelKind): CatalogEntry | undefined {
  const explicit = catalogById(item.catalogId);
  if (explicit) return explicit;
  const sideways = item.faces === '+x' || item.faces === '-x';
  const W = sideways ? item.d : item.w;
  const candidates = CATALOG.filter((c) => c.kind === kind);
  return candidates.sort((a, b) => Math.abs(a.W - W) - Math.abs(b.W - W))[0];
}
