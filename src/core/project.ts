import { DEFAULT_BUDGET, type BudgetSettings } from './budget';
import type { Layout } from './types';

/** Everything that makes up a saved design version (also the JSON export format). */
export interface ProjectData {
  schema: 'tourfirm.project/1';
  name: string;
  savedAt: string;
  layout: Layout;
  brandName: string;
  brandTagline: string;
  destinations: string[];
  budget: BudgetSettings;
}

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown) => typeof v === 'string';

/**
 * Validates untrusted JSON (an imported file) and returns a clean ProjectData, or throws an
 * Error whose message explains what is wrong in plain words.
 */
export function parseProject(input: unknown): ProjectData {
  if (!input || typeof input !== 'object') throw new Error('The file is not a project: expected a JSON object.');
  const p = input as Record<string, unknown>;
  if (p.schema !== 'tourfirm.project/1') throw new Error('This JSON is not an Office Sandbox project (missing "schema": "tourfirm.project/1").');
  const L = p.layout as Record<string, unknown> | undefined;
  const room = L?.room as Record<string, unknown> | undefined;
  if (!L || !room || !isNum(room.width) || !isNum(room.depth) || !isNum(room.ceilingHeight)) {
    throw new Error('The project has no valid room dimensions.');
  }
  if (!Array.isArray(L.items)) throw new Error('The project has no furniture list.');
  L.items.forEach((raw, k) => {
    const i = raw as Record<string, unknown>;
    if (!isStr(i.id) || !isNum(i.x) || !isNum(i.y) || !isNum(i.w) || !isNum(i.d) || !isNum(i.h)) {
      throw new Error(`Furniture item ${k + 1} is missing an id, position or size.`);
    }
  });
  for (const key of ['partitions', 'zones', 'wallItems', 'ceiling'] as const) {
    if (!Array.isArray(L[key])) throw new Error(`The project is missing "${key}".`);
  }
  const destinations = Array.isArray(p.destinations) && p.destinations.length === 5 && p.destinations.every(isStr)
    ? (p.destinations as string[]) : ['Maldives', 'Turkey', 'Vietnam', 'Egypt', 'China'];
  const b = (p.budget ?? {}) as Partial<BudgetSettings>;
  const budget: BudgetSettings = {
    rate: isNum(b.rate) ? b.rate! : DEFAULT_BUDGET.rate,
    contingencyPct: isNum(b.contingencyPct) ? b.contingencyPct! : DEFAULT_BUDGET.contingencyPct,
    targetUsd: isNum(b.targetUsd) ? b.targetUsd! : DEFAULT_BUDGET.targetUsd,
    prices: b.prices && typeof b.prices === 'object' ? b.prices : {},
    extras: Array.isArray(b.extras) ? b.extras : DEFAULT_BUDGET.extras,
  };
  return {
    schema: 'tourfirm.project/1',
    name: isStr(p.name) ? (p.name as string).slice(0, 80) : 'Imported design',
    savedAt: isStr(p.savedAt) ? (p.savedAt as string) : new Date().toISOString(),
    layout: L as unknown as Layout,
    brandName: isStr(p.brandName) ? (p.brandName as string).slice(0, 40) : 'YOUR BRAND',
    brandTagline: isStr(p.brandTagline) ? (p.brandTagline as string).slice(0, 60) : 'Travel',
    destinations,
    budget,
  };
}
