# 3D TourFirm: travel agency office design sandbox

A browser-based, interactive 3D planning tool for a future travel agency office in Tashkent. It is used to walk through, redesign and budget the space before renting and furnishing a real unit.

**Current phase: 1 (concept), awaiting approval.** No 3D app yet.

| Document | Content |
|---|---|
| [docs/phase-1/concept-a-brief.md](docs/phase-1/concept-a-brief.md) | Concept A design brief: zones, verified geometry, palette, lighting, power, acoustics, UI languages, open decisions |
| [docs/phase-1/floor-plan-concept-a.svg](docs/phase-1/floor-plan-concept-a.svg) | Dimensioned floor plan, generated from the layout data |
| [docs/phase-1/furniture-schedule-and-budget.md](docs/phase-1/furniture-schedule-and-budget.md) | Furniture schedule with sizes and the draft USD/UZS budget (placeholder prices) |
| [docs/phase-1/site-visit-checklist.md](docs/phase-1/site-visit-checklist.md) | What to measure and ask when visiting rental units |
| [data/layouts/concept-a.json](data/layouts/concept-a.json) | Layout data: the single source of truth for the plan and, later, the 3D scene |

## Tools (Node ≥ 18, no dependencies)

```bash
node tools/validate-layout.mjs data/layouts/concept-a.json
```

```bash
node tools/render-plan.mjs data/layouts/concept-a.json docs/phase-1/floor-plan-concept-a.svg
```

All dimensions, prices and compliance notes are **assumptions** until they are measured or verified locally.
