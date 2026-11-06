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
- **Phase 3 done:** parametric furniture, procedural Uzbek accents (carpet, suzani, lattice, Rishtan ceramics, ikat), PBR materials, slat ceiling, warm lighting, contact shadows, editable brand/destinations. Report: `docs/phase-3/README.md`. N8AO ambient occlusion was removed (crashes with three r187).
- **Phase 4 done:** editor (select, drag with grid/wall snapping, rotate 90°, add from 32-item catalogue, duplicate, delete, hide, resize, colour, model swap), finishes (floor, walls, feature wall, ceiling), light warmth/brightness, live collision checks + access check, undo/redo, autosave + named versions (IndexedDB), JSON export/import, budget panel (USD/UZS, verified flags). Report: `docs/phase-4/README.md`.
- **Phase 5 done:** exports (PNG screenshot 1×/2×, floor plan SVG/PNG via shared `src/core/planSvg.ts`, budget CSV, GLB local-only), downloads via the claude.ai `downloads` capability (publish with `capabilities: {downloads: true}`), touch joystick, autosave on close, frame-based e2e checks. Report: `docs/phase-5/README.md`; user guide: `docs/USER-GUIDE.md`.
- Published as a private claude.ai page: https://claude.ai/artifact/Mui9MVEQ5iGmGBzLMGFUM2 (rebuild with `npm run build:artifact`, which writes one self-contained HTML file).

## Next (after the five planned phases)
1. Get the owner's FPS (Balanced) and laptop model; tune defaults if needed.
2. Real unit: enter measured dimensions, re-check, update the budget with real quotes.
3. Optional features: free-angle rotation, movable wall items, Concept B private-room module, code splitting.

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
