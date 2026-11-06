import type { ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { localFrame, modelKind } from '../core/furniture';
import { itemsOutsideRoom } from '../core/layout';
import type { Item } from '../core/types';
import { useStore } from '../state/store';
import { MODELS } from './models';

/** All furniture from the layout, built as parametric models at their real sizes. */
export function Furniture() {
  const layout = useStore((s) => s.layout);
  const visible = useStore((s) => s.showFurniture);
  const outside = useMemo(() => new Set(itemsOutsideRoom(layout)), [layout]);
  return (
    <group name="furniture" visible={visible}>
      {layout.items.map((i) => (
        <FurnitureItem key={i.id} item={i} outside={outside.has(i.id)} />
      ))}
    </group>
  );
}

const FurnitureItem = memo(function FurnitureItem({ item, outside }: { item: Item; outside: boolean }) {
  const highlighted = useStore((s) => s.hovered === item.id || s.inspected === item.id);
  const set = useStore((s) => s.set);
  const interactive = useStore((s) => s.cameraMode !== 'walk');
  const kind = modelKind(item);
  const { rotY, W, D } = localFrame(item);
  const Model = MODELS[kind];

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); set({ hovered: item.id }); },
        onPointerOut: () => set({ hovered: null }),
        onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); set({ inspected: item.id }); },
      }
    : {};

  return (
    <group name={item.id} position={[item.x, 0, -item.y]} {...handlers}>
      <group rotation-y={rotY}>
        <Model W={W} D={D} H={item.h} id={item.id} />
      </group>
      {(highlighted || outside) && <Outline w={item.w} d={item.d} h={Math.max(item.h, 0.02)} color={outside ? '#d32f2f' : '#1f4e8c'} />}
    </group>
  );
});

/** Bounding-box outline used for hover, inspection and "outside the room" warnings. */
function Outline({ w, d, h, color }: { w: number; d: number; h: number; color: string }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.02, h + 0.02, d + 0.02)), [w, d, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments geometry={geo} position={[0, h / 2, 0]} renderOrder={10}>
      <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
    </lineSegments>
  );
}
