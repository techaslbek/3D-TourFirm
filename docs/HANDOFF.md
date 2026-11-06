# Handover: read this first in a new session

This project was started in a cloud session. Everything decided so far is summarised here so a new session (e.g. on the owner's laptop) can continue without the chat history.

## Product
Browser-based, interactive 3D design sandbox ("digital twin") for a future **travel agency office in Tashkent, Uzbekistan**. It is a planning tool, not a render: walk through, redesign, compare, budget, and later use it to rent and furnish a real unit. The brand is **not decided**: always use editable placeholders. Outbound destinations to feature: Turkey, Vietnam, Egypt, Maldives, China.

Style: cozy, contemporary, with restrained authentic Uzbek accents (one carpet, one framed suzani, one carved/CNC lattice screen, Rishtan-style ceramics). Warm neutrals, natural wood, soft light, plants. Not luxurious, sterile, cluttered, museum-like or restaurant-like.

## Decisions made by the owner
| Topic | Decision |
|---|---|
| Layout | **Concept A "Caravanserai Lounge"** approved (`docs/phase-1/concept-a-brief.md`) |
| Unit | Assumed 10 × 6 m = 60 m², ceiling 3.0 m, 10 m glazed street front. **Not measured: never present as fact** |
| Staff | 2 consultants |
| Sofa | Back to the window |
| Entrance door | Opens inward |
| Budget | USD 10 000 total for the office. **Open question:** does it include AC, computers, rent/deposit? Draft budget: `docs/phase-1/furniture-schedule-and-budget.md` (placeholder prices) |
| UI languages | English, Uzbek (Latin), Russian. UZ/RU strings are drafts for native review |
| Hardware | Owner's laptop model and FPS still **unknown**: ask them to tick "Show FPS" (Balanced) |
| Approvals | Owner said "I approve everything" for setup. Still show what any new paid tool, plugin, MCP server or remote install script does and ask first |

## Ground rules (from the original brief)
- Never invent a permanent brand. Never present assumed dimensions, prices or local compliance as verified.
- Free/open-source workflow. No paid APIs or cloud services required to run.
- Never silently use copyrighted or paid assets. Track licences (CC0 sources such as Poly Haven / ambientCG preferred; suzani and carpet patterns generated procedurally).
- After each phase: show what works, what's unfinished, run tests, give screenshots, and wait for approval on major design decisions.
- Don't claim photorealism or features that aren't implemented and verified.

## Status
- **Phase 0–1 done:** brief, dimensioned plan (`data/layouts/concept-a.json` is the single source of truth), layout validator, budget, site-visit checklist.
- **Phase 2 done:** Vite + React + TypeScript + Three.js (React Three Fiber, Drei) + Zustand. Orbit / Walk (WASD, collision) / Plan / Dollhouse, camera presets, editable room size, EN/UZ/RU, quality tiers. 18 unit tests, 17-check Playwright smoke test. Report: `docs/phase-2/README.md`.
- Published as a private claude.ai page: https://claude.ai/artifact/Mui9MVEQ5iGmGBzLMGFUM2 (rebuild with `npm run build:artifact`, which writes one self-contained HTML file).

## Next: Phase 3 (interior design)
1. Measure FPS on the real laptop first and set default quality accordingly.
2. Replace placeholder blocks with detailed **parametric** furniture (exact sizes from the layout JSON): sofa, armchairs, desks, ergonomic and visitor chairs, credenzas, tea counter, shelving, window bench, plants, lattice screen.
3. PBR materials: oak floor, plaster walls, fabrics, felt, ceramics. Procedural suzani and carpet textures.
4. Lighting: realistic fixtures, warm 3000 K, ambient occlusion (N8AO via `@react-three/postprocessing`) on Balanced/High only.
5. Editable brand name, sign and destination posters (placeholders).
6. Keep all tests green, add screenshots to `docs/phase-3/`, then ask the owner for approval.

Phase 4 = editor (select/move/rotate, catalogue, materials, undo/redo, save/load, JSON). Phase 5 = polish, exports (screenshots, floor plan, GLB), touch joystick, performance.

## Commands
```bash
npm install
npm run dev            # http://localhost:5173
npm test               # unit tests
npm run typecheck
npm run build && npm run test:e2e   # browser smoke test (needs: npx playwright install chromium)
npm run validate:layout
npm run build:artifact # single-file HTML for publishing
```
Git branch with all work so far: `claude/zealous-brown-bdxxvq`.
