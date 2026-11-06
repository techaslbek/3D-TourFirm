# Office Sandbox: user guide

A simple guide to the 3D office tool. Nothing here needs programming.

## Opening it

- **Easiest:** open your private link on claude.ai: https://claude.ai/artifact/Mui9MVEQ5iGmGBzLMGFUM2
- **On your own computer** (works offline): install Node.js (LTS) from nodejs.org, open the project folder, type `cmd` in the address bar, then run `npm install` once and `npm run dev`. Open http://localhost:5173.

## Looking around

| Button at the top | What it does |
|---|---|
| **Orbit** | Circle around the office. Drag to rotate, right-drag to slide, mouse wheel to zoom |
| **Walk** | Walk inside as a person. Click the view, then move the mouse to look. Move with **W A S D** or the arrow keys. On a phone or tablet, use the round joystick |
| **Plan** | View from above, like a drawing |
| **Dollhouse** | View from above at an angle, with the near walls removed |
| **Views** list | Jump to the entrance, the lounge, a client at the desk, the consultant's view and more |

## Changing the design

1. Click a piece of furniture. A blue outline and a panel on the right appear.
2. **Drag** it to move it. It snaps to walls and to a 5 cm grid.
3. In the right panel you can **rotate** it, change its **size**, **colour** or **model**, **duplicate** it, **hide** it or **delete** it.
4. To add furniture, open **Design → Add furniture** in the left panel and click an item.
5. **Design → Finishes** changes the floor, wall and ceiling colours. **Lighting** changes how warm or bright the lights are.
6. Made a mistake? Press **↶** (undo) or Ctrl+Z.

The **Checks** button at the top turns red if something overlaps, blocks the door or is outside the room. **Room → Check access from the entrance** tells you whether every seat and desk can be reached.

## Brand, budget and saving

- **Brand:** type a business name, tagline and five destinations. The sign, posters and TV update.
- **Budget:** furniture is counted automatically from the design. Type real prices as you get quotes and tick **✓** for verified prices. Totals show in USD and UZS. Everything starts as a placeholder.
- **Project:** your work saves automatically. Use **Save version** to keep named versions (for example "With private room") and load them later.
- **Export:** screenshot (PNG), floor plan (SVG or PNG), budget (CSV, opens in Excel), and a 3D model (GLB, only when running on your own computer). Inside claude.ai you will be asked to confirm each file save.
- **Backup:** **Copy JSON** or **Download JSON** saves the whole design as text. **Import** loads it again on any computer.

## When you find a real unit

1. Take the [site-visit checklist](phase-1/site-visit-checklist.md) and measure the unit.
2. Enter the width, depth and ceiling height in **Room**.
3. Fix anything the **Checks** button flags, then walk through it.
4. Export the floor plan and budget to discuss with the landlord and suppliers.

Remember: all sizes, prices and rules in this tool are **assumptions** until you check them in Tashkent.
