import { ContactShadows, Environment as DreiEnvironment, Grid, Html, Lightformer } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WALL_THICKNESS } from '../core/geometry';
import { useStore, type Quality } from '../state/store';
import { useT } from '../ui/i18n';
import { DEFAULT_LIGHTING, isCeilingRect } from '../core/types';
import { kelvinToHex, PALETTE, PENDANT_HEIGHT, textTexture } from './palette';

const SHADOW_SIZE: Record<Quality, number> = { low: 512, balanced: 1024, high: 2048 };
const DPR: Record<Quality, [number, number]> = { low: [1, 1], balanced: [1, 1.5], high: [1, 2] };

/**
 * Lights. All procedural, no downloaded HDR files, so the app works offline.
 * Sources follow the lighting concept: warm 3000 K ceiling downlights, pendants over the desks
 * and coffee table, the lounge floor lamp, and daylight through the shopfront.
 * Low quality keeps 3 fill lights and no shadows; Balanced/High add the fittings and sun shadows.
 */
export function Lighting() {
  const layout = useStore((s) => s.layout);
  const quality = useStore((s) => s.quality);
  const { width: W, depth: D, ceilingHeight: H } = layout.room;
  const sun = useRef<THREE.DirectionalLight>(null);
  const setDpr = useThree((s) => s.setDpr);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio, DPR[quality][1]));
    const l = sun.current;
    if (!l) return;
    l.castShadow = quality !== 'low';
    l.shadow.mapSize.set(SHADOW_SIZE[quality], SHADOW_SIZE[quality]);
    l.shadow.map?.dispose();
    l.shadow.map = null as unknown as THREE.WebGLRenderTarget;
  }, [quality, setDpr]);

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(W / 2, 0, -D / 2);
    return o;
  }, [W, D]);

  // Ceiling fills standing in for the recessed downlights (no shadows: cheap on integrated GPUs).
  const fills = useMemo(() => {
    const pts: [number, number][] = [[W * 0.2, D * 0.35], [W * 0.5, D * 0.3], [W * 0.82, D * 0.3], [W * 0.3, D * 0.78], [W * 0.75, D * 0.72]];
    return quality === 'low' ? [pts[0], pts[2], pts[3]] : pts;
  }, [W, D, quality]);
  const pendants = layout.ceiling.filter((c) => !isCeilingRect(c)) as { id: string; x: number; y: number }[];
  const lamp = layout.items.find((i) => i.id.startsWith('floor-lamp') && !i.hidden);
  const fittings = quality !== 'low';
  const lighting = layout.lighting ?? DEFAULT_LIGHTING;
  const warm = kelvinToHex(lighting.warmth);
  const fittingColor = kelvinToHex(Math.max(2200, lighting.warmth - 300));
  const k = lighting.brightness;

  return (
    <>
      <hemisphereLight args={['#fff4e6', '#7a5c40', quality === 'low' ? 1.0 : 0.65]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        position={[W / 2 + 4, 8, 9]}
        target={target}
        intensity={2.2}
        color="#fff0dc"
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      {fills.map(([x, y]) => (
        <pointLight key={`f-${x}-${y}`} position={[x, H - 0.3, -y]} intensity={(quality === 'low' ? 6 : 4.2) * k} distance={10} decay={1.5} color={warm} />
      ))}
      {fittings && pendants.map((p) => (
        <pointLight key={p.id} position={[p.x, PENDANT_HEIGHT - 0.1, -p.y]} intensity={1.6 * k} distance={4.5} decay={2} color={fittingColor} />
      ))}
      {fittings && lamp && (
        <pointLight position={[lamp.x, lamp.h - 0.2, -lamp.y]} intensity={1.4 * k} distance={4} decay={2} color={fittingColor} />
      )}
      <DreiEnvironment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.1} color="#fff4e6" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#dfe9f2" position={[0, 2, 8]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#f3e1c8" position={[-8, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
      </DreiEnvironment>
    </>
  );
}

/**
 * Soft contact shadows under furniture and along wall bases, rendered once from the floor and
 * re-baked when the layout or quality changes (cheap enough for integrated GPUs).
 * Balanced: 1024 px. High: 2048 px. Low: off.
 * (Screen-space AO via N8AO was tried and removed: it fails with three.js r187 render targets.)
 */
export function Effects() {
  const quality = useStore((s) => s.quality);
  const layout = useStore((s) => s.layout);
  const showFurniture = useStore((s) => s.showFurniture);
  // Re-bake when anything that casts a contact shadow changes (positions, sizes, visibility).
  const signature = useMemo(
    () => layout.items.map((i) => `${i.id}:${i.x},${i.y},${i.w},${i.d},${i.h},${i.hidden ? 1 : 0}`).join('|'),
    [layout.items],
  );
  if (quality === 'low') return null;
  const { width: W, depth: D } = layout.room;
  return (
    <ContactShadows
      key={`${quality}-${W}-${D}-${showFurniture}-${signature}`}
      position={[W / 2, 0.014, -D / 2]}
      scale={[W, D]}
      resolution={quality === 'high' ? 2048 : 1024}
      frames={1}
      far={1.0}
      blur={2.2}
      opacity={0.6}
      color="#2b1d12"
    />
  );
}

export { DPR };

/** Pavement, road and a placeholder fascia sign outside the shopfront. */
export function Exterior() {
  const layout = useStore((s) => s.layout);
  const { width: W } = layout.room;
  const door = layout.room.facade.door;
  const dc = (door.x0 + door.x1) / 2;
  const T = WALL_THICKNESS;
  return (
    <group name="exterior">
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, -0.03, 20]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#8e8a82" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, -0.01, 2.2 + T]} receiveShadow>
        <planeGeometry args={[W + 8, 4.4]} />
        <meshStandardMaterial color="#c8c2b6" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, -0.02, 4.4 + T + 4]}>
        <planeGeometry args={[60, 8]} />
        <meshStandardMaterial color="#4b4c50" roughness={0.95} />
      </mesh>
      {/* Entrance mat */}
      <mesh position={[dc, 0.006, -0.55]} receiveShadow>
        <boxGeometry args={[1.2, 0.012, 0.9]} />
        <meshStandardMaterial color="#3a3836" roughness={1} />
      </mesh>
    </group>
  );
}

/** Zone tint, measurement grid and plan-mode annotations. */
export function Overlays() {
  const t = useT();
  const layout = useStore((s) => s.layout);
  const showZones = useStore((s) => s.showZones);
  const showGrid = useStore((s) => s.showGrid);
  const mode = useStore((s) => s.cameraMode);
  const { width: W, depth: D } = layout.room;
  const labels = mode === 'plan' || mode === 'dollhouse';
  return (
    <group name="overlays">
      {showZones && layout.zones.map((z) => (
        <group key={z.id}>
          <mesh rotation-x={-Math.PI / 2} position={[(z.x0 + z.x1) / 2, 0.014, -(z.y0 + z.y1) / 2]}>
            <planeGeometry args={[z.x1 - z.x0 - 0.04, z.y1 - z.y0 - 0.04]} />
            <meshBasicMaterial color={z.color} transparent opacity={0.22} depthWrite={false} />
          </mesh>
          {labels && (
            <Html position={[(z.x0 + z.x1) / 2, 0.05, -(z.y0 + z.y1) / 2]} center className="zone-label" zIndexRange={[10, 0]}>
              <span style={{ borderColor: z.color }}>{z.label}</span>
            </Html>
          )}
        </group>
      ))}
      {showGrid && (
        <Grid
          position={[W / 2, 0.012, -D / 2]}
          args={[W, D]}
          cellSize={0.5}
          sectionSize={1}
          cellThickness={0.6}
          sectionThickness={1.1}
          cellColor="#7a6a58"
          sectionColor="#5b4a3a"
          fadeDistance={60}
          infiniteGrid={false}
        />
      )}
      {mode === 'plan' && (
        <>
          <Html position={[W / 2, 0.05, 1.05]} center zIndexRange={[10, 0]}>
            <span className="dim-label">← {W.toFixed(2)} m →</span>
          </Html>
          <Html position={[-0.8, 0.05, -D / 2]} center zIndexRange={[10, 0]}>
            <span className="dim-label vertical">← {D.toFixed(2)} m →</span>
          </Html>
          <Html position={[W / 2, 0.05, 1.6]} center zIndexRange={[10, 0]}>
            <span className="dim-label muted">{t('assumed')}</span>
          </Html>
        </>
      )}
    </group>
  );
}

/** Placeholder fascia sign above the entrance. Rendered as part of the front wall so it hides with it. */
export function FasciaSign() {
  const layout = useStore((s) => s.layout);
  const { width: W, ceilingHeight: H } = layout.room;
  const door = layout.room.facade.door;
  const dc = (door.x0 + door.x1) / 2;
  const brandName = useStore((s) => s.brandName);
  const tagline = useStore((s) => s.brandTagline);
  const sign = useMemo(() => textTexture(brandName || ' ', { bg: PALETTE.walnut, fg: '#f4eee4', sub: tagline, w: 1024, h: 192 }), [brandName, tagline]);
  useEffect(() => () => sign.dispose(), [sign]);
  const T = WALL_THICKNESS;
  const signW = Math.min(3.4, W - 1);
  const head = Math.max(...layout.room.facade.windows.map((w) => w.head), 2.1);
  const signH = Math.max(0.25, Math.min(0.42, H - head - 0.06));
  return (
    <mesh position={[dc, head + 0.04 + signH / 2, T + 0.04]}>
        <boxGeometry args={[signW, signH, 0.08]} />
        <meshStandardMaterial attach="material-0" color={PALETTE.walnut} />
        <meshStandardMaterial attach="material-1" color={PALETTE.walnut} />
        <meshStandardMaterial attach="material-2" color={PALETTE.walnut} />
        <meshStandardMaterial attach="material-3" color={PALETTE.walnut} />
        <meshStandardMaterial attach="material-4" map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.25} />
        <meshStandardMaterial attach="material-5" color={PALETTE.walnut} />
      </mesh>
  );
}
