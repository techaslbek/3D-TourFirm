#!/usr/bin/env node
// End-to-end smoke test against the production build (run `npm run build` first).
// Starts `vite preview`, drives the app in headless Chromium, checks navigation/collision via the
// window.__tourfirm debug hook, and writes screenshots to docs/phase-2/screenshots.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
const OUT = process.env.SCREENSHOTS ?? 'docs/phase-4/screenshots';
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (ok, msg) => { results.push({ ok, msg }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* ignore */ } };
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

const launchOpts = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };

await waitForServer();
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const state = () => page.evaluate(() => {
  const d = window.__tourfirm;
  const s = d.getState();
  return { frames: d.frames, walk: d.walk, mode: s.cameraMode, room: s.layout.room, errors: d.errors };
});
const frames = async (n = 8) => {
  const start = (await state()).frames;
  await page.waitForFunction((t) => window.__tourfirm.frames >= t, start + n, { timeout: 30000 });
};
const shot = async (name) => { await frames(6); await page.screenshot({ path: `${OUT}/${name}.png` }); };
const preset = async (id) => { await page.evaluate((p) => window.__tourfirm.getState().applyPreset(p), id); await frames(4); };

try {
  await page.goto(`${BASE}?auto=0&quality=balanced&fresh=1`);
  await page.waitForFunction(() => window.__tourfirm && window.__tourfirm.frames > 10, null, { timeout: 60000 });
  const hasGl = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return !!c && !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  check(hasGl, 'Canvas with a WebGL context is rendering');
  await shot('01-orbit-overview');

  // Camera modes through the toolbar
  for (const [mode, name] of [['dollhouse', '02-dollhouse'], ['plan', '03-plan']]) {
    await page.click(`[data-mode=${mode}]`);
    await frames(6);
    check((await state()).mode === mode, `Toolbar switches to ${mode} mode`);
    await shot(name);
  }
  await page.click('[data-tab=room]');
  await page.getByLabel('Zones').check();
  await page.getByLabel('Grid (0.5 m)').check();
  await shot('04-plan-zones-grid');
  await page.getByLabel('Zones').uncheck();
  await page.getByLabel('Grid (0.5 m)').uncheck();

  // Walk from the street through the open door until the back wall stops us.
  // The container used for CI has no GPU (software rendering at a few FPS), so movement checks run at
  // Low quality and a faster walk speed. Movement uses elapsed time (capped at 0.1 s per frame), so this only shortens the test.
  await page.evaluate(() => window.__tourfirm.getState().set({ quality: 'low', walkSpeed: 4 }));
  await page.selectOption('[data-testid=preset]', 'street');
  await frames(4);
  let s = await state();
  check(s.mode === 'walk' && Math.abs(s.walk.y + 3) < 0.05, `"Street" preset puts the walker outside (y = ${s.walk.y.toFixed(2)} m)`);
  await shot('05-walk-street');
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__tourfirm.walk.y > 1, null, { timeout: 60000 });
  check(true, 'Walker passed through the open entrance door');
  await page.waitForFunction(() => window.__tourfirm.walk.y > 5.6, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  s = await state();
  await page.keyboard.up('w');
  const backLimit = s.room.depth - 0.25;
  check(s.walk.y <= backLimit + 0.01 && s.walk.y > backLimit - 0.1, `Collision stops the walker at the back wall (y = ${s.walk.y.toFixed(3)} m, limit ${backLimit.toFixed(2)} m)`);

  // Closed door blocks the way in
  await page.getByTestId('door-open').uncheck();
  await preset('street');
  await page.keyboard.down('w');
  // Hold W until the walker stops moving: no progress over at least 10 rendered frames (or 60 s).
  // Counting frames, not seconds, keeps this reliable when software rendering is slow.
  let last = { y: -99, frames: 0 };
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const cur = await state();
    if (cur.frames - last.frames >= 10) {
      if (Math.abs(cur.walk.y - last.y) < 0.005) break;
      last = { y: cur.walk.y, frames: cur.frames };
    }
  }
  await page.keyboard.up('w');
  s = await state();
  check(s.walk.y < -0.2 && s.walk.y > -0.4, `Closed door blocks entry (y = ${s.walk.y.toFixed(3)} m)`);
  await page.getByTestId('door-open').check();

  // Turning and strafing
  await preset('entrance');
  const yaw0 = (await state()).walk.yaw;
  await page.keyboard.down('q'); await frames(10); await page.keyboard.up('q');
  check((await state()).walk.yaw > yaw0 + 0.2, 'Q turns the walker left');

  await page.evaluate(() => window.__tourfirm.getState().set({ quality: 'balanced', walkSpeed: 1.4 }));

  // Interior presets
  for (const [id, name] of [['entrance', '06-walk-entrance'], ['lounge', '07-walk-lounge'], ['visitor', '08-walk-client-at-desk'], ['consultant', '09-walk-consultant-view'], ['tea', '10-walk-tea-storage'], ['destination', '11-walk-destination-wall']]) {
    await preset(id);
    await shot(name);
  }

  // Room resizing rebuilds geometry; shrinking flags furniture outside
  await preset('dollhouse');
  await page.click('[data-tab=room]');
  await page.fill('[data-testid=room-width]', '12');
  await page.fill('[data-testid=room-depth]', '7');
  await frames(6);
  s = await state();
  check(s.room.width === 12 && s.room.depth === 7, `Room resized to ${s.room.width} × ${s.room.depth} m`);
  const win = s.room.facade.windows;
  check(win.length === 2 && win[1].x1 <= 12 && win[0].x1 <= s.room.facade.door.x0, 'Facade windows re-derived around the entrance');
  await preset('dollhouse');
  await shot('12-resized-12x7');
  await page.fill('[data-testid=room-width]', '8');
  await page.fill('[data-testid=room-depth]', '5');
  await frames(6);
  const warn = await page.getByTestId('outside-warning').textContent().catch(() => null);
  check(!!warn, `Shrinking the room warns about furniture outside it ("${warn?.trim()}")`);
  await preset('dollhouse');
  await shot('13-resized-8x5-warning');
  await page.click('text=Reset room to 10 × 6 m');
  await frames(4);
  s = await state();
  check(s.room.width === 10 && s.room.depth === 6, 'Reset restores 10 × 6 m');

  // Language switch
  await page.selectOption('[data-testid=lang]', 'ru');
  const ruText = await page.locator('.toolbar').textContent();
  check(ruText.includes('Прогулка'), 'Russian UI strings load');
  await page.selectOption('[data-testid=lang]', 'uz');
  const uzText = await page.locator('.toolbar').textContent();
  check(uzText.includes('Yurish'), 'Uzbek UI strings load');
  await preset('overview');
  await shot('14-uzbek-ui');
  await page.selectOption('[data-testid=lang]', 'en');

  // Brand editing updates the placeholder brand everywhere
  await page.click('[data-tab=brand]');
  await page.fill('[data-testid=brand-name]', 'Silk Road Travel');
  await frames(4);
  s = await state();
  const brand = await page.evaluate(() => window.__tourfirm.getState().brandName);
  check(brand === 'Silk Road Travel', `Brand name is editable ("${brand}")`);
  await preset('entrance');
  await shot('15-brand-edited');
  await page.fill('[data-testid=brand-name]', 'YOUR BRAND');
  await page.evaluate(() => document.activeElement?.blur());

  // ---------- Phase 4: editor ----------
  // Low quality keeps software rendering responsive in the GPU-less test container.
  await page.evaluate(() => window.__tourfirm.getState().set({ quality: 'low' }));
  await page.click('[data-tab=design]');
  const st = () => page.evaluate(() => {
    const s = window.__tourfirm.getState();
    return { selected: s.selected, past: s.past.length, future: s.future.length, items: s.layout.items, conflicts: null };
  });
  const item = async (id) => (await st()).items.find((i) => i.id === id);
  await preset('plan');
  await frames(6);
  // Click selects, drag moves (with snapping), one undo step
  let [sx, sy] = await page.evaluate(() => window.__tourfirm.project(2.0, 1.95, 0.42));
  await page.mouse.click(sx, sy);
  await frames(3);
  check((await st()).selected === 'coffee-table', 'Clicking furniture selects it');
  check(await page.getByTestId('inspector').isVisible(), 'Inspector opens for the selected item');
  [sx, sy] = await page.evaluate(() => window.__tourfirm.project(2.0, 1.95, 0.42));
  const [tx] = await page.evaluate(() => window.__tourfirm.project(2.3, 1.95, 0.42));
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) { await page.mouse.move(sx + ((tx - sx) * k) / 6, sy); await frames(1); }
  await page.mouse.up();
  await frames(3);
  let ct = await item('coffee-table');
  check(Math.abs(ct.x - 2.3) < 0.051 && ct.y === 1.95, `Dragging moves the selected item (x = ${ct.x} m, snapped)`);
  await shot('18-editor-plan-drag');
  await page.click('[data-testid=undo]');
  ct = await item('coffee-table');
  const fut = (await st()).future;
  check(ct.x === 2 && fut === 1, `Undo restores the previous position (x = ${ct.x}, redo steps = ${fut})`);
  await page.click('[data-testid=redo]');
  ct = await item('coffee-table');
  check(Math.abs(ct.x - 2.3) < 0.051, 'Redo re-applies the move');
  await page.keyboard.press('Control+z');

  // Rotate, colour, duplicate, delete
  await page.click('[data-testid=rotate-right]');
  ct = await item('coffee-table');
  check(ct.faces === '+x' && ct.w === 0.6 && ct.d === 1, 'Rotate turns the item 90° and swaps its footprint');
  await page.keyboard.press('Control+z');
  await page.click('.inspector .swatch >> nth=5');
  ct = await item('coffee-table');
  check(!!ct.color, `Colour swatch sets a finish colour (${ct.color})`);
  const n0 = (await st()).items.length;
  await page.click('[data-testid=duplicate]');
  let s1 = await st();
  check(s1.items.length === n0 + 1 && s1.selected !== 'coffee-table', `Duplicate adds a copy (${s1.selected})`);
  await page.click('[data-testid=delete]');
  s1 = await st();
  check(s1.items.length === n0 && s1.selected === null, 'Delete removes the selected item');

  // Add from the catalogue
  await page.click('details.cat:has-text("Seating") summary');
  await page.click('[data-catalog=armchair]');
  s1 = await st();
  const added = s1.items.find((i) => i.id === s1.selected);
  check(s1.items.length === n0 + 1 && added?.catalogId === 'armchair', `Catalogue adds an armchair at a free spot (${added?.x}, ${added?.y})`);
  const badge = await page.getByTestId('checks-badge').textContent();
  check(badge.includes('✓'), `New item is placed without collisions (badge "${badge.trim()}")`);

  // Collision warning: move the new armchair onto the sofa via the inspector
  await page.fill('[data-testid=item-x]', '2');
  await page.fill('[data-testid=item-y]', '0.75');
  await frames(3);
  const badge2 = await page.getByTestId('checks-badge').textContent();
  check(badge2.includes('⚠'), `Overlap is flagged in the toolbar (badge "${badge2.trim()}")`);
  await shot('19-editor-collision-warning');
  await page.click('[data-testid=delete]');

  // Finishes
  await page.selectOption('#floor-finish', 'stone');
  check((await page.evaluate(() => window.__tourfirm.getState().layout.finishes?.floor)) === 'stone', 'Floor finish can be changed');
  await preset('dollhouse');
  await shot('20-editor-stone-floor');
  await page.keyboard.press('Control+z');

  // Access check
  await page.click('[data-tab=room]');
  await page.click('[data-testid=access-check]');
  await page.waitForSelector('[data-testid=access-result]', { timeout: 30000 });
  const access = await page.getByTestId('access-result').textContent();
  check(!access.includes('Cannot be reached'), 'Access check: everything reachable from the entrance');

  // Budget
  await page.click('[data-tab=budget]');
  const total1 = await page.getByTestId('budget-total').textContent();
  await page.fill('table.budget input[aria-label="3-seat sofa Unit $"]', '600');
  const total2 = await page.getByTestId('budget-total').textContent();
  check(total1 !== total2 && total2.includes('$'), 'Editing a price updates the budget total');
  await shot('21-budget');

  // Versions: save, change, load back
  await page.click('[data-tab=project]');
  await page.fill('[data-testid=project-name]', 'Test version A');
  await page.click('[data-testid=save-version]');
  await page.waitForSelector('[data-testid=versions] li', { timeout: 10000 });
  await page.evaluate(() => window.__tourfirm.getState().moveItem('sofa', 2.0, 1.0));
  await page.click('[data-testid=versions] li >> text=Load');
  await frames(2);
  const sofa = await item('sofa');
  check(sofa.y === 0.75, 'Loading a saved version restores it');
  await shot('22-project-versions');

  // JSON import (paste)
  const json = await page.evaluate(() => JSON.stringify({ ...window.__tourfirm.getState().toProject('Imported test'), }));
  await page.fill('[data-testid=paste-json]', json);
  await page.click('[data-testid=import-pasted]');
  check((await page.evaluate(() => window.__tourfirm.getState().projectName)) === 'Imported test', 'Pasted JSON project is imported');
  await page.fill('[data-testid=paste-json]', '{"hello": 1}');
  await page.click('[data-testid=import-pasted]');
  check(await page.locator('[role=alert]').isVisible(), 'Invalid JSON shows a clear error');

  // Autosave survives a reload
  await page.evaluate(() => window.__tourfirm.getState().moveItem('side-table', 0.6, 0.75));
  await page.evaluate(() => window.__tourfirm.flushAutosave());
  await page.goto(`${BASE}?auto=0&quality=low`);
  await page.waitForFunction(() => window.__tourfirm && window.__tourfirm.frames > 3, null, { timeout: 60000 });
  await page.waitForFunction(() => window.__tourfirm.getState().layout.items.find((i) => i.id === 'side-table')?.x === 0.6, null, { timeout: 10000 }).catch(() => {});
  const sideX = (await item('side-table')).x;
  check(sideX === 0.6, `Autosave restores the design after a reload (side table x = ${sideX})`);
  await page.evaluate(() => window.__tourfirm.getState().set({ quality: 'balanced' }));

  // Help overlay
  await page.keyboard.press('h');
  check(await page.locator('.modal').isVisible(), 'H opens the controls guide');
  await shot('23-help');
  await page.keyboard.press('Escape');

  // Phone-sized viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await preset('overview');
  await shot('24-phone-overview');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, 'No horizontal page overflow at phone width');

  s = await state();
  const allErrors = [...errors, ...s.errors];
  check(allErrors.length === 0, `No console or page errors${allErrors.length ? `: ${allErrors.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  const st = await state().catch(() => null);
  check(false, `Unexpected failure: ${e.message.split('\n')[0]} | state: ${JSON.stringify(st && { walk: st.walk, mode: st.mode, frames: st.frames })}`);
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
} finally {
  await browser.close();
  stop();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} end-to-end checks passed. Screenshots: ${OUT}/`);
process.exit(failed ? 1 : 0);
