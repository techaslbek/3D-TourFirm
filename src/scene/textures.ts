import * as THREE from 'three';

/*
 * Procedural textures drawn on canvases at runtime. Nothing is downloaded and no photographed
 * artwork is copied: the carpet, suzani, ikat and lattice patterns are generated from simple
 * geometric rules inspired by the traditions, so there are no licence questions.
 * A seeded random generator keeps every texture identical between runs (stable screenshots).
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function toTexture(c: HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(...opts.repeat);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const cache = new Map<string, THREE.Texture>();
function cached(key: string, make: () => THREE.Texture) {
  let t = cache.get(key);
  if (!t) { t = make(); cache.set(key, t); }
  return t;
}

const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

/** Oak plank floor. One tile = 2.4 × 2.4 m (planks 0.2 m wide, 1.2 m long, staggered). */
export function oakFloor() {
  return cached('oakFloor', () => {
    const size = 1024, r = rng(7);
    const { c, g } = canvas(size, size);
    const pw = size / 12, pl = size / 2;
    for (let col = 0; col < 12; col++) {
      const offset = (col % 3) * (pl / 3);
      for (let k = -1; k < 3; k++) {
        const y0 = k * pl + offset;
        const l = 52 + r() * 10, h = 30 + r() * 6, s = 38 + r() * 10;
        g.fillStyle = hsl(h, s, l);
        g.fillRect(col * pw, y0, pw, pl);
        // Grain: long thin wavy lines
        for (let n = 0; n < 14; n++) {
          g.strokeStyle = `rgba(90,55,25,${0.05 + r() * 0.08})`;
          g.lineWidth = 0.6 + r() * 1.4;
          g.beginPath();
          const x = col * pw + r() * pw;
          g.moveTo(x, y0);
          for (let y = y0; y <= y0 + pl; y += 32) g.lineTo(x + Math.sin(y * 0.02 + n) * 2.2, y);
          g.stroke();
        }
        g.fillStyle = 'rgba(60,35,15,0.35)';
        g.fillRect(col * pw, y0, pw, 1.5);
      }
      g.fillStyle = 'rgba(60,35,15,0.4)';
      g.fillRect(col * pw, 0, 1.5, size);
    }
    return toTexture(c);
  });
}

/** Fine noise used for plaster walls, felt and the ceiling (grayscale, tinted by material colour). */
export function noise(key: string, contrast: number, scale = 1) {
  return cached(`noise-${key}`, () => {
    const size = 256, r = rng(key.length * 97 + contrast * 1000);
    const { c, g } = canvas(size, size);
    const img = g.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const v = 255 - r() * 255 * contrast;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // Soft blotches for plaster
    for (let k = 0; k < 40 * scale; k++) {
      g.fillStyle = `rgba(0,0,0,${r() * contrast * 0.25})`;
      g.beginPath();
      g.arc(r() * size, r() * size, 6 + r() * 30, 0, Math.PI * 2);
      g.fill();
    }
    return toTexture(c);
  });
}

/** Woven upholstery fabric (grayscale, tinted by material colour). */
export function fabricWeave() {
  return cached('fabric', () => {
    const size = 256, r = rng(3);
    const { c, g } = canvas(size, size);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) for (let x = 0; x < size; x += 4) {
      const v = ((x + y) / 4) % 2 ? 0.1 : 0.03;
      g.fillStyle = `rgba(0,0,0,${v + r() * 0.06})`;
      g.fillRect(x, y, 4, 4);
    }
    return toTexture(c, { repeat: [4, 4] });
  });
}

/** Oak veneer for table tops and cabinets (tinted lightly by material colour). */
export function woodGrain(key = 'oak') {
  return cached(`grain-${key}`, () => {
    const w = 512, h = 512, r = rng(11);
    const { c, g } = canvas(w, h);
    g.fillStyle = '#f2e3cc';
    g.fillRect(0, 0, w, h);
    for (let n = 0; n < 90; n++) {
      g.strokeStyle = `rgba(120,80,40,${0.04 + r() * 0.1})`;
      g.lineWidth = 0.5 + r() * 2.5;
      g.beginPath();
      const y = r() * h;
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 24) g.lineTo(x, y + Math.sin(x * 0.01 + n) * 5 + Math.sin(x * 0.043) * 2);
      g.stroke();
    }
    return toTexture(c);
  });
}

const CARPET = { red: '#8e1f1c', deep: '#5a1412', navy: '#1d2a4d', ivory: '#efe2c4', gold: '#c8913a', green: '#3f5a3a' };

/** Uzbek/Turkmen-inspired carpet: borders and a field of octagonal "gul" medallions. 3 × 2 m. */
export function carpet() {
  return cached('carpet', () => {
    const w = 1200, h = 800, r = rng(21);
    const { c, g } = canvas(w, h);
    g.fillStyle = CARPET.red;
    g.fillRect(0, 0, w, h);
    // Borders
    const band = (inset: number, width: number, color: string) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.strokeRect(inset + width / 2, inset + width / 2, w - 2 * inset - width, h - 2 * inset - width);
    };
    band(0, 18, CARPET.deep);
    band(18, 6, CARPET.ivory);
    band(24, 46, CARPET.navy);
    band(70, 6, CARPET.ivory);
    // Border motif: small diamonds along the navy band
    g.fillStyle = CARPET.gold;
    const diamond = (x: number, y: number, s: number) => {
      g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath(); g.fill();
    };
    for (let x = 60; x < w - 40; x += 40) { diamond(x, 47, 11); diamond(x, h - 47, 11); }
    for (let y = 60; y < h - 40; y += 40) { diamond(47, y, 11); diamond(w - 47, y, 11); }
    // Field of guls
    const fx0 = 96, fy0 = 96, fw = w - 192, fh = h - 192;
    const cols = 4, rows = 3;
    const gul = (cx: number, cy: number, rx: number, ry: number) => {
      const oct = (sx: number, sy: number, color: string) => {
        g.fillStyle = color;
        g.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
          g.lineTo(cx + Math.cos(a) * sx, cy + Math.sin(a) * sy);
        }
        g.closePath();
        g.fill();
      };
      oct(rx, ry, CARPET.ivory);
      oct(rx * 0.9, ry * 0.9, CARPET.deep);
      // Quartered centre in navy and green, like a Tekke gul
      g.save();
      g.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        g.lineTo(cx + Math.cos(a) * rx * 0.78, cy + Math.sin(a) * ry * 0.78);
      }
      g.closePath();
      g.clip();
      g.fillStyle = CARPET.navy; g.fillRect(cx - rx, cy - ry, rx, ry); g.fillRect(cx, cy, rx, ry);
      g.fillStyle = CARPET.green; g.fillRect(cx, cy - ry, rx, ry); g.fillRect(cx - rx, cy, rx, ry);
      g.restore();
      g.fillStyle = CARPET.gold;
      diamond(cx, cy, Math.min(rx, ry) * 0.28);
      g.fillStyle = CARPET.ivory;
      diamond(cx, cy, Math.min(rx, ry) * 0.12);
    };
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      gul(fx0 + fw * (i + 0.5) / cols, fy0 + fh * (j + 0.5) / rows, fw / cols * 0.36, fh / rows * 0.36);
    }
    // Minor guls between
    for (let i = 1; i < cols; i++) for (let j = 1; j < rows; j++) {
      g.fillStyle = CARPET.navy;
      diamond(fx0 + fw * i / cols, fy0 + fh * j / rows, 18);
      g.fillStyle = CARPET.gold;
      diamond(fx0 + fw * i / cols, fy0 + fh * j / rows, 7);
    }
    // Wool texture
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 22;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Suzani-inspired embroidery: large rosettes with petal rings and vines on an ivory ground. */
export function suzani() {
  return cached('suzani', () => {
    const w = 700, h = 550, r = rng(5);
    const { c, g } = canvas(w, h);
    g.fillStyle = '#efe4cc';
    g.fillRect(0, 0, w, h);
    const colors = ['#a3221d', '#7a1a2e', '#c4572a', '#2d3e66'];
    // Vines
    g.strokeStyle = '#3f5a3a';
    g.lineWidth = 5;
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.moveTo(r() * w, r() * h);
      g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h);
      g.stroke();
    }
    const rosette = (cx: number, cy: number, R: number, ci: number) => {
      const petals = 12;
      for (let k = 0; k < petals; k++) {
        const a = (k / petals) * Math.PI * 2;
        g.fillStyle = colors[(ci + 1) % colors.length];
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78, R * 0.28, R * 0.14, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = colors[ci];
      g.beginPath(); g.arc(cx, cy, R * 0.62, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#efe4cc'; g.lineWidth = R * 0.05;
      g.beginPath(); g.arc(cx, cy, R * 0.48, 0, Math.PI * 2); g.stroke();
      g.fillStyle = colors[(ci + 2) % colors.length];
      g.beginPath(); g.arc(cx, cy, R * 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e0a43a';
      g.beginPath(); g.arc(cx, cy, R * 0.1, 0, Math.PI * 2); g.fill();
    };
    rosette(w * 0.5, h * 0.5, 120, 0);
    rosette(w * 0.17, h * 0.22, 62, 1);
    rosette(w * 0.83, h * 0.22, 62, 1);
    rosette(w * 0.17, h * 0.78, 62, 1);
    rosette(w * 0.83, h * 0.78, 62, 1);
    for (const [x, y] of [[0.5, 0.1], [0.5, 0.9], [0.06, 0.5], [0.94, 0.5]]) rosette(w * x, h * y, 34, 2);
    // Border
    g.strokeStyle = '#a3221d'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

/** Ikat / adras-inspired cushion fabric: feathered vertical motifs. */
export function ikat(palette: string[], seed = 1) {
  return cached(`ikat-${palette.join()}-${seed}`, () => {
    const w = 256, h = 256, r = rng(seed);
    const { c, g } = canvas(w, h);
    g.fillStyle = palette[0];
    g.fillRect(0, 0, w, h);
    const cols = 4;
    for (let k = 0; k < cols; k++) {
      const cx = (k + 0.5) * (w / cols);
      for (let y = 0; y < h; y += 2) {
        const phase = Math.sin((y / h) * Math.PI * 4 + k);
        const half = 10 + Math.abs(phase) * 18 + r() * 4;
        g.fillStyle = palette[1 + ((k + (phase > 0 ? 0 : 1)) % (palette.length - 1))];
        g.fillRect(cx - half + (r() - 0.5) * 6, y, half * 2, 2);
      }
    }
    return toTexture(c);
  });
}

/** Girih-style lattice used as an alpha map: white = solid wood, black = open. */
export function lattice() {
  return cached('lattice', () => {
    const size = 512;
    const { c, g } = canvas(size, size);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#000';
    const cell = size / 4;
    const star = (cx: number, cy: number, R: number, r: number) => {
      g.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + Math.PI / 8;
        const rad = k % 2 ? r : R;
        g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      g.closePath();
      g.fill();
    };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell;
      star(cx, cy, cell * 0.38, cell * 0.28);
      // Small cross-shaped openings at the corners between stars
      g.fillRect(i * cell - cell * 0.07, j * cell - cell * 0.07, cell * 0.14, cell * 0.14);
    }
    // Fill white ring inside each star again to leave a carved rosette in the centre
    g.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.beginPath();
      g.arc((i + 0.5) * cell, (j + 0.5) * cell, cell * 0.12, 0, Math.PI * 2);
      g.fill();
    }
    return toTexture(c, { srgb: false });
  });
}

const POSTER_STYLE: Record<string, { sky: [string, string]; ground: string; sun: string }> = {
  turkey: { sky: ['#f4a259', '#5b8e7d'], ground: '#8c3b2e', sun: '#fbe3b2' },
  vietnam: { sky: ['#bfe3c0', '#3d7a5a'], ground: '#2c4f3b', sun: '#f6f2c4' },
  egypt: { sky: ['#f7c873', '#d98e3e'], ground: '#b9783a', sun: '#fff1c9' },
  maldives: { sky: ['#9fd8e6', '#2a8c8c'], ground: '#1f6f8b', sun: '#fff7da' },
  china: { sky: ['#f2b8a2', '#a3221d'], ground: '#5a1412', sun: '#ffe6b0' },
};

/**
 * Simple illustrative destination poster (no photos): gradient sky, sun, horizon and the name.
 * Editable text; styles fall back to a neutral scheme for unknown destinations.
 */
export function poster(name: string, brand: string, landscape = false): THREE.Texture {
  // Not cached: the text is editable, so the caller owns and disposes this texture.
  return (() => {
    const w = landscape ? 640 : 360, h = landscape ? 360 : 500;
    const k = h / 500;
    const { c, g } = canvas(w, h);
    const st = POSTER_STYLE[name.trim().toLowerCase()] ?? { sky: ['#e3d3bb', '#6b4a2f'], ground: '#3b3026', sun: '#f4eee4' };
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, st.sky[0]);
    grad.addColorStop(1, st.sky[1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = st.sun;
    g.beginPath(); g.arc(w * 0.66, h * 0.36, 52 * k, 0, Math.PI * 2); g.fill();
    g.fillStyle = st.ground;
    g.beginPath();
    g.moveTo(0, h * 0.62);
    for (let x = 0; x <= w; x += 20) g.lineTo(x, h * 0.62 - Math.sin(x * 0.03) * 14 - Math.sin(x * 0.011) * 22);
    g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
    g.fillStyle = '#fbf8f3';
    g.textAlign = 'center';
    g.font = `700 ${Math.round(46 * k * (landscape ? 1.3 : 1))}px "Segoe UI", Inter, Arial, sans-serif`;
    g.fillText(name.toUpperCase(), w / 2, h * 0.84, w * 0.86);
    g.font = `400 ${Math.round(18 * k * (landscape ? 1.3 : 1))}px "Segoe UI", Inter, Arial, sans-serif`;
    g.globalAlpha = 0.85;
    g.fillText(brand, w / 2, h * 0.92, w * 0.86);
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  })();
}

/** Rishtan-style lagan (decorative plate): cobalt and turquoise petals and dots on a white glaze. */
export function lagan() {
  return cached('lagan', () => {
    const size = 512;
    const { c, g } = canvas(size, size);
    const cx = size / 2, R = size / 2;
    g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#1f4e8c'; g.beginPath(); g.arc(cx, cx, R * 0.98, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f6f2ea'; g.beginPath(); g.arc(cx, cx, R * 0.86, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      g.fillStyle = k % 2 ? '#2a8c8c' : '#1f4e8c';
      g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.92, cx + Math.sin(a) * R * 0.92, R * 0.035, 0, Math.PI * 2); g.fill();
    }
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 8 : 12, rr = ring ? 0.36 : 0.64, len = ring ? 0.2 : 0.2;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.2;
        g.fillStyle = ring ? '#2a8c8c' : '#1f4e8c';
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * R * rr, cx + Math.sin(a) * R * rr, R * len, R * 0.07, a, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = '#1f4e8c'; g.beginPath(); g.arc(cx, cx, R * 0.16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e0a43a'; g.beginPath(); g.arc(cx, cx, R * 0.07, 0, Math.PI * 2); g.fill();
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}
