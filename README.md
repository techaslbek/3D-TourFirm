# 3D TourFirm: travel agency office design sandbox

A browser-based, interactive 3D planning tool for a future travel agency office in Tashkent. It is used to walk through, redesign and budget the space before renting and furnishing a real unit. It runs locally, needs no account, server or paid service, and works offline once installed.

**Current phase: 2 (navigable 3D foundation), awaiting review.** See [docs/phase-2/README.md](docs/phase-2/README.md).

## Run it on your computer (Windows, macOS or Linux)

1. Install **Node.js 20 or newer** (LTS) from nodejs.org.
2. In a terminal inside this folder, install the dependencies once:

```bash
npm install
```

3. Start the app, then open the address it prints (usually http://localhost:5173):

```bash
npm run dev
```

Or build a static version and preview it:

```bash
npm run build
```

```bash
npm run preview
```

## Checks

| Command | What it does |
|---|---|
| `npm test` | Unit tests: wall geometry, collision, room resizing, presets |
| `npm run typecheck` | TypeScript type check |
| `npm run test:e2e` | Browser smoke test against the build (needs `npm run build` and Playwright's Chromium: `npx playwright install chromium`) |
| `npm run validate:layout` | Geometry check of the layout data (overlaps, clearances, routes) |
| `npm run plan:svg` | Regenerates the 2D floor plan SVG |

## Project structure

| Path | Purpose |
|---|---|
| `data/layouts/concept-a.json` | Layout data: the single source of truth for the plan and the 3D scene |
| `src/core/` | Pure TypeScript: geometry, collision, room resizing, camera presets (unit-tested) |
| `src/state/` | App state (Zustand) and per-viewer settings |
| `src/scene/` | Three.js / React Three Fiber scene: architecture, furniture, wall items, lighting |
| `src/controls/` | Orbit, walk (first person), plan and dollhouse camera rigs |
| `src/ui/` | Toolbar, side panel, help, translations (English / Oʻzbekcha / Русский) |
| `docs/phase-1/` | Concept A brief, floor plan, budget, site-visit checklist |
| `docs/phase-2/` | Phase 2 report and screenshots |
| `tools/` | Layout validation and SVG plan rendering scripts |

All dimensions, prices and compliance notes are **assumptions** until measured or verified locally.
