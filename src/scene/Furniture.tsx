import type { ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, type ReactElement } from 'react';
import { itemsOutsideRoom } from '../core/layout';
import type { Item } from '../core/types';
import { useStore } from '../state/store';
import { CATEGORY_COLOR, PALETTE } from './palette';

/**
 * Placeholder furniture: simple dimensioned shapes so proportions, clearances and sight lines
 * can be judged now. Detailed models and materials replace these in Phase 3.
 */
export function Furniture() {
  const layout = useStore((s) => s.layout);
  const visible = useStore((s) => s.showFurniture);
  const outside = useMemo(() => new Set(itemsOutsideRoom(layout)), [layout]);
  return (
    <group name="furniture" visible={visible}>
      {layout.items.map((i) => (
        <Placeholder key={i.id} item={i} outside={outside.has(i.id)} />
      ))}
    </group>
  );
}

const Placeholder = memo(function Placeholder({ item, outside }: { item: Item; outside: boolean }) {
  const hovered = useStore((s) => s.hovered === item.id || s.inspected === item.id);
  const set = useStore((s) => s.set);
  const interactive = useStore((s) => s.cameraMode !== 'walk');
  const base = item.id === 'rug-lounge' ? PALETTE.terracotta : CATEGORY_COLOR[item.cat] ?? '#cccccc';
  const emissive = outside ? '#c62828' : hovered ? '#6a4a1a' : '#000000';
  const mat = <meshStandardMaterial color={base} roughness={0.8} emissive={emissive} emissiveIntensity={outside ? 0.6 : 0.35} />;

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); set({ hovered: item.id }); },
        onPointerOut: () => set({ hovered: null }),
        onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); set({ inspected: item.id }); },
      }
    : {};

  return (
    <group name={item.id} position={[item.x, 0, -item.y]} {...handlers}>
      <Shape item={item} material={mat} />
    </group>
  );
});

function Shape({ item, material }: { item: Item; material: ReactElement }) {
  const { w, d, h } = item;
  const legMat = <meshStandardMaterial color={PALETTE.walnut} roughness={0.6} />;

  if (item.layer === 'rug') {
    return (
      <mesh position={[0, 0.006, 0]} receiveShadow>
        <boxGeometry args={[w, 0.012, d]} />
        {material}
      </mesh>
    );
  }

  if (item.cat === 'plants') {
    const r = Math.min(w, d) / 2;
    return (
      <group>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[r * 0.6, r * 0.5, 0.4, 20]} />
          <meshStandardMaterial color={PALETTE.terracotta} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.4 + (h - 0.4) * 0.55, 0]} castShadow>
          <sphereGeometry args={[r, 20, 14]} />
          {material}
        </mesh>
      </group>
    );
  }

  if (item.shape === 'round' && h > 1.2) {
    // Tall slender objects (floor lamp, coat stand): base, pole and head instead of a solid column.
    const lamp = item.cat === 'lighting';
    return (
      <group>
        <mesh position={[0, 0.015, 0]} castShadow>
          <cylinderGeometry args={[w * 0.4, w * 0.45, 0.03, 20]} />
          {legMat}
        </mesh>
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, h, 8]} />
          {legMat}
        </mesh>
        {lamp ? (
          <mesh position={[0, h - 0.15, 0]} castShadow>
            <cylinderGeometry args={[w * 0.32, w * 0.5, 0.3, 24, 1, true]} />
            <meshStandardMaterial color="#f3e6c8" roughness={0.6} side={2} emissive="#ffdca0" emissiveIntensity={0.35} />
          </mesh>
        ) : (
          [0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[Math.cos((k * Math.PI) / 2) * 0.12, h - 0.12, Math.sin((k * Math.PI) / 2) * 0.12]} rotation={[Math.sin((k * Math.PI) / 2) * 0.6, 0, -Math.cos((k * Math.PI) / 2) * 0.6]}>
              <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
              {legMat}
            </mesh>
          ))
        )}
      </group>
    );
  }

  if (item.shape === 'round') {
    return (
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[w / 2, w / 2, h, 24]} />
        {material}
      </mesh>
    );
  }

  if (item.cat === 'seating' && item.faces) {
    // Seat block plus a backrest on the side opposite the facing direction.
    const seatH = item.id.startsWith('window-bench') ? h : Math.min(0.46, h);
    const back = 0.14;
    const f = item.faces;
    const bx = f === '+x' ? -(w - back) / 2 : f === '-x' ? (w - back) / 2 : 0;
    const bz = f === '+y' ? (d - back) / 2 : f === '-y' ? -(d - back) / 2 : 0; // three Z = -layout y
    const bw = f === '+x' || f === '-x' ? back : w;
    const bd = f === '+y' || f === '-y' ? back : d;
    return (
      <group>
        <mesh position={[0, seatH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, seatH, d]} />
          {material}
        </mesh>
        <mesh position={[bx, (seatH + h) / 2, bz]} castShadow>
          <boxGeometry args={[bw, h - seatH, bd]} />
          {material}
        </mesh>
      </group>
    );
  }

  if (item.cat === 'desks' || item.cat === 'tables') {
    const top = 0.04, leg = 0.05;
    const lx = w / 2 - leg, lz = d / 2 - leg;
    return (
      <group>
        <mesh position={[0, h - top / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, top, d]} />
          {material}
        </mesh>
        {[[lx, lz], [-lx, lz], [lx, -lz], [-lx, -lz]].map(([x, z], k) => (
          <mesh key={k} position={[x, (h - top) / 2, z]} castShadow>
            <boxGeometry args={[leg, h - top, leg]} />
            {legMat}
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      {material}
    </mesh>
  );
}
