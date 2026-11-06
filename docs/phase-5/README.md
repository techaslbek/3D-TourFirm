# Phase 5: polish, exports and validation (final report)

> **Status: all five planned phases are built and tested.** The tool is ready for you to use for planning. The unit is still the *assumed* 10 × 6 m space. Every dimension, price and compliance note stays an assumption until it is measured or verified in Tashkent.
>
> Plain-language instructions: [docs/USER-GUIDE.md](../USER-GUIDE.md)

## What Phase 5 added

| Area | Result |
|---|---|
| **Screenshot export** | PNG of the current view at 1× or 2× resolution |
| **Floor-plan export** | Dimensioned SVG (vector, scales to any size) or 2× PNG of the *current* design, numbered legend included. The app and the command-line tool now share one renderer (`src/core/planSvg.ts`), so they can't drift apart |
| **Budget export** | CSV for Excel/Google Sheets: every line with quantity, USD, UZS and verified status, plus subtotal, contingency and total |
| **3D model export** | GLB (glTF binary, ≈ 8.5 MB) of the room, furniture and wall items, for Blender, SketchUp (via plug-in) or online glTF viewers. **Local app only:** claude.ai doesn't allow `.glb` files, so the button is hidden there with an explanation |
| **Downloads inside claude.ai** | The page declares the viewer's `downloads` permission. Each save shows a confirmation; nothing downloads silently |
| **Touch walking** | On-screen joystick for phones and tablets (auto on touch screens; on/off in Settings). Drag on the view to look around |
| **Autosave on close** | Saves immediately when the tab is hidden or closed, not only after the 0.8 s delay |
| **Reliability** | Browser tests now count rendered frames instead of seconds, so they stay meaningful on slow machines |

## Bugs found and fixed in Phase 5
1. The on-screen joystick sat under the side panel, so touches went to the panel. It moved to the bottom right, above the panel. Verified on desktop and phone screen sizes.
2. Three browser checks (Q-turn, undo, closed door) failed only because of timing in the GPU-less test machine. They were rewritten to be frame-based and now pass.

## Final verification

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` (unit) | **32 / 32** |
| `npm run validate:layout` | 15 / 15 |
| `npm run build` | Pass. One 1.42 MB JS file (≈ 400 kB gzipped), because Three.js is included whole |
| `npm run test:e2e` | See the end of this file |

## Complete feature list (all phases)

- **Design:** Concept A layout with 36 furniture items, 14 wall items, Uzbek accents (carpet, suzani, lattice screen, Rishtan ceramics, ikat), procedural textures, warm lighting, contact shadows. No copyrighted or downloaded assets.
- **Navigation:** Orbit, Walk (WASD, mouse-look, collision, adjustable eye height and speed, joystick), Plan, Dollhouse, 10 camera presets, reset, help.
- **Editor:** select, drag with snapping, rotate, resize, colour, swap model, duplicate, delete, hide, add from a 32-item catalogue, finishes, lighting, room dimensions, undo/redo.
- **Checks:** live collisions, door swing, entrance turning circle, walls; access check from the entrance.
- **Planning:** budget in USD/UZS with verified flags; site-visit checklist; dimensioned floor plan.
- **Data:** autosave, named versions, JSON export/import, PNG/SVG/CSV/GLB exports.
- **Interface:** English, Uzbek (Latin), Russian; light and dark themes; phone layout; quality tiers with automatic step-down.

## Known limitations (honest list)

1. **Your laptop's FPS is still unmeasured.** Everything was tested in a cloud container without a graphics card (≈ 1–3 FPS in software). Please tick Settings → Show FPS and tell me the number in Balanced.
2. Rotation is in 90° steps. Wall-mounted items (TV, posters, AC…) aren't movable yet.
3. Lighting is real-time and believable, not photorealistic. Screen-space ambient occlusion was removed because the library is incompatible with three.js r187.
4. Saved versions live in one browser. Use JSON export to back up or move designs.
5. Catalogue item names are English only. Uzbek and Russian translations are drafts for native review.
6. Prices are placeholders, and compliance (fire, accessibility, ShNQ/KMK norms, licensing) is not verified.

## Suggested next steps

1. Measure a real unit with the [site-visit checklist](../phase-1/site-visit-checklist.md), enter its dimensions and re-plan.
2. Replace placeholder prices with real Tashkent quotes and tick "verified".
3. Decide the brand, then replace the placeholder name, colours and posters.
4. Optional: free-angle rotation, movable wall items, a closed consultation room module (Concept B) if the unit is deep.

## End-to-end test result

`npm run test:e2e`: **43 / 43 checks pass** on the final run (headless Chromium, software rendering). The suite covers rendering, all camera modes, walking through the door, wall and door collision, turning, room resizing and warnings, languages, brand editing, select, drag, undo/redo, rotate, colour, duplicate, delete, add from catalogue, collision badge, finishes, access check, budget, save/load versions, JSON import and errors, autosave after reload, all four exports, a real file download, the touch joystick, help, phone layout and zero console errors. The joystick was also checked separately at phone size (390 × 844), screenshot `28-phone-walk-joystick.png`.
