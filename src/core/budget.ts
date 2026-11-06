import { catalogById, catalogFor } from './catalog';
import { modelKind } from './furniture';
import type { Layout } from './types';

/*
 * Furnishing budget. Furniture quantities come straight from the layout (visible items only);
 * prices default to the catalogue placeholders and can be overridden per catalogue entry.
 * Other costs (fit-out, equipment, decor) are editable lines from the Phase 1 draft budget.
 * Nothing here is a verified price unless the user ticks "verified".
 */

export interface PriceInfo { usd: number; verified: boolean }

export interface ExtraLine {
  id: string;
  group: 'Fit-out' | 'Equipment and safety' | 'Decor and brand';
  label: string;
  qty: number;
  unitUsd: number;
  verified: boolean;
}

export interface BudgetSettings {
  /** UZS per 1 USD (placeholder: check the current Central Bank rate). */
  rate: number;
  contingencyPct: number;
  /** Overall budget the user is aiming for, in USD. */
  targetUsd: number;
  prices: Record<string, PriceInfo>;
  extras: ExtraLine[];
}

export const DEFAULT_BUDGET: BudgetSettings = {
  rate: 12800,
  contingencyPct: 10,
  targetUsd: 10000,
  prices: {},
  extras: [
    { id: 'floor', group: 'Fit-out', label: 'LVT / laminate flooring, fitted (m²)', qty: 60, unitUsd: 12, verified: false },
    { id: 'paint', group: 'Fit-out', label: 'Wall prep and paint', qty: 1, unitUsd: 350, verified: false },
    { id: 'plaster', group: 'Fit-out', label: 'Textured plaster feature wall', qty: 1, unitUsd: 200, verified: false },
    { id: 'raft', group: 'Fit-out', label: 'Oak slat ceiling raft', qty: 1, unitUsd: 500, verified: false },
    { id: 'partition', group: 'Fit-out', label: 'Storage partition + sliding door', qty: 1, unitUsd: 550, verified: false },
    { id: 'electric', group: 'Fit-out', label: 'Power and data points', qty: 20, unitUsd: 15, verified: false },
    { id: 'lights', group: 'Fit-out', label: 'Light fittings (downlights, pendants, strip)', qty: 1, unitUsd: 300, verified: false },
    { id: 'router', group: 'Equipment and safety', label: 'Router / Wi-Fi', qty: 1, unitUsd: 80, verified: false },
    { id: 'tv', group: 'Equipment and safety', label: 'TV 50″', qty: 1, unitUsd: 380, verified: false },
    { id: 'fridge', group: 'Equipment and safety', label: 'Under-counter fridge', qty: 1, unitUsd: 150, verified: false },
    { id: 'teaset', group: 'Equipment and safety', label: 'Kettle, Rishtan-style tea set, glasses', qty: 1, unitUsd: 120, verified: false },
    { id: 'extinguisher', group: 'Equipment and safety', label: 'Fire extinguishers', qty: 2, unitUsd: 25, verified: false },
    { id: 'smoke', group: 'Equipment and safety', label: 'Smoke detectors', qty: 3, unitUsd: 10, verified: false },
    { id: 'firstaid', group: 'Equipment and safety', label: 'First-aid kit', qty: 1, unitUsd: 20, verified: false },
    { id: 'signs', group: 'Equipment and safety', label: 'Exit sign + evacuation plan', qty: 1, unitUsd: 30, verified: false },
    { id: 'suzani', group: 'Decor and brand', label: 'Framed suzani panel', qty: 1, unitUsd: 120, verified: false },
    { id: 'cushions', group: 'Decor and brand', label: 'Ikat / adras cushions', qty: 4, unitUsd: 20, verified: false },
    { id: 'posters', group: 'Decor and brand', label: 'Destination posters, framed', qty: 3, unitUsd: 20, verified: false },
    { id: 'small-plants', group: 'Decor and brand', label: 'Small plants and pots', qty: 4, unitUsd: 15, verified: false },
    { id: 'brand-panel', group: 'Decor and brand', label: 'Interior brand / logo panel', qty: 1, unitUsd: 150, verified: false },
    { id: 'sign', group: 'Decor and brand', label: 'Exterior lightbox sign', qty: 1, unitUsd: 450, verified: false },
  ],
};

export interface BudgetLine {
  key: string;
  group: string;
  label: string;
  qty: number;
  unitUsd: number;
  totalUsd: number;
  verified: boolean;
  /** Catalogue id for furniture lines (prices editable per entry). */
  catalogId?: string;
}

export interface BudgetResult {
  lines: BudgetLine[];
  furnitureUsd: number;
  extrasUsd: number;
  subtotalUsd: number;
  contingencyUsd: number;
  totalUsd: number;
  verifiedShare: number;
}

export function computeBudget(layout: Layout, settings: BudgetSettings): BudgetResult {
  const counts = new Map<string, { label: string; qty: number }>();
  for (const item of layout.items) {
    if (item.hidden) continue;
    const entry = catalogFor(item, modelKind(item));
    if (!entry) continue;
    const c = counts.get(entry.id) ?? { label: entry.label, qty: 0 };
    c.qty++;
    counts.set(entry.id, c);
  }
  const lines: BudgetLine[] = [];
  for (const [id, { label, qty }] of [...counts.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label))) {
    const entryPrice = settings.prices[id];
    const fallback = catalogPrice(id);
    const unit = entryPrice?.usd ?? fallback;
    lines.push({ key: `cat:${id}`, group: 'Furniture', label, qty, unitUsd: unit, totalUsd: unit * qty, verified: !!entryPrice?.verified, catalogId: id });
  }
  for (const e of settings.extras) {
    lines.push({ key: `x:${e.id}`, group: e.group, label: e.label, qty: e.qty, unitUsd: e.unitUsd, totalUsd: e.qty * e.unitUsd, verified: e.verified });
  }
  const furnitureUsd = sum(lines.filter((l) => l.group === 'Furniture').map((l) => l.totalUsd));
  const extrasUsd = sum(lines.filter((l) => l.group !== 'Furniture').map((l) => l.totalUsd));
  const subtotalUsd = furnitureUsd + extrasUsd;
  const contingencyUsd = (subtotalUsd * settings.contingencyPct) / 100;
  const verifiedUsd = sum(lines.filter((l) => l.verified).map((l) => l.totalUsd));
  return {
    lines, furnitureUsd, extrasUsd, subtotalUsd, contingencyUsd,
    totalUsd: subtotalUsd + contingencyUsd,
    verifiedShare: subtotalUsd > 0 ? verifiedUsd / subtotalUsd : 0,
  };
}

const catalogPrice = (id: string) => catalogById(id)?.priceUsd ?? 0;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
