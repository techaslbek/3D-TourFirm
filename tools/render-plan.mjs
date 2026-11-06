#!/usr/bin/env node
// Renders a dimensioned SVG floor plan from a layout JSON file.
// The drawing code lives in src/core/planSvg.ts and is shared with the app's "Export floor plan".
// Node runs that TypeScript file directly (type stripping, Node 22.18+ / 23.6+).
// Usage: node tools/render-plan.mjs data/layouts/concept-a.json docs/phase-1/floor-plan-concept-a.svg
import { readFileSync, writeFileSync } from 'node:fs';
import { renderPlanSvg } from '../src/core/planSvg.ts';

const [src = 'data/layouts/concept-a.json', out = 'docs/phase-1/floor-plan-concept-a.svg'] = process.argv.slice(2);
const layout = JSON.parse(readFileSync(src, 'utf8'));
const svg = renderPlanSvg(layout);
writeFileSync(out, svg);
const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/) ?? [];
console.log(`Wrote ${out} (${w}×${h})`);
