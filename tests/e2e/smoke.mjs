#!/usr/bin/env node
// End-to-end smoke test against the production build (run `npm run build` first).
// Starts `vite preview`, drives the app in headless Chromium, checks navigation/collision via the
// window.__tourfirm debug hook, and writes screenshots to docs/phase-2/screenshots.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
const OUT = 'docs/phase-2/screenshots';
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
  await page.goto(`${BASE}?auto=0&quality=balanced`);
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
  await page.waitForTimeout(3000);
  await page.keyboard.up('w');
  s = await state();
  check(s.walk.y < -0.2, `Closed door blocks entry (y = ${s.walk.y.toFixed(3)} m)`);
  await page.getByTestId('door-open').check();

  // Turning and strafing
  await preset('entrance');
  const yaw0 = (await state()).walk.yaw;
  await page.keyboard.down('q'); await page.waitForTimeout(1500); await page.keyboard.up('q');
  check((await state()).walk.yaw > yaw0 + 0.2, 'Q turns the walker left');

  await page.evaluate(() => window.__tourfirm.getState().set({ quality: 'balanced', walkSpeed: 1.4 }));

  // Interior presets
  for (const [id, name] of [['entrance', '06-walk-entrance'], ['lounge', '07-walk-lounge'], ['visitor', '08-walk-client-at-desk'], ['consultant', '09-walk-consultant-view'], ['tea', '10-walk-tea-storage'], ['destination', '11-walk-destination-wall']]) {
    await preset(id);
    await shot(name);
  }

  // Room resizing rebuilds geometry; shrinking flags furniture outside
  await preset('dollhouse');
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

  // Help overlay
  await page.keyboard.press('h');
  check(await page.locator('.modal').isVisible(), 'H opens the controls guide');
  await shot('15-help');
  await page.keyboard.press('Escape');

  // Phone-sized viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await preset('overview');
  await shot('16-phone-overview');
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
