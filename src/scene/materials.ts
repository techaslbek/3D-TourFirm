import * as THREE from 'three';
import { PALETTE } from './palette';
import { carpet, fabricWeave, ikat, lagan, lattice, noise, oakFloor, suzani, woodGrain } from './textures';

/*
 * Shared PBR materials. Created once and reused by every model, which keeps GPU memory and
 * shader compilations low on integrated graphics. Editing materials per object arrives in Phase 4.
 */
const cache = new Map<string, THREE.Material>();
function mat<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) { m = make(); cache.set(key, m); }
  return m;
}
const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

export const M = {
  oak: () => mat('oak', () => std({ color: '#c99a62', map: woodGrain(), roughness: 0.55 })),
  walnut: () => mat('walnut', () => std({ color: '#7a5233', map: woodGrain(), roughness: 0.5 })),
  ivoryLacquer: () => mat('ivoryLacquer', () => std({ color: '#efe7da', roughness: 0.42 })),
  sandLacquer: () => mat('sandLacquer', () => std({ color: '#d9c7ab', roughness: 0.5 })),
  fabricSand: () => mat('fabricSand', () => std({ color: '#d8c3a2', map: fabricWeave(), roughness: 0.95 })),
  fabricTerracotta: () => mat('fabricTerracotta', () => std({ color: '#b5603f', map: fabricWeave(), roughness: 0.95 })),
  fabricSaffron: () => mat('fabricSaffron', () => std({ color: '#d99b3a', map: fabricWeave(), roughness: 0.95 })),
  fabricCobalt: () => mat('fabricCobalt', () => std({ color: '#2d548f', map: fabricWeave(), roughness: 0.95 })),
  fabricCharcoal: () => mat('fabricCharcoal', () => std({ color: '#3b3836', map: fabricWeave(), roughness: 0.95 })),
  felt: () => mat('felt', () => std({ color: '#5f7d86', map: noise('felt', 0.25), roughness: 1 })),
  feltDark: () => mat('feltDark', () => std({ color: '#2b2a29', map: noise('felt', 0.25), roughness: 1 })),
  metalBlack: () => mat('metalBlack', () => std({ color: '#26262a', roughness: 0.45, metalness: 0.6 })),
  chrome: () => mat('chrome', () => std({ color: '#d7d9dc', roughness: 0.18, metalness: 1 })),
  plasticWhite: () => mat('plasticWhite', () => std({ color: '#f3f3f1', roughness: 0.4 })),
  plasticGrey: () => mat('plasticGrey', () => std({ color: '#8d9096', roughness: 0.5 })),
  plasticDark: () => mat('plasticDark', () => std({ color: '#2f3033', roughness: 0.55 })),
  screen: () => mat('screen', () => std({ color: '#0d0f12', roughness: 0.2, metalness: 0.2 })),
  monitorOn: () => mat('monitorOn', () => std({ color: '#1c2633', emissive: '#bcd3ea', emissiveIntensity: 0.55, roughness: 0.3 })),
  ceramicCobalt: () => mat('ceramicCobalt', () => std({ color: PALETTE.cobalt, roughness: 0.25 })),
  ceramicTurquoise: () => mat('ceramicTurquoise', () => std({ color: '#2a8c8c', roughness: 0.25 })),
  ceramicWhite: () => mat('ceramicWhite', () => std({ color: '#f6f2ea', roughness: 0.25 })),
  terracottaPot: () => mat('terracottaPot', () => std({ color: '#a9573a', roughness: 0.85, map: noise('pot', 0.2) })),
  soil: () => mat('soil', () => std({ color: '#3a2a1d', roughness: 1 })),
  leaf: () => mat('leaf', () => std({ color: '#4f7a3a', roughness: 0.7, flatShading: true })),
  leafDark: () => mat('leafDark', () => std({ color: '#3a5f2c', roughness: 0.7, flatShading: true })),
  bark: () => mat('bark', () => std({ color: '#5b4330', roughness: 0.9 })),
  waterBottle: () => mat('waterBottle', () => std({ color: '#6aa7d8', roughness: 0.1, transparent: true, opacity: 0.55 })),
  paper: () => mat('paper', () => std({ color: '#f7f5ef', roughness: 0.9 })),
  lampShade: () => mat('lampShade', () => std({ color: '#f3e6c8', roughness: 0.7, side: THREE.DoubleSide, emissive: '#ffd59a', emissiveIntensity: 0.6 })),
  bulb: () => mat('bulb', () => new THREE.MeshBasicMaterial({ color: '#fff1d0', toneMapped: false })),
  lagan: () => mat('lagan', () => std({ map: lagan(), roughness: 0.2 })),
  carpet: () => mat('carpet', () => std({ map: carpet(), roughness: 1 })),
  suzani: () => mat('suzani', () => std({ map: suzani(), roughness: 0.95 })),
  ikatA: () => mat('ikatA', () => std({ map: ikat(['#efe2c4', '#a3221d', '#1f4e8c', '#e0a43a'], 2), roughness: 0.95 })),
  ikatB: () => mat('ikatB', () => std({ map: ikat(['#1f4e8c', '#efe2c4', '#2a8c8c', '#c4572a'], 5), roughness: 0.95 })),
  lattice: () => mat('lattice', () => std({ color: '#8a5a34', map: woodGrain(), alphaMap: lattice(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 })),
};

/** Floor material, with the plank texture repeated to keep real plank size (tile = 2.4 m). */
export function floorMaterial(width: number, depth: number) {
  const t = oakFloor().clone();
  t.repeat.set(width / 2.4, depth / 2.4);
  t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color: '#d8b48a', map: t, roughness: 0.6 });
}

/** Wall paint with a subtle plaster texture; the feature wall uses the sand tone. */
export function wallMaterial(color: string) {
  return new THREE.MeshStandardMaterial({ color, map: noise('plaster', 0.06, 2), roughness: 0.95 });
}
