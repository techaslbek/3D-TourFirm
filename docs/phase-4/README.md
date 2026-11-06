# Phase 4: design editor (report)

> **Status: built and tested, awaiting your review.** You can now redesign the office yourself without touching code. The unit is still the *assumed* 10 × 6 m space and all prices are placeholders.

## What you can do now

| Area | How it works |
|---|---|
| **Select** | Click any furniture (in Orbit, Plan or Dollhouse). An inspector opens on the right. Press Esc or click empty space to deselect |
| **Move** | Drag the *selected* item. A single click on an unselected item only selects it, so you can't move things by accident while looking around. Arrow keys nudge it 5 cm |
| **Snap** | Edges snap to a grid (1 / 5 / 10 / 25 cm or off) and to walls and partitions within 12 cm. Items can't be dragged outside the room |
| **Rotate** | 90° steps (⟲ ⟳ buttons or `[` `]`). Office furniture almost always sits square to the walls, and this keeps every check, the floor plan and walking collision exact |
| **Add** | **Design → Add furniture**: 32 catalogue items in 12 categories, each with size and placeholder price. New items appear in the nearest free spot |
| **Duplicate / Delete / Hide** | Inspector buttons, or Ctrl+D and Delete. Hidden items don't block walking and aren't counted in the budget |
| **Edit size and name** | W × D × H and X / Y fields, plus an editable name |
| **Swap model** | Swap within a category, e.g. desk 140 → 160, sofa 3-seat → 2-seat. The centre and facing stay the same |
| **Colours** | Each item's main finish (upholstery, cabinet body, table top…): concept palette swatches or any colour, with a reset to original |
| **Finishes** | Floor (oak, light oak, walnut, stone tiles, carpet tiles). Wall, feature-wall and ceiling colours |
| **Lighting** | Warmth 2200–5000 K and brightness ×0.4–1.6 for the interior lights |
| **Undo / redo** | ↶ ↷ buttons or Ctrl+Z / Ctrl+Y, up to 100 steps. Typing a name or dragging a colour picker counts as one step |
| **Live checks** | The toolbar shows **✓ Checks** or **⚠ n Checks**. Room tab → Checks lists overlaps, items outside the room, items overlapping walls, blocked door swing and a blocked entrance turning circle. Offending items get a red outline. Click a name to select it |
| **Access check** | Room tab → "Check access from the entrance": can every seat, desk and cabinet be reached with a 0.9 m path (comfortable) or a 0.6 m path (tight, staff only)? |
| **Budget** | **Budget** tab: furniture counted from the design, other costs (fit-out, equipment, decor) editable, contingency %, target, USD and UZS (rate editable), and a "verified" tick per line with the share of verified prices |
| **Save and versions** | Everything autosaves in your browser (also immediately when you close the tab). **Project** tab: save named versions, load, delete |
| **JSON backup** | Download JSON (works when run locally) or **Copy JSON**, which works inside claude.ai where downloads are blocked. Import from a file or by pasting. Bad files show a plain-language error |

## Design finding fixed during this phase

The new access check found that the **left armchair in the lounge was boxed in**: it could only be reached through 35–45 cm gaps. The lattice screen moved 25 cm back (y 2.75 → 3.00 m). That opens a 62 cm path behind the armchair, and the storage passage stays at 92 cm. The Phase 1 floor plan was regenerated.

Still only "tight" (0.6–0.9 m, fine for staff, not for clients): the consultant side of desk 2 behind the acoustic screen, the inner lounge seats, and the storage room. This is consistent with the Phase 1 notes.

## Tests

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | **30 / 30**. New: rotation, grid and wall snapping, add/duplicate without collisions, model swap, conflict detection, access check, budget counting, project JSON round-trip and error messages |
| `npm run validate:layout` | 15 / 15 |
| `npm run build` | Pass (≈ 385 kB gzipped JS) |
| `npm run test:e2e` | See end of file. New editor checks: click to select, drag to move, undo/redo, rotate, colour, duplicate, delete, add from catalogue, collision badge, floor finish, access check, budget update, save/load version, JSON paste import, invalid JSON error, autosave after reload |

## Known limitations

- **Rotation is in 90° steps only.** Free angles can be added if you need diagonal placements.
- **Wall-mounted items** (TV, posters, suzani, AC, extinguishers) aren't editable yet, except for brand and poster text. Planned for Phase 5 if you want it.
- **Catalogue names** are English only. The interface itself switches to Uzbek and Russian.
- Saved versions live **in this browser only**. Use JSON export as a backup or to move a design to another computer.
- Your laptop's FPS is still unmeasured.

## End-to-end test result

`npm run test:e2e`: **36 / 37** on the final Phase 4 run. All editor checks pass. The one failure was "Q turns the walker", a timing artefact: the test held Q for 1.5 s while the GPU-less container rendered under 1 frame per second. The check now waits for 10 rendered frames instead of a fixed time. It is re-verified in the Phase 5 test run.

Two other problems were found by the test runs and fixed in the app:
- Autosave waited 0.8 s after an edit, so closing the tab immediately could lose the last edit. It now also saves the moment the page is hidden or closed.
- Keyboard focus could stay in a form field and block shortcuts. Fixed in Phase 2/3; the brand-name field case is re-checked here.
