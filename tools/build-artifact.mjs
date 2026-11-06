#!/usr/bin/env node
// Packs the production build (dist/) into ONE self-contained HTML file: JS and CSS inlined,
// no external requests. Used to publish the app as a claude.ai Artifact or to open it from disk.
// Usage: npm run build && node tools/build-artifact.mjs [output.html]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'dist/tashkent-office-sandbox.html';
const html = readFileSync('dist/index.html', 'utf8');
const js = html.match(/<script[^>]*src="\.?\/?([^"]+\.js)"[^>]*><\/script>/);
const css = html.match(/<link[^>]*href="\.?\/?([^"]+\.css)"[^>]*>/);
if (!js) throw new Error('No script found in dist/index.html. Run npm run build first.');
// "</script" inside the bundle would end the inline script early; this escape is equivalent in JS.
const code = readFileSync(join('dist', js[1]), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const style = css ? readFileSync(join('dist', css[1]), 'utf8') : '';
const page = `<title>Tashkent Office Sandbox</title>
<style>${style}</style>
<div id="root"></div>
<script type="module">${code}</script>
`;
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);
