import { useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { snapPosition } from '../core/edit';
import { localFrame, modelKind } from '../core/furniture';
import { itemRect } from '../core/layout';
import type { Item } from '../core/types';
import { findConflicts } from '../core/validate';
import { useStore } from '../state/store';
import { MODELS, PRIMARY_BASE } from './models';

/**
 * All furniture from the layout, built as parametric models at their real sizes.
 * Editing: click to select; drag a selected item to move it (snaps to grid and walls).
 */
export function Furniture() {
  const layout = useStore((s) => s.layout);
  const visible = useStore((s) => s.showFurniture);
  const conflicts = useMemo(() => findConflicts(layout), [layout]);
  return (
    <group name="furniture" visible={visible}>
      {layout.items.map((i) => (
        <FurnitureItem key={i.id} item={i} warn={conflicts.items.has(i.id)} />
      ))}
    </group>
  );
}

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

const FurnitureItem = memo(function FurnitureItem({ item, warn }: { item: Item; warn: boolean }) {
  const isSelected = useStore((s) => s.selected === item.id);
  const isHovered = useStore((s) => s.hovered === item.id);
  const interactive = useStore((s) => s.cameraMode !== 'walk');
  const group = useRef<THREE.Group>(null);
  const drag = useRef<{ dx: number; dy: number; x: number; y: number; moved: boolean } | null>(null);
  const [dragWarn, setDragWarn] = useState<boolean | null>(null);
  const getThree = useThree((s) => s.get);
  const kind = modelKind(item);
  const { rotY, W, D } = localFrame(item);
  const Model = MODELS[kind];

  const primary = useMemo(() => {
    if (!item.color) return undefined;
    const m = PRIMARY_BASE[kind]().clone() as THREE.MeshStandardMaterial;
    m.color.set(item.color);
    return m;
  }, [item.color, kind]);
  useEffect(() => () => primary?.dispose(), [primary]);

  // Keep the drawn position in sync with the data (after undo, redo, numeric edits).
  useEffect(() => { group.current?.position.set(item.x, 0, -item.y); }, [item.x, item.y]);

  const setControls = (enabled: boolean) => {
    const controls = getThree().controls as unknown as { enabled: boolean } | null;
    if (controls) controls.enabled = enabled;
  };

  const handlers = interactive ? {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      useStore.getState().set({ hovered: item.id });
      document.body.style.cursor = isSelected ? 'grab' : 'pointer';
    },
    onPointerOut: () => {
      useStore.getState().set({ hovered: null });
      document.body.style.cursor = '';
    },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const s = useStore.getState();
      if (s.selected !== item.id) { s.set({ selected: item.id }); return; }
      if (!e.ray.intersectPlane(floorPlane, hit)) return;
      drag.current = { dx: item.x - hit.x, dy: item.y + hit.z, x: item.x, y: item.y, moved: false };
      (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
      setControls(false);
      s.set({ dragging: true });
      document.body.style.cursor = 'grabbing';
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      const d = drag.current;
      if (!d) return;
      e.stopPropagation();
      if (!e.ray.intersectPlane(floorPlane, hit)) return;
      const s = useStore.getState();
      const [x, y] = snapPosition(s.layout, item, hit.x + d.dx, -hit.z + d.dy, s.grid, s.snapWalls ? 0.12 : 0);
      if (x === d.x && y === d.y) return;
      d.x = x; d.y = y; d.moved = true;
      group.current?.position.set(x, 0, -y);
      if (item.layer === 'floor') {
        const r = itemRect({ ...item, x, y });
        const clash = s.layout.items.some((o) => o.id !== item.id && o.layer === 'floor' && !o.hidden
          && r.x0 < o.x + o.w / 2 && o.x - o.w / 2 < r.x1 && r.y0 < o.y + o.d / 2 && o.y - o.d / 2 < r.y1);
        setDragWarn(clash);
      }
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      const d = drag.current;
      if (!d) return;
      e.stopPropagation();
      drag.current = null;
      (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
      setControls(true);
      setDragWarn(null);
      document.body.style.cursor = 'grab';
      const s = useStore.getState();
      s.set({ dragging: false });
      if (d.moved) s.moveItem(item.id, d.x, d.y);
    },
  } : {};

  const outline = dragWarn ?? warn
    ? '#d32f2f'
    : isSelected ? '#1f4e8c' : isHovered ? '#6f8fb8' : null;

  return (
    <group ref={group} name={item.id} position={[item.x, 0, -item.y]} {...handlers}>
      {!item.hidden && (
        <group rotation-y={rotY}>
          <Model W={W} D={D} H={item.h} id={item.id} primary={primary} />
        </group>
      )}
      {(outline || (item.hidden && isSelected)) && (
        <Outline w={item.w} d={item.d} h={Math.max(item.h, 0.02)} color={outline ?? '#9a8a78'} thick={isSelected} />
      )}
    </group>
  );
});

/** Bounding-box outline: selection, hover and warnings (red). Drawn on top of everything. */
function Outline({ w, d, h, color, thick }: { w: number; d: number; h: number; color: string; thick: boolean }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.03, h + 0.03, d + 0.03)), [w, d, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <lineSegments geometry={geo} position={[0, h / 2, 0]} renderOrder={10}>
        <lineBasicMaterial color={color} depthTest={false} transparent opacity={thick ? 1 : 0.75} />
      </lineSegments>
      {thick && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} renderOrder={9}>
          <planeGeometry args={[w + 0.06, d + 0.06]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
