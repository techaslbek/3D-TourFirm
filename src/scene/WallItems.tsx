import { useEffect, useMemo } from 'react';
import type { Layout, WallItem } from '../core/types';
import { isCeilingRect } from '../core/types';
import { useStore } from '../state/store';
import { useCeilingVisible } from './Architecture';
import { PALETTE, textTexture } from './palette';

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

function WallThing({ item }: { item: WallItem }) {
  const h = item.z1 - item.z0;
  const zc = (item.z0 + item.z1) / 2;
  const id = item.id;
  const panel = (depth: number, color: string, extra?: { rough?: number; metal?: number }) => (
    <mesh position={[0, zc, depth / 2 + 0.002]} castShadow>
      <boxGeometry args={[item.width, h, depth]} />
      <meshStandardMaterial color={color} roughness={extra?.rough ?? 0.8} metalness={extra?.metal ?? 0} />
    </mesh>
  );

  if (id.startsWith('brand')) return <BrandPanel item={item} />;
  if (id.startsWith('tv')) {
    return (
      <group>
        {panel(0.04, '#111214', { rough: 0.3 })}
        <mesh position={[0, zc, 0.043]}>
          <planeGeometry args={[item.width - 0.03, h - 0.03]} />
          <meshBasicMaterial color={PALETTE.turquoise} toneMapped={false} />
        </mesh>
      </group>
    );
  }
  if (id.startsWith('ac-')) return panel(0.22, '#f7f7f5', { rough: 0.4 });
  if (id.startsWith('extinguisher')) {
    return (
      <mesh position={[0, zc, 0.09]} castShadow>
        <cylinderGeometry args={[0.075, 0.075, h, 16]} />
        <meshStandardMaterial color="#c62828" roughness={0.35} />
      </mesh>
    );
  }
  if (id.startsWith('first-aid')) return panel(0.12, '#2e7d32', { rough: 0.5 });
  if (id.startsWith('suzani')) {
    return (
      <group>
        {panel(0.03, PALETTE.walnut)}
        <mesh position={[0, zc, 0.034]}>
          <planeGeometry args={[item.width - 0.1, h - 0.1]} />
          <meshStandardMaterial color={PALETTE.terracotta} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (id.startsWith('posters')) {
    const colors = [PALETTE.turquoise, PALETTE.saffron];
    return (
      <group>
        {colors.map((c, k) => (
          <mesh key={c} position={[0, item.z0 + (h / 2) * (k + 0.5), 0.012]}>
            <boxGeometry args={[item.width, h / 2 - 0.04, 0.02]} />
            <meshStandardMaterial color={c} roughness={0.7} />
          </mesh>
        ))}
      </group>
    );
  }
  if (id.startsWith('router')) return panel(0.22, '#2b2b2e', { rough: 0.6 });
  if (id.startsWith('hooks')) return panel(0.06, PALETTE.walnut, { rough: 0.5 });
  if (id.startsWith('evac')) return panel(0.01, '#f2f2f0');
  return panel(0.03, PALETTE.sand);
}

function BrandPanel({ item }: { item: WallItem }) {
  const texture = useMemo(() => textTexture('YOUR BRAND', { bg: PALETTE.cobalt, fg: '#f4eee4', sub: 'placeholder · editable in Phase 4', w: 768, h: 512 }), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const h = item.z1 - item.z0;
  return (
    <mesh position={[0, (item.z0 + item.z1) / 2, 0.015]}>
      <boxGeometry args={[item.width, h, 0.03]} />
      <meshStandardMaterial attach="material-0" color={PALETTE.cobalt} />
      <meshStandardMaterial attach="material-1" color={PALETTE.cobalt} />
      <meshStandardMaterial attach="material-2" color={PALETTE.cobalt} />
      <meshStandardMaterial attach="material-3" color={PALETTE.cobalt} />
      <meshStandardMaterial attach="material-4" map={texture} roughness={0.6} />
      <meshStandardMaterial attach="material-5" color={PALETTE.cobalt} />
    </mesh>
  );
}

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
        const bottom = 1.75;
        return (
          <group key={p.id} position={[p.x, 0, -p.y]}>
            {ceilingVisible && (
              <mesh position={[0, (top + bottom) / 2, 0]}>
                <cylinderGeometry args={[0.004, 0.004, top - bottom, 6]} />
                <meshBasicMaterial color="#222" />
              </mesh>
            )}
            <mesh position={[0, bottom, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.17, 0.22, 24, 1, true]} />
              <meshStandardMaterial color={PALETTE.saffron} roughness={0.5} side={2} />
            </mesh>
            <mesh position={[0, bottom - 0.06, 0]}>
              <sphereGeometry args={[0.05, 12, 8]} />
              <meshBasicMaterial color="#fff1d0" toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

