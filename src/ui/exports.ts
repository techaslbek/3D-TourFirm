import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { computeBudget } from '../core/budget';
import { renderPlanSvg } from '../core/planSvg';
import { debug } from '../debug';
import { useStore } from '../state/store';

/*
 * File exports. Inside claude.ai the page cannot download directly, so files go through the
 * viewer's `downloads` capability (the viewer confirms each save). Run locally, a normal
 * browser download is used. GLB is not on claude.ai's allowed file types, so it is local-only.
 */

export type SaveResult = 'saved' | 'declined' | 'unavailable' | 'rejected';

interface DownloadsNs { save(req: { filename: string; data: Blob | string | ArrayBuffer }): Promise<unknown> }
interface ClaudeWindow { claude?: { use?: (name: string) => Promise<unknown> } }

/** True when the page runs inside the claude.ai artifact viewer. */
export const inViewer = () => typeof (window as unknown as ClaudeWindow).claude?.use === 'function';

export async function saveFile(filename: string, data: Blob | string): Promise<SaveResult> {
  if (inViewer()) {
    const dl = (await (window as unknown as ClaudeWindow).claude!.use!('downloads').catch(() => null)) as DownloadsNs | null;
    if (!dl) return 'unavailable';
    try {
      await dl.save({ filename, data });
      return 'saved';
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return 'declined';
      if (code === 'rejected_extension' || code === 'extension_not_enabled') return 'rejected';
      return 'unavailable';
    }
  }
  const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'saved';
}

export const safeName = (s: string) => (s || 'office-design').replace(/[^\p{L}\p{N}\- ]+/gu, '').trim().replace(/\s+/g, '-') || 'office-design';

/** Hooks set by the 3D scene (see Scene.tsx) so the UI can render and export it. */
export const sceneHooks: {
  capture: (scale: number) => Promise<Blob>;
  objects: () => THREE.Object3D[];
} = {
  capture: async () => { throw new Error('Scene not ready'); },
  objects: () => [],
};

export async function screenshotBlob(scale = 1): Promise<Blob> {
  return sceneHooks.capture(scale);
}

export function planSvg(): string {
  const s = useStore.getState();
  return renderPlanSvg(s.layout, { title: `${s.projectName} · ${s.brandName}` });
}

export async function planPng(scale = 2): Promise<Blob> {
  const svg = planSvg();
  const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/) ?? ['', '1330', '750'];
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Plan image failed')); img.src = url; });
    const c = document.createElement('canvas');
    c.width = +w * scale;
    c.height = +h * scale;
    const g = c.getContext('2d')!;
    g.scale(scale, scale);
    g.drawImage(img, 0, 0, +w, +h);
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Binary glTF of the room, furniture and wall items (lights and helpers left out). */
export async function glb(): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const objects = sceneHooks.objects();
  const result = await exporter.parseAsync(objects, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
  return result as ArrayBuffer;
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function budgetCsv(): string {
  const s = useStore.getState();
  const b = computeBudget(s.layout, s.budget);
  const rows: (string | number)[][] = [['Group', 'Item', 'Qty', 'Unit USD', 'Total USD', 'Total UZS', 'Verified']];
  for (const l of b.lines) rows.push([l.group, l.label, l.qty, l.unitUsd, l.totalUsd, Math.round(l.totalUsd * s.budget.rate), l.verified ? 'yes' : 'no (placeholder)']);
  rows.push([]);
  rows.push(['', 'Subtotal', '', '', Math.round(b.subtotalUsd), Math.round(b.subtotalUsd * s.budget.rate), '']);
  rows.push(['', `Contingency ${s.budget.contingencyPct}%`, '', '', Math.round(b.contingencyUsd), Math.round(b.contingencyUsd * s.budget.rate), '']);
  rows.push(['', 'Total', '', '', Math.round(b.totalUsd), Math.round(b.totalUsd * s.budget.rate), '']);
  rows.push(['', `Exchange rate: ${s.budget.rate} UZS per USD (placeholder, check the current rate)`]);
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

// Read-only hooks for the end-to-end test.
debug.exports = { planSvg, budgetCsv, glbSize: async () => (await glb()).byteLength, screenshotSize: async () => (await screenshotBlob(1)).size };
