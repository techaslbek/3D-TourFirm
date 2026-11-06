import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { Layout, WallItem } from '../core/types';
import { isCeilingRect } from '../core/types';
import { useStore } from '../state/store';
import { useCeilingVisible } from './Architecture';
import { M } from './materials';
import { PALETTE, PENDANT_HEIGHT, textTexture } from './palette';
import { poster } from './textures';

/** Position on a wall face and the rotation that makes +Z point away from the wall, into the room. */
function wallPose(w: WallItem, layout: Layout): { x: number; y: number; rotY: number } | null {
  const { width: W, depth: D } = layout.room;
  const storageSide = layout.partitions.find((p) => p.y1 - p.y0 > p.x1 - p.x0);
  switch (w.wall) {
    case 'left': return { x: 0, y: w.at, rotY: Math.PI / 2 };
    case 'right': return { x: W, y: w.at, rotY: -Math.PI / 2 };
    case 'back': return { x: w.at, y: D, rotY: 0 };
    case 'front': return { x: w.at, y: 0, rotY: Math.PI };
    case 'partition-east': return storageSide ? { x: storageSide.x1, y: w.at, rotY: Math.PI / 2 } : null;
    case 'partition-west': return storageSide ? { x: storageSide.x0, y: w.at, rotY: -Math.PI / 2 } : null;
  }
  return null;
}

export function WallItems() {
  const layout = useStore((s) => s.layout);
  const visible = useStore((s) => s.showWallItems);
  return (
    <group name="wall-items" visible={visible}>
      {layout.wallItems.map((w) => {
        const pose = wallPose(w, layout);
        if (!pose) return null;
        return (
          <group key={w.id} name={w.id} position={[pose.x, 0, -pose.y]} rotation-y={pose.rotY}>
            <WallThing item={w} />
          </group>
        );
      })}
      <Pendants layout={layout} />
    </group>
  );
}

function Panel({ item, depth, m }: { item: WallItem; depth: number; m: THREE.Material }) {
  return (
    <mesh position={[0, (item.z0 + item.z1) / 2, depth / 2 + 0.002]} material={m} castShadow receiveShadow>
      <boxGeometry args={[item.width, item.z1 - item.z0, depth]} />
    </mesh>
  );
}

function WallThing({ item }: { item: WallItem }) {
  const id = item.id;
  const h = item.z1 - item.z0;
  const zc = (item.z0 + item.z1) / 2;
  if (id.startsWith('brand')) return <BrandPanel item={item} />;
  if (id.startsWith('tv')) return <Tv item={item} />;
  if (id.startsWith('poster')) return <Poster item={item} index={Number(id.split('-')[1] ?? 1) - 1} />;
  if (id.startsWith('suzani')) {
    return (
      <group>
        <Panel item={item} depth={0.035} m={M.walnut()} />
        <mesh position={[0, zc, 0.038]} material={M.suzani()}>
          <planeGeometry args={[item.width - 0.08, h - 0.08]} />
        </mesh>
      </group>
    );
  }
  if (id.startsWith('ac-')) {
    return (
      <group>
        <mesh position={[0, zc, 0.11]} material={M.plasticWhite()} castShadow>
          <boxGeometry args={[item.width, h, 0.2]} />
        </mesh>
        <mesh position={[0, item.z0 + 0.04, 0.2]} material={M.plasticGrey()}>
          <boxGeometry args={[item.width * 0.8, 0.02, 0.03]} />
        </mesh>
      </group>
    );
  }
  if (id.startsWith('extinguisher')) {
    return (
      <group>
        <mesh position={[0, zc - 0.03, 0.09]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, h - 0.1, 18]} />
          <meshStandardMaterial color="#c62828" roughness={0.35} />
        </mesh>
        <mesh position={[0, item.z1 - 0.05, 0.09]} material={M.metalBlack()}>
          <cylinderGeometry args={[0.03, 0.04, 0.1, 10]} />
        </mesh>
        <mesh position={[0, item.z1 + 0.2, 0.004]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshStandardMaterial color="#c62828" />
        </mesh>
      </group>
    );
  }
  if (id.startsWith('first-aid')) {
    return (
      <group>
        <Panel item={item} depth={0.12} m={M.plasticWhite()} />
        <mesh position={[0, zc, 0.125]}>
          <planeGeometry args={[0.1, 0.03]} />
          <meshStandardMaterial color="#2e7d32" />
        </mesh>
        <mesh position={[0, zc, 0.125]}>
          <planeGeometry args={[0.03, 0.1]} />
          <meshStandardMaterial color="#2e7d32" />
        </mesh>
      </group>
    );
  }
  if (id.startsWith('router')) {
    return (
      <group>
        <mesh position={[0, item.z0, 0.12]} material={M.oak()} castShadow>
          <boxGeometry args={[item.width + 0.1, 0.025, 0.24]} />
        </mesh>
        <mesh position={[0, item.z0 + 0.04, 0.12]} material={M.plasticDark()}>
          <boxGeometry args={[0.24, 0.05, 0.16]} />
        </mesh>
      </group>
    );
  }
  if (id.startsWith('hooks')) {
    return (
      <group>
        <Panel item={item} depth={0.025} m={M.walnut()} />
        {[-0.2, 0, 0.2].map((x) => (
          <mesh key={x} position={[x * item.width, zc - 0.04, 0.06]} rotation-x={0.6} material={M.metalBlack()}>
            <cylinderGeometry args={[0.008, 0.008, 0.09, 6]} />
          </mesh>
        ))}
      </group>
    );
  }
  if (id.startsWith('evac')) return <Panel item={item} depth={0.01} m={M.paper()} />;
  return <Panel item={item} depth={0.03} m={M.sandLacquer()} />;
}

function Poster({ item, index }: { item: WallItem; index: number }) {
  const dest = useStore((s) => s.destinations[index % s.destinations.length] ?? '');
  const brand = useStore((s) => s.brandName);
  const tex = useMemo(() => poster(dest, brand), [dest, brand]);
  useEffect(() => () => tex.dispose(), [tex]);
  const h = item.z1 - item.z0;
  return (
    <group>
      <Panel item={item} depth={0.025} m={M.walnut()} />
      <mesh position={[0, (item.z0 + item.z1) / 2, 0.028]}>
        <planeGeometry args={[item.width - 0.04, h - 0.04]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** TV cycling through the destination posters every 6 seconds (a stand-in for a video loop). */
function Tv({ item }: { item: WallItem }) {
  const destinations = useStore((s) => s.destinations);
  const brand = useStore((s) => s.brandName);
  const [k, setK] = useState(3); // start after the three wall posters so the TV shows something different
  useEffect(() => {
    const id = setInterval(() => setK((v) => v + 1), 6000);
    return () => clearInterval(id);
  }, []);
  const name = destinations[k % destinations.length] ?? '';
  const tex = useMemo(() => poster(name, brand, true), [name, brand]);
  useEffect(() => () => tex.dispose(), [tex]);
  const h = item.z1 - item.z0;
  return (
    <group>
      <Panel item={item} depth={0.04} m={M.screen()} />
      <mesh position={[0, (item.z0 + item.z1) / 2, 0.043]}>
        <planeGeometry args={[item.width - 0.03, h - 0.03]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

function BrandPanel({ item }: { item: WallItem }) {
  const name = useStore((s) => s.brandName);
  const tagline = useStore((s) => s.brandTagline);
  const texture = useMemo(() => textTexture(name || ' ', { bg: PALETTE.cobalt, fg: '#f4eee4', sub: tagline, w: 768, h: 512 }), [name, tagline]);
  useEffect(() => () => texture.dispose(), [texture]);
  const h = item.z1 - item.z0;
  return (
    <group>
      <mesh position={[0, (item.z0 + item.z1) / 2, 0.015]} castShadow>
        <boxGeometry args={[item.width, h, 0.03]} />
        <meshStandardMaterial attach="material-0" color={PALETTE.cobalt} />
        <meshStandardMaterial attach="material-1" color={PALETTE.cobalt} />
        <meshStandardMaterial attach="material-2" color={PALETTE.cobalt} />
        <meshStandardMaterial attach="material-3" color={PALETTE.cobalt} />
        <meshStandardMaterial attach="material-4" map={texture} roughness={0.6} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.15} />
        <meshStandardMaterial attach="material-5" color={PALETTE.cobalt} />
      </mesh>
    </group>
  );
}

/** Pendant fittings (cord, shade, bulb). Their light sources live in Lighting. */
function Pendants({ layout }: { layout: Layout }) {
  const mode = useStore((s) => s.cameraMode);
  const ceilingVisible = useCeilingVisible();
  const H = layout.room.ceilingHeight;
  const rafts = layout.ceiling.filter(isCeilingRect);
  const points = layout.ceiling.filter((c) => !isCeilingRect(c)) as { id: string; x: number; y: number }[];
  if (mode === 'plan') return null;
  return (
    <group name="pendants">
      {points.map((p) => {
        const top = rafts.some((r) => p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1) ? H - 0.25 : H;
        const bottom = PENDANT_HEIGHT;
        return (
          <group key={p.id} position={[p.x, 0, -p.y]}>
            {ceilingVisible && (
              <mesh position={[0, (top + bottom) / 2, 0]} material={M.metalBlack()}>
                <cylinderGeometry args={[0.004, 0.004, top - bottom, 6]} />
              </mesh>
            )}
            <mesh position={[0, bottom, 0]} material={M.lampShade()} castShadow>
              <cylinderGeometry args={[0.07, 0.19, 0.24, 28, 1, true]} />
            </mesh>
            <mesh position={[0, bottom + 0.12, 0]} material={M.ceramicCobalt()}>
              <cylinderGeometry args={[0.07, 0.07, 0.02, 20]} />
            </mesh>
            <mesh position={[0, bottom - 0.05, 0]} material={M.bulb()}>
              <sphereGeometry args={[0.05, 12, 8]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

