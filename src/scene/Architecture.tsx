import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DOOR_HEIGHT, exteriorWalls, PARTITION_DOOR_HEIGHT, wallPieces, WALL_THICKNESS, type ExteriorWall } from '../core/geometry';
import type { Layout, Partition } from '../core/types';
import { DEFAULT_FINISHES, isCeilingRect } from '../core/types';
import { useStore, type WallMode } from '../state/store';
import { FasciaSign } from './Environment';
import { floorMaterial, M, wallMaterial } from './materials';
import { PALETTE } from './palette';

const T = WALL_THICKNESS;

/** Whether ceiling-level elements should be visible for the current mode. */
export function useCeilingVisible() {
  return useStore((s) => (s.ceilingMode === 'on' ? true : s.ceilingMode === 'off' ? false : s.cameraMode === 'walk'));
}

export function Architecture() {
  const layout = useStore((s) => s.layout);
  const walls = useMemo(() => exteriorWalls(layout.room), [layout.room]);
  return (
    <group name="architecture">
      <Floor layout={layout} />
      {walls.map((w) => (
        <ExteriorWallMesh key={w.id} wall={w} height={layout.room.ceilingHeight} />
      ))}
      <EntranceDoor layout={layout} />
      {layout.partitions.map((p) => (
        <PartitionMesh key={p.id} p={p} height={layout.room.ceilingHeight} />
      ))}
      <Ceiling layout={layout} />
    </group>
  );
}

function Floor({ layout }: { layout: Layout }) {
  const { width: W, depth: D } = layout.room;
  const finish = layout.finishes?.floor ?? DEFAULT_FINISHES.floor;
  const material = useMemo(() => floorMaterial(W, D, finish), [W, D, finish]);
  useEffect(() => () => { material.map?.dispose(); material.dispose(); }, [material]);
  return (
    <mesh name="floor" rotation-x={-Math.PI / 2} position={[W / 2, 0, -D / 2]} material={material} receiveShadow>
      <planeGeometry args={[W, D]} />
    </mesh>
  );
}

/** Converts a wall-space rectangle to a box centre and size in Three.js coordinates. */
function wallBox(wall: ExteriorWall, u0: number, u1: number, v0: number, v1: number, depth = T, offset = T / 2) {
  const uc = (u0 + u1) / 2;
  const x = wall.origin[0] + wall.dir[0] * uc + wall.normal[0] * offset;
  const y = wall.origin[1] + wall.dir[1] * uc + wall.normal[1] * offset;
  const along = u1 - u0;
  const size: [number, number, number] = wall.dir[0] !== 0 ? [along, v1 - v0, depth] : [depth, v1 - v0, along];
  return { pos: [x, (v0 + v1) / 2, -y] as [number, number, number], size };
}

function ExteriorWallMesh({ wall, height }: { wall: ExteriorWall; height: number }) {
  const full = useRef<THREE.Group>(null);
  const stub = useRef<THREE.Group>(null);
  // The left (lounge) wall is the feature wall; colours come from the editable finishes.
  const finishes = useStore((s) => s.layout.finishes ?? DEFAULT_FINISHES);
  const color = wall.id === 'left' ? finishes.feature : finishes.wall;
  const material = useMemo(() => wallMaterial(color), [color]);
  const stubMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 0.9 }), []);
  const wallMode = useStore((s) => s.wallMode);
  const cameraMode = useStore((s) => s.cameraMode);
  useEffect(() => () => { material.dispose(); stubMaterial.dispose(); }, [material, stubMaterial]);

  // In walk mode "cutaway" behaves like solid; in plan mode walls are always shown.
  const effective: WallMode = cameraMode === 'plan' ? 'solid' : cameraMode === 'walk' && wallMode === 'cutaway' ? 'solid' : wallMode;
  useEffect(() => {
    const transparent = effective === 'transparent';
    material.transparent = transparent;
    material.opacity = transparent ? 0.22 : 1;
    material.depthWrite = !transparent;
    material.needsUpdate = true;
  }, [effective, material]);

  const mid = useMemo(() => {
    const um = (wall.u0 + wall.u1) / 2;
    return [wall.origin[0] + wall.dir[0] * um, wall.origin[1] + wall.dir[1] * um] as const;
  }, [wall]);

  useFrame(({ camera }) => {
    if (!full.current || !stub.current) return;
    let show = effective !== 'hidden';
    if (effective === 'cutaway') {
      const cx = camera.position.x, cy = -camera.position.z;
      const side = (cx - mid[0]) * wall.normal[0] + (cy - mid[1]) * wall.normal[1];
      show = side <= 0;
    }
    full.current.visible = show;
    stub.current.visible = !show;
  });

  const pieces = useMemo(() => wallPieces(wall.u0, wall.u1, height, wall.openings), [wall, height]);
  const windows = wall.openings.filter((o) => o.kind === 'window');
  const doors = wall.openings.filter((o) => o.kind === 'door');
  const stubPieces = useMemo(
    () => wallPieces(wall.u0, wall.u1, 0.12, wall.openings.filter((o) => o.kind === 'door').map((d) => ({ ...d, v1: 1 }))),
    [wall],
  );

  return (
    <group name={`wall-${wall.id}`}>
      <group ref={full}>
        {pieces.map((p, k) => {
          const b = wallBox(wall, p.u0, p.u1, p.v0, p.v1);
          return (
            <mesh key={k} position={b.pos} material={material} castShadow receiveShadow>
              <boxGeometry args={b.size} />
            </mesh>
          );
        })}
        {windows.map((o) => <WindowGlazing key={o.id} wall={wall} o={o} />)}
        {doors.map((o) => <OpeningFrame key={o.id} wall={wall} o={o} />)}
        {wall.id === 'front' && <FasciaSign />}
      </group>
      <group ref={stub} visible={false}>
        {stubPieces.map((p, k) => {
          const b = wallBox(wall, p.u0, p.u1, p.v0, p.v1);
          return (
            <mesh key={k} position={b.pos} material={stubMaterial}>
              <boxGeometry args={b.size} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

const frameMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.charcoal, roughness: 0.5, metalness: 0.4 });
const glassMaterial = new THREE.MeshStandardMaterial({
  color: PALETTE.glass, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide,
});

function OpeningFrame({ wall, o }: { wall: ExteriorWall; o: { u0: number; u1: number; v0: number; v1: number } }) {
  const f = 0.05;
  const parts = [
    wallBox(wall, o.u0, o.u0 + f, o.v0, o.v1, 0.1, T / 2),
    wallBox(wall, o.u1 - f, o.u1, o.v0, o.v1, 0.1, T / 2),
    wallBox(wall, o.u0, o.u1, o.v1 - f, o.v1, 0.1, T / 2),
  ];
  if (o.v0 > 0) parts.push(wallBox(wall, o.u0, o.u1, o.v0, o.v0 + f, 0.1, T / 2));
  return (
    <group>
      {parts.map((b, k) => (
        <mesh key={k} position={b.pos} material={frameMaterial}>
          <boxGeometry args={b.size} />
        </mesh>
      ))}
    </group>
  );
}

function WindowGlazing({ wall, o }: { wall: ExteriorWall; o: { u0: number; u1: number; v0: number; v1: number } }) {
  // Vertical mullions roughly every 1.4 m, as on a typical aluminium shopfront.
  const n = Math.max(1, Math.round((o.u1 - o.u0) / 1.4));
  const step = (o.u1 - o.u0) / n;
  const mullions = Array.from({ length: n - 1 }, (_, k) => o.u0 + step * (k + 1));
  const glass = wallBox(wall, o.u0, o.u1, o.v0, o.v1, 0.012, T / 2);
  return (
    <group>
      <mesh position={glass.pos} material={glassMaterial}>
        <boxGeometry args={glass.size} />
      </mesh>
      <OpeningFrame wall={wall} o={o} />
      {mullions.map((u) => {
        const b = wallBox(wall, u - 0.025, u + 0.025, o.v0, o.v1, 0.1, T / 2);
        return (
          <mesh key={u} position={b.pos} material={frameMaterial}>
            <boxGeometry args={b.size} />
          </mesh>
        );
      })}
    </group>
  );
}

function EntranceDoor({ layout }: { layout: Layout }) {
  const door = layout.room.facade.door;
  const open = useStore((s) => s.doorOpen);
  const hinge = useRef<THREE.Group>(null);
  const L = door.x1 - door.x0 - 0.05;
  const hingeRight = door.hinge === 'right';
  const hx = hingeRight ? door.x1 - 0.05 : door.x0 + 0.05;
  const openAngle = (hingeRight ? -1 : 1) * (Math.PI / 2) * (door.swing === 'inward' ? 1 : -1);
  useFrame((_, dt) => {
    if (!hinge.current) return;
    const target = open ? openAngle : 0;
    hinge.current.rotation.y += (target - hinge.current.rotation.y) * Math.min(1, dt * 6);
  });
  const sx = hingeRight ? -1 : 1;
  const h = DOOR_HEIGHT - 0.06;
  return (
    <group ref={hinge} name="entrance-door" position={[hx, 0, 0.03]}>
      <mesh position={[(sx * L) / 2, h / 2 + 0.01, 0]} material={glassMaterial}>
        <boxGeometry args={[L, h, 0.02]} />
      </mesh>
      {[
        [sx * 0.03, h / 2 + 0.01, 0.06, h],
        [sx * (L - 0.03), h / 2 + 0.01, 0.06, h],
        [(sx * L) / 2, h - 0.02, L, 0.06],
        [(sx * L) / 2, 0.06, L, 0.12],
      ].map(([x, y, w, hh], k) => (
        <mesh key={k} position={[x, y, 0]} material={frameMaterial} castShadow>
          <boxGeometry args={[w, hh, 0.05]} />
        </mesh>
      ))}
      <mesh position={[sx * (L - 0.12), 1.05, -0.05]} material={frameMaterial}>
        <boxGeometry args={[0.03, 0.5, 0.03]} />
      </mesh>
    </group>
  );
}

function PartitionMesh({ p, height }: { p: Partition; height: number }) {
  const color = useStore((s) => (s.layout.finishes ?? DEFAULT_FINISHES).wall);
  const partitionMat = useMemo(() => wallMaterial(color), [color]);
  useEffect(() => () => partitionMat.dispose(), [partitionMat]);
  const horizontal = p.x1 - p.x0 >= p.y1 - p.y0;
  const pieces = useMemo(
    () => wallPieces(horizontal ? p.x0 : p.y0, horizontal ? p.x1 : p.y1, height, p.openings.map((o) => ({ u0: o.x0, u1: o.x1, v0: 0, v1: PARTITION_DOOR_HEIGHT }))),
    [p, height, horizontal],
  );
  return (
    <group name={`partition-${p.id}`}>
      {pieces.map((s, k) => {
        const size: [number, number, number] = horizontal ? [s.u1 - s.u0, s.v1 - s.v0, p.y1 - p.y0] : [p.x1 - p.x0, s.v1 - s.v0, s.u1 - s.u0];
        const pos: [number, number, number] = horizontal
          ? [(s.u0 + s.u1) / 2, (s.v0 + s.v1) / 2, -(p.y0 + p.y1) / 2]
          : [(p.x0 + p.x1) / 2, (s.v0 + s.v1) / 2, -(s.u0 + s.u1) / 2];
        return (
          <mesh key={k} position={pos} material={partitionMat} castShadow receiveShadow>
            <boxGeometry args={size} />
          </mesh>
        );
      })}
      {horizontal && p.openings.map((o) => {
        // Sliding door leaf parked beside its opening, on the service-area face.
        const w = o.x1 - o.x0;
        return (
          <group key={o.id}>
            <mesh position={[o.x0 - w / 2 + 0.03, PARTITION_DOOR_HEIGHT / 2, -(p.y0 - 0.03)]} material={M.oak()} castShadow>
              <boxGeometry args={[w + 0.06, PARTITION_DOOR_HEIGHT, 0.04]} />
            </mesh>
            <mesh position={[o.x0 - w / 2 + 0.03, PARTITION_DOOR_HEIGHT + 0.03, -(p.y0 - 0.05)]} material={M.metalBlack()}>
              <boxGeometry args={[2 * w + 0.1, 0.04, 0.03]} />
            </mesh>
            <mesh position={[o.x0 - 0.06, 1.0, -(p.y0 - 0.06)]} material={M.metalBlack()}>
              <boxGeometry args={[0.02, 0.3, 0.02]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Ceiling({ layout }: { layout: Layout }) {
  const visible = useCeilingVisible();
  const { width: W, depth: D, ceilingHeight: H } = layout.room;
  const lights = useMemo(() => {
    const pts: [number, number][] = [];
    const nx = Math.max(2, Math.round(W / 2.2)), ny = Math.max(2, Math.round(D / 2));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) pts.push([((i + 0.5) * W) / nx, ((j + 0.5) * D) / ny]);
    return pts;
  }, [W, D]);
  const rafts = layout.ceiling.filter(isCeilingRect);
  const ceilingColor = (layout.finishes ?? DEFAULT_FINISHES).ceiling;
  const ceilingMat = useMemo(() => wallMaterial(ceilingColor), [ceilingColor]);
  useEffect(() => () => ceilingMat.dispose(), [ceilingMat]);
  return (
    <group name="ceiling" visible={visible}>
      <mesh rotation-x={Math.PI / 2} position={[W / 2, H, -D / 2]} castShadow material={ceilingMat}>
        <planeGeometry args={[W + 0.4, D + 0.4]} />
      </mesh>
      {rafts.map((r) => <SlatRaft key={r.id} x0={r.x0} x1={r.x1} y0={r.y0} y1={r.y1} y={H - 0.25} />)}
      {lights.map(([x, y]) => {
        const underRaft = rafts.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
        return (
          <mesh key={`${x}-${y}`} rotation-x={Math.PI / 2} position={[x, (underRaft ? H - 0.25 - 0.052 : H - 0.005), -y]}>
            <circleGeometry args={[0.07, 20]} />
            <meshBasicMaterial color="#fff3dc" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Oak slat ceiling raft on black acoustic felt (slats 40 mm wide at 80 mm centres). */
function SlatRaft({ x0, x1, y0, y1, y }: { x0: number; x1: number; y0: number; y1: number; y: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pitch = 0.08, slatW = 0.04, slatH = 0.05;
  const n = Math.max(1, Math.floor((x1 - x0) / pitch));
  const geo = useMemo(() => new THREE.BoxGeometry(slatW, slatH, y1 - y0), [y0, y1]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      o.position.set(x0 + pitch / 2 + i * pitch, y - slatH / 2, -(y0 + y1) / 2);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [n, x0, y0, y1, y]);
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, y + 0.01, -(y0 + y1) / 2]} material={M.feltDark()}>
        <boxGeometry args={[x1 - x0, 0.02, y1 - y0]} />
      </mesh>
      <instancedMesh key={n} ref={ref} args={[geo, M.oak(), n]} castShadow receiveShadow />
    </group>
  );
}
