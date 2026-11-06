import { RoundedBox } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef, type ReactElement } from 'react';
import * as THREE from 'three';
import type { ModelKind } from '../core/furniture';
import { M } from './materials';

/*
 * Parametric furniture. Every model is built from the item's real width (W), depth (D) and
 * height (H) in a local frame: centred on the floor, front facing -Z. Proportions such as seat
 * height (≈ 0.45 m) and desk top thickness follow common furniture sizes. These are design
 * representations, not specific products.
 */

type V3 = [number, number, number];
type Mat = THREE.Material;

function Box({ s, p, m, r }: { s: V3; p: V3; m: Mat; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

function RBox({ s, p, m, radius = 0.03, r }: { s: V3; p: V3; m: Mat; radius?: number; r?: V3 }) {
  const rad = Math.max(0.002, Math.min(radius, Math.min(...s) / 2 - 0.001));
  return <RoundedBox args={s} radius={rad} smoothness={3} position={p} rotation={r} material={m} castShadow receiveShadow />;
}

function Cyl({ r, rb, h, p, m, seg = 20, open = false, rot }: { r: number; rb?: number; h: number; p: V3; m: Mat; seg?: number; open?: boolean; rot?: V3 }) {
  return (
    <mesh position={p} rotation={rot} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[r, rb ?? r, h, seg, 1, open]} />
    </mesh>
  );
}

function seeded(seed: string) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Four legs inset from the corners of a W × D footprint. */
function Legs({ W, D, h, inset = 0.05, r = 0.018, m, splay = 0 }: { W: number; D: number; h: number; inset?: number; r?: number; m: Mat; splay?: number }) {
  const x = W / 2 - inset, z = D / 2 - inset;
  return (
    <>
      {[[x, z], [-x, z], [x, -z], [-x, -z]].map(([lx, lz], k) => (
        <Cyl key={k} r={r} rb={r * 0.75} h={h} p={[lx, h / 2, lz]} m={m} seg={10} rot={[Math.sign(lz) * splay, 0, -Math.sign(lx) * splay]} />
      ))}
    </>
  );
}

/** Cabinet front: door split lines and bar handles on the -Z face. */
function Doors({ W, H, y0, z, n, handleM }: { W: number; H: number; y0: number; z: number; n: number; handleM: Mat }) {
  const grooveM = M.plasticDark();
  const dw = W / n;
  return (
    <>
      {Array.from({ length: n - 1 }, (_, k) => (
        <Box key={`g${k}`} s={[0.004, H - 0.02, 0.004]} p={[-W / 2 + dw * (k + 1), y0 + H / 2, z]} m={grooveM} />
      ))}
      {Array.from({ length: n }, (_, k) => {
        const cx = -W / 2 + dw * (k + 0.5);
        const hx = cx + (k % 2 === 0 ? dw / 2 - 0.06 : -dw / 2 + 0.06);
        return <Box key={`h${k}`} s={[0.012, Math.min(0.16, H * 0.3), 0.02]} p={[n === 1 ? W / 2 - 0.06 : hx, y0 + H - Math.min(0.16, H * 0.3) / 2 - 0.06, z - 0.012]} m={handleM} />;
      })}
    </>
  );
}

export interface ModelProps { W: number; D: number; H: number; id: string }

function Sofa({ W, D, H }: ModelProps) {
  const f = M.fabricSand();
  const arm = 0.17, back = 0.2, legH = 0.1;
  const seatW = W - 2 * arm;
  const n = 3, cw = seatW / n;
  return (
    <group>
      <Legs W={W} D={D} h={legH} inset={0.06} m={M.walnut()} />
      <RBox s={[W, 0.3, D]} p={[0, legH + 0.15, 0]} m={f} radius={0.04} />
      {Array.from({ length: n }, (_, k) => (
        <RBox key={`s${k}`} s={[cw - 0.01, 0.12, D - back - 0.02]} p={[-seatW / 2 + cw * (k + 0.5), legH + 0.36, -back / 2 + 0.01]} m={f} radius={0.05} />
      ))}
      <RBox s={[W, H - legH, back]} p={[0, legH + (H - legH) / 2, D / 2 - back / 2]} m={f} radius={0.05} />
      {Array.from({ length: n }, (_, k) => (
        <RBox key={`b${k}`} s={[cw - 0.02, 0.36, 0.14]} p={[-seatW / 2 + cw * (k + 0.5), legH + 0.6, D / 2 - back - 0.05]} m={f} radius={0.06} r={[-0.12, 0, 0]} />
      ))}
      {[-1, 1].map((sx) => (
        <RBox key={sx} s={[arm, 0.6 - legH + 0.02, D]} p={[sx * (W / 2 - arm / 2), legH + (0.6 - legH) / 2, 0]} m={f} radius={0.06} />
      ))}
      {/* Ikat / adras cushions */}
      <RBox s={[0.42, 0.4, 0.12]} p={[-seatW / 2 + 0.28, legH + 0.62, D / 2 - back - 0.16]} m={M.ikatA()} radius={0.05} r={[-0.25, 0.25, 0.08]} />
      <RBox s={[0.42, 0.4, 0.12]} p={[seatW / 2 - 0.28, legH + 0.62, D / 2 - back - 0.16]} m={M.ikatB()} radius={0.05} r={[-0.25, -0.25, -0.08]} />
    </group>
  );
}

function Armchair({ W, D, H }: ModelProps) {
  const f = M.fabricTerracotta();
  const legH = 0.12, arm = 0.12, back = 0.16;
  return (
    <group>
      <Legs W={W} D={D} h={legH} inset={0.07} m={M.walnut()} splay={0.08} />
      <RBox s={[W - 0.02, 0.24, D - 0.02]} p={[0, legH + 0.12, 0]} m={f} radius={0.05} />
      <RBox s={[W - 2 * arm - 0.02, 0.1, D - back - 0.04]} p={[0, legH + 0.29, -back / 2]} m={f} radius={0.05} />
      <RBox s={[W - 0.02, H - legH, back]} p={[0, legH + (H - legH) / 2, D / 2 - back / 2]} m={f} radius={0.07} />
      {[-1, 1].map((sx) => (
        <RBox key={sx} s={[arm, 0.38, D - 0.04]} p={[sx * (W / 2 - arm / 2 - 0.01), legH + 0.27, 0]} m={f} radius={0.05} />
      ))}
      <RBox s={[0.38, 0.36, 0.11]} p={[0, legH + 0.5, D / 2 - back - 0.08]} m={M.ikatB()} radius={0.05} r={[-0.2, 0, 0]} />
    </group>
  );
}

function CoffeeTable({ W, D, H }: ModelProps) {
  return (
    <group>
      <RBox s={[W, 0.04, D]} p={[0, H - 0.02, 0]} m={M.oak()} radius={0.015} />
      <Box s={[W - 0.12, 0.02, D - 0.12]} p={[0, 0.12, 0]} m={M.oak()} />
      <Legs W={W} D={D} h={H - 0.04} inset={0.05} r={0.022} m={M.walnut()} />
      {/* Rishtan-style bowl and two books */}
      <Cyl r={0.11} rb={0.05} h={0.07} p={[W * 0.22, H + 0.035, 0.02]} m={M.ceramicCobalt()} />
      <Box s={[0.26, 0.03, 0.2]} p={[-W * 0.22, H + 0.015, -0.04]} m={M.fabricCobalt()} r={[0, 0.2, 0]} />
      <Box s={[0.24, 0.025, 0.18]} p={[-W * 0.22, H + 0.043, -0.04]} m={M.paper()} r={[0, 0.05, 0]} />
    </group>
  );
}

function SideTable({ W, H }: ModelProps) {
  const r = W / 2;
  return (
    <group>
      <Cyl r={r} h={0.03} p={[0, H - 0.015, 0]} m={M.oak()} seg={32} />
      <Cyl r={0.025} h={H - 0.04} p={[0, (H - 0.04) / 2 + 0.01, 0]} m={M.metalBlack()} />
      <Cyl r={r * 0.6} h={0.02} p={[0, 0.01, 0]} m={M.metalBlack()} seg={28} />
      <Cyl r={0.045} h={0.012} p={[0.06, H + 0.006, 0.04]} m={M.plasticWhite()} />
    </group>
  );
}

function FloorLamp({ W, H }: ModelProps) {
  return (
    <group>
      <Cyl r={W * 0.4} rb={W * 0.45} h={0.03} p={[0, 0.015, 0]} m={M.metalBlack()} seg={24} />
      <Cyl r={0.012} h={H - 0.2} p={[0, (H - 0.2) / 2, 0]} m={M.metalBlack()} seg={8} />
      <Cyl r={W * 0.3} rb={W * 0.48} h={0.32} p={[0, H - 0.16, 0]} m={M.lampShade()} seg={28} open />
      <mesh position={[0, H - 0.2, 0]} material={M.bulb()}>
        <sphereGeometry args={[0.04, 12, 8]} />
      </mesh>
    </group>
  );
}

function LatticeScreen({ W, D, H }: ModelProps) {
  const post = 0.05;
  const panelH = H - 0.22;
  const segs = 2;
  const sw = (W - post * (segs + 1)) / segs;
  return (
    <group>
      {Array.from({ length: segs + 1 }, (_, k) => (
        <Box key={`p${k}`} s={[post, H, Math.max(D, 0.05)]} p={[-W / 2 + post / 2 + k * (sw + post), H / 2, 0]} m={M.walnut()} />
      ))}
      <Box s={[W, 0.05, Math.max(D, 0.05)]} p={[0, H - 0.025, 0]} m={M.walnut()} />
      <Box s={[W, 0.06, Math.max(D, 0.05)]} p={[0, 0.14, 0]} m={M.walnut()} />
      {Array.from({ length: segs }, (_, k) => (
        <mesh key={`l${k}`} position={[-W / 2 + post + sw / 2 + k * (sw + post), 0.17 + panelH / 2, 0]} material={M.lattice()} castShadow receiveShadow>
          <planeGeometry args={[sw, panelH]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <Box key={sx} s={[0.08, 0.04, 0.3]} p={[sx * (W / 2 - 0.04), 0.02, 0]} m={M.walnut()} />
      ))}
    </group>
  );
}

function Foliage({ id, W, H, y0 }: { id: string; W: number; H: number; y0: number }) {
  const a = useRef<THREE.InstancedMesh>(null);
  const b = useRef<THREE.InstancedMesh>(null);
  const n = 60;
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  useLayoutEffect(() => {
    const r = seeded(id);
    const o = new THREE.Object3D();
    const R = W / 2;
    [a.current, b.current].forEach((mesh, which) => {
      if (!mesh) return;
      for (let i = 0; i < n; i++) {
        const t = r();
        const y = y0 + (H - y0) * (0.15 + 0.85 * t);
        const spread = R * (0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
        const ang = r() * Math.PI * 2;
        const rad = spread * Math.sqrt(r());
        o.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
        const s = 0.05 + r() * 0.05 + (which ? 0.012 : 0);
        o.scale.set(s * 1.7, s * 0.22, s * 0.85); // flattened: reads as a leaf, not a blob
        o.rotation.set((r() - 0.5) * 1.6, r() * Math.PI * 2, (r() - 0.5) * 1.2);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [id, W, H, y0]);
  return (
    <>
      <instancedMesh ref={a} args={[geo, M.leaf(), n]} castShadow receiveShadow />
      <instancedMesh ref={b} args={[geo, M.leafDark(), n]} castShadow receiveShadow />
    </>
  );
}

function Plant({ W, H, id }: ModelProps) {
  const potH = Math.min(0.38, H * 0.25);
  const r = W * 0.36;
  return (
    <group>
      <Cyl r={r} rb={r * 0.78} h={potH} p={[0, potH / 2, 0]} m={M.terracottaPot()} seg={24} />
      <Cyl r={r * 0.92} h={0.01} p={[0, potH - 0.02, 0]} m={M.soil()} seg={24} />
      <Cyl r={0.018} rb={0.026} h={H * 0.55} p={[0, potH + H * 0.27, 0]} m={M.bark()} seg={6} />
      <Foliage id={id} W={W} H={H} y0={potH + 0.1} />
    </group>
  );
}

function SmallPlant({ p, id, s = 1 }: { p: V3; id: string; s?: number }) {
  return (
    <group position={p} scale={s}>
      <Cyl r={0.07} rb={0.055} h={0.13} p={[0, 0.065, 0]} m={M.ceramicWhite()} seg={16} />
      <Foliage id={id} W={0.24} H={0.38} y0={0.12} />
    </group>
  );
}

function CoatStand({ W, H }: ModelProps) {
  const wood = M.walnut();
  return (
    <group>
      <Cyl r={W * 0.38} rb={W * 0.42} h={0.03} p={[0, 0.015, 0]} m={wood} seg={24} />
      <Cyl r={0.018} h={H} p={[0, H / 2, 0]} m={wood} seg={10} />
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        return <Cyl key={k} r={0.01} h={0.26} p={[Math.cos(a) * 0.09, H - 0.14, Math.sin(a) * 0.09]} rot={[Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]} m={wood} seg={6} />;
      })}
      {/* A coat hanging on one hook */}
      <RBox s={[0.42, 0.75, 0.16]} p={[0.12, H - 0.55, 0.1]} m={M.fabricCharcoal()} radius={0.06} r={[0, 0.8, 0.05]} />
    </group>
  );
}

function UmbrellaStand({ W, H }: ModelProps) {
  return (
    <group>
      <Cyl r={W / 2} h={H} p={[0, H / 2, 0]} m={M.metalBlack()} seg={20} open />
      <Cyl r={W / 2} h={0.01} p={[0, 0.005, 0]} m={M.metalBlack()} seg={20} />
      <Cyl r={0.025} h={0.85} p={[0.04, 0.45, 0.02]} rot={[0.12, 0, -0.1]} m={M.fabricCobalt()} seg={8} />
      <Cyl r={0.022} h={0.8} p={[-0.04, 0.42, -0.02]} rot={[-0.1, 0, 0.12]} m={M.fabricSaffron()} seg={8} />
    </group>
  );
}

function WindowBench({ W, D, H, id }: ModelProps) {
  const cushionW = W - 0.7;
  return (
    <group>
      <Box s={[W, H - 0.05, D]} p={[0, (H - 0.05) / 2 + 0.05, 0]} m={M.oak()} />
      <Box s={[W - 0.04, 0.05, D - 0.06]} p={[0, 0.025, 0.02]} m={M.plasticDark()} />
      <RBox s={[cushionW, 0.08, D - 0.04]} p={[0, H + 0.04, 0]} m={M.fabricSaffron()} radius={0.035} />
      <RBox s={[0.4, 0.36, 0.11]} p={[-cushionW / 2 + 0.3, H + 0.24, D / 2 - 0.08]} m={M.ikatA()} radius={0.05} r={[0.2, 0.2, 0]} />
      <SmallPlant p={[-W / 2 + 0.16, H, 0]} id={`${id}-a`} />
      <SmallPlant p={[W / 2 - 0.16, H, 0]} id={`${id}-b`} s={1.15} />
    </group>
  );
}

function DisplayUnit({ W, D, H, id }: ModelProps) {
  return (
    <group>
      <Box s={[W, H - 0.1, D]} p={[0, 0.1 + (H - 0.1) / 2 - 0.0, 0]} m={M.ivoryLacquer()} />
      <Box s={[W - 0.04, 0.1, D - 0.06]} p={[0, 0.05, 0.02]} m={M.plasticDark()} />
      <Box s={[W + 0.01, 0.03, D + 0.01]} p={[0, H - 0.015, 0]} m={M.oak()} />
      <Doors W={W} H={H - 0.14} y0={0.1} z={-D / 2} n={W > 0.9 ? 3 : 2} handleM={M.walnut()} />
      <Cyl r={0.06} rb={0.045} h={0.24} p={[W * 0.3, H + 0.12, 0]} m={M.ceramicTurquoise()} seg={18} />
      <SmallPlant p={[-W * 0.3, H, 0]} id={`${id}-p`} s={0.9} />
    </group>
  );
}

function Desk({ W, D, H }: ModelProps) {
  const top = 0.03;
  const panel = M.sandLacquer();
  return (
    <group>
      <RBox s={[W, top, D]} p={[0, H - top / 2, 0]} m={M.oak()} radius={0.012} />
      {[-1, 1].map((sx) => (
        <Box key={sx} s={[0.03, H - top, D - 0.06]} p={[sx * (W / 2 - 0.05), (H - top) / 2, 0]} m={panel} />
      ))}
      {/* Modesty panel on the client side */}
      <Box s={[W - 0.16, 0.38, 0.018]} p={[0, H - top - 0.24, -D / 2 + 0.12]} m={panel} />
      {/* Monitor turned towards the consultant (+Z) */}
      <group position={[-W * 0.3, H, -0.1]} rotation={[0, Math.PI - 0.35, 0]}>
        <Box s={[0.2, 0.012, 0.16]} p={[0, 0.006, 0]} m={M.metalBlack()} />
        <Box s={[0.04, 0.2, 0.025]} p={[0, 0.11, 0.05]} m={M.metalBlack()} />
        <Box s={[0.55, 0.33, 0.025]} p={[0, 0.34, 0.03]} m={M.metalBlack()} />
        <mesh position={[0, 0.345, 0.016]} rotation={[0, Math.PI, 0]} material={M.monitorOn()}>
          <planeGeometry args={[0.52, 0.29]} />
        </mesh>
      </group>
      <Box s={[0.44, 0.015, 0.14]} p={[W * 0.1, H + 0.008, D / 2 - 0.18]} m={M.plasticDark()} />
      <Box s={[0.06, 0.02, 0.1]} p={[W * 0.1 + 0.32, H + 0.01, D / 2 - 0.18]} m={M.plasticDark()} />
      {/* Brochure stack and pen pot on the client side */}
      <Box s={[0.3, 0.02, 0.21]} p={[-W * 0.25, H + 0.01, -0.08]} m={M.paper()} r={[0, 0.15, 0]} />
      <Cyl r={0.035} h={0.1} p={[-W * 0.4, H + 0.05, 0.15]} m={M.ceramicCobalt()} seg={14} />
    </group>
  );
}

function StaffChair({ W, D }: ModelProps) {
  const fab = M.fabricCharcoal();
  return (
    <group>
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 5) * Math.PI * 2;
        return (
          <group key={k} rotation={[0, a, 0]}>
            <Box s={[0.05, 0.03, 0.3]} p={[0, 0.07, 0.15]} m={M.metalBlack()} />
            <mesh position={[0, 0.03, 0.29]} material={M.plasticDark()}>
              <sphereGeometry args={[0.03, 10, 8]} />
            </mesh>
          </group>
        );
      })}
      <Cyl r={0.025} h={0.36} p={[0, 0.26, 0]} m={M.chrome()} seg={12} />
      <RBox s={[W * 0.78, 0.08, D * 0.74]} p={[0, 0.48, -0.02]} m={fab} radius={0.035} />
      <Box s={[0.05, 0.3, 0.04]} p={[0, 0.62, D * 0.33]} m={M.metalBlack()} />
      <RBox s={[W * 0.72, 0.5, 0.06]} p={[0, 0.86, D * 0.36]} m={fab} radius={0.03} r={[0.12, 0, 0]} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box s={[0.03, 0.2, 0.04]} p={[sx * W * 0.38, 0.6, 0.02]} m={M.metalBlack()} />
          <RBox s={[0.06, 0.03, 0.24]} p={[sx * W * 0.38, 0.71, 0]} m={M.plasticDark()} radius={0.012} />
        </group>
      ))}
    </group>
  );
}

function VisitorChair({ W, D, H }: ModelProps) {
  const fab = M.fabricSaffron();
  return (
    <group>
      <Legs W={W} D={D} h={0.42} inset={0.07} r={0.016} m={M.oak()} splay={0.06} />
      <RBox s={[W - 0.04, 0.08, D - 0.06]} p={[0, 0.46, -0.01]} m={fab} radius={0.035} />
      <RBox s={[W - 0.02, H - 0.5, 0.07]} p={[0, 0.5 + (H - 0.5) / 2, D / 2 - 0.06]} m={fab} radius={0.03} r={[0.1, 0, 0]} />
      {[-1, 1].map((sx) => (
        <RBox key={sx} s={[0.05, 0.05, D - 0.14]} p={[sx * (W / 2 - 0.03), 0.65, 0.02]} m={M.oak()} radius={0.02} />
      ))}
      {[-1, 1].map((sx) => (
        <Cyl key={`s${sx}`} r={0.012} h={0.2} p={[sx * (W / 2 - 0.03), 0.56, -D / 2 + 0.12]} m={M.oak()} seg={8} />
      ))}
    </group>
  );
}

function Credenza({ W, D, H, id }: ModelProps) {
  const plinth = 0.06;
  return (
    <group>
      <Box s={[W - 0.04, plinth, D - 0.04]} p={[0, plinth / 2, 0.01]} m={M.plasticDark()} />
      <Box s={[W, H - plinth - 0.025, D]} p={[0, plinth + (H - plinth - 0.025) / 2, 0]} m={M.sandLacquer()} />
      <Box s={[W + 0.01, 0.025, D + 0.01]} p={[0, H - 0.0125, 0]} m={M.oak()} />
      <Doors W={W} H={H - plinth - 0.025} y0={plinth} z={-D / 2} n={2} handleM={M.metalBlack()} />
      <Box s={[0.08, 0.3, 0.24]} p={[W * 0.3, H + 0.15, 0]} m={M.fabricCobalt()} />
      <Box s={[0.08, 0.3, 0.24]} p={[W * 0.3 - 0.085, H + 0.15, 0]} m={M.fabricTerracotta()} />
      <SmallPlant p={[-W * 0.3, H, 0]} id={`${id}-p`} />
    </group>
  );
}

function AcousticScreen({ W, D, H }: ModelProps) {
  const n = 2;
  const pd = D / n;
  return (
    <group>
      {Array.from({ length: n }, (_, k) => (
        <group key={k}>
          <RBox s={[Math.max(W, 0.04), H - 0.08, pd - 0.02]} p={[0, 0.08 + (H - 0.08) / 2, -D / 2 + pd * (k + 0.5)]} m={M.felt()} radius={0.02} />
          {[-1, 1].map((s) => (
            <Box key={s} s={[0.3, 0.025, 0.05]} p={[0, 0.0125, -D / 2 + pd * (k + 0.5) + s * (pd / 2 - 0.1)]} m={M.metalBlack()} />
          ))}
        </group>
      ))}
    </group>
  );
}

function TeaCounter({ W, D, H }: ModelProps) {
  const plinth = 0.08;
  return (
    <group>
      <Box s={[W - 0.04, plinth, D - 0.05]} p={[0, plinth / 2, 0.02]} m={M.plasticDark()} />
      <Box s={[W, H - plinth - 0.03, D]} p={[0, plinth + (H - plinth - 0.03) / 2, 0]} m={M.sandLacquer()} />
      <Doors W={W} H={H - plinth - 0.03} y0={plinth} z={-D / 2} n={3} handleM={M.walnut()} />
      <Box s={[W + 0.02, 0.03, D + 0.02]} p={[0, H - 0.015, 0]} m={M.oak()} />
      {/* Kettle */}
      <Cyl r={0.08} rb={0.09} h={0.22} p={[-W * 0.36, H + 0.11, 0.05]} m={M.plasticWhite()} seg={20} />
      <Box s={[0.03, 0.14, 0.06]} p={[-W * 0.36 + 0.1, H + 0.12, 0.05]} m={M.plasticDark()} />
      {/* Rishtan-style tray: teapot and piyola bowls */}
      <Cyl r={0.2} h={0.015} p={[0, H + 0.008, 0]} m={M.walnut()} seg={28} />
      <mesh position={[0, H + 0.09, 0.02]} scale={[1, 0.85, 1]} material={M.ceramicCobalt()} castShadow>
        <sphereGeometry args={[0.08, 20, 14]} />
      </mesh>
      <Cyl r={0.012} rb={0.02} h={0.1} p={[0.09, H + 0.1, 0.02]} rot={[0, 0, -0.9]} m={M.ceramicCobalt()} seg={8} />
      {[[-0.11, -0.09], [0.11, -0.09], [-0.12, 0.1], [0.12, 0.12]].map(([x, z], k) => (
        <Cyl key={k} r={0.045} rb={0.025} h={0.045} p={[x, H + 0.038, z]} m={k % 2 ? M.ceramicTurquoise() : M.ceramicCobalt()} seg={16} />
      ))}
      {/* Wall shelf with plates and a lagan (decorative plate) above */}
      <Box s={[W * 0.8, 0.03, 0.22]} p={[0, 1.5, D / 2 - 0.11]} m={M.oak()} />
      {[-0.3, -0.1, 0.1, 0.3].map((x, k) => (
        <Cyl key={k} r={0.035} rb={0.025} h={0.07} p={[x * W * 0.8, 1.55, D / 2 - 0.1]} m={k % 2 ? M.ceramicWhite() : M.ceramicTurquoise()} seg={14} />
      ))}
      <mesh position={[0, 1.88, D / 2 - 0.02]} rotation={[0, Math.PI, 0]} material={M.lagan()}>
        <circleGeometry args={[0.22, 48]} />
      </mesh>
    </group>
  );
}

function WaterCooler({ W, D, H }: ModelProps) {
  const body = H - 0.46;
  return (
    <group>
      <Box s={[W, body, D]} p={[0, body / 2, 0]} m={M.plasticWhite()} />
      <Box s={[W * 0.7, 0.2, 0.01]} p={[0, body - 0.25, -D / 2 - 0.004]} m={M.plasticGrey()} />
      <Box s={[0.03, 0.05, 0.04]} p={[-0.05, body - 0.28, -D / 2 - 0.02]} m={M.ceramicCobalt()} />
      <Box s={[0.03, 0.05, 0.04]} p={[0.05, body - 0.28, -D / 2 - 0.02]} m={M.fabricTerracotta()} />
      <Cyl r={W * 0.42} h={0.4} p={[0, body + 0.24, 0]} m={M.waterBottle()} seg={24} />
      <Cyl r={0.04} h={0.06} p={[0, body + 0.02, 0]} m={M.waterBottle()} seg={12} />
    </group>
  );
}

function TallCabinet({ W, D, H }: ModelProps) {
  return (
    <group>
      <Box s={[W, H - 0.06, D]} p={[0, 0.06 + (H - 0.06) / 2, 0]} m={M.ivoryLacquer()} />
      <Box s={[W - 0.04, 0.06, D - 0.04]} p={[0, 0.03, 0.01]} m={M.plasticDark()} />
      <Doors W={W} H={H - 0.08} y0={0.06} z={-D / 2} n={2} handleM={M.metalBlack()} />
    </group>
  );
}

function Shelving({ W, D, H, id }: ModelProps) {
  const shelves = 5;
  const r = seeded(id);
  const colors = [M.fabricCobalt(), M.fabricTerracotta(), M.fabricSaffron(), M.plasticWhite(), M.fabricSand()];
  return (
    <group>
      {[-1, 1].map((sx) => <Box key={sx} s={[0.025, H, D]} p={[sx * (W / 2 - 0.0125), H / 2, 0]} m={M.ivoryLacquer()} />)}
      <Box s={[W, H, 0.01]} p={[0, H / 2, D / 2 - 0.005]} m={M.ivoryLacquer()} />
      {Array.from({ length: shelves }, (_, k) => {
        const y = 0.05 + (k * (H - 0.08)) / (shelves - 1);
        return (
          <group key={k}>
            <Box s={[W - 0.05, 0.022, D - 0.01]} p={[0, y, 0]} m={M.ivoryLacquer()} />
            {k < shelves - 1 && Array.from({ length: 6 }, (_, j) => {
              const bw = 0.07 + r() * 0.03, bh = 0.22 + r() * 0.1;
              return <Box key={j} s={[bw, bh, D * 0.75]} p={[-W / 2 + 0.07 + j * 0.11, y + 0.011 + bh / 2, 0.02]} m={colors[Math.floor(r() * colors.length)]} />;
            })}
          </group>
        );
      })}
    </group>
  );
}

function CleaningCupboard({ W, D, H }: ModelProps) {
  return (
    <group>
      <Box s={[W, H - 0.05, D]} p={[0, 0.05 + (H - 0.05) / 2, 0]} m={M.sandLacquer()} />
      <Box s={[W - 0.03, 0.05, D - 0.03]} p={[0, 0.025, 0.01]} m={M.plasticDark()} />
      <Doors W={W} H={H - 0.07} y0={0.05} z={-D / 2} n={1} handleM={M.metalBlack()} />
      {/* Ventilation slots */}
      {[0, 1, 2].map((k) => <Box key={k} s={[W * 0.5, 0.01, 0.004]} p={[0, H - 0.15 - k * 0.03, -D / 2 - 0.002]} m={M.plasticDark()} />)}
    </group>
  );
}

function Printer({ W, D, H }: ModelProps) {
  const standH = H - 0.36;
  return (
    <group>
      <Box s={[W, standH, D]} p={[0, standH / 2, 0]} m={M.plasticDark()} />
      <RBox s={[W - 0.02, 0.3, D - 0.06]} p={[0, standH + 0.15, 0.02]} m={M.plasticWhite()} radius={0.02} />
      <Box s={[W - 0.04, 0.05, D - 0.1]} p={[0, standH + 0.325, 0.03]} m={M.plasticGrey()} />
      <Box s={[0.08, 0.01, 0.06]} p={[W * 0.3, standH + 0.355, -D / 2 + 0.08]} m={M.screen()} />
      <Box s={[W * 0.6, 0.01, 0.22]} p={[0, standH + 0.17, -D / 2 + 0.06]} m={M.paper()} />
    </group>
  );
}

function Safe({ W, D, H }: ModelProps) {
  return (
    <group>
      <Box s={[W, H, D]} p={[0, H / 2, 0]} m={M.metalBlack()} />
      <Box s={[W - 0.06, H - 0.06, 0.01]} p={[0, H / 2, -D / 2 - 0.004]} m={M.plasticDark()} />
      <Cyl r={0.04} h={0.02} p={[W * 0.15, H / 2, -D / 2 - 0.015]} rot={[Math.PI / 2, 0, 0]} m={M.chrome()} seg={18} />
      <Box s={[0.05, 0.03, 0.01]} p={[-W * 0.2, H * 0.7, -D / 2 - 0.01]} m={M.screen()} />
    </group>
  );
}

function Bin({ W, H }: ModelProps) {
  return (
    <group>
      <Cyl r={W / 2} rb={W / 2.3} h={H} p={[0, H / 2, 0]} m={M.metalBlack()} seg={18} open />
      <Cyl r={W / 2.3} h={0.01} p={[0, 0.006, 0]} m={M.metalBlack()} seg={18} />
    </group>
  );
}

function Rug({ W, D }: ModelProps) {
  return (
    <mesh position={[0, 0.006, 0]} material={M.carpet()} receiveShadow>
      <boxGeometry args={[W, 0.012, D]} />
    </mesh>
  );
}

function Generic({ W, D, H }: ModelProps) {
  return <Box s={[W, H, D]} p={[0, H / 2, 0]} m={M.sandLacquer()} />;
}

export const MODELS: Record<ModelKind, (p: ModelProps) => ReactElement> = {
  rug: Rug,
  sofa: Sofa,
  armchair: Armchair,
  'coffee-table': CoffeeTable,
  'side-table': SideTable,
  'floor-lamp': FloorLamp,
  'lattice-screen': LatticeScreen,
  plant: Plant,
  'coat-stand': CoatStand,
  'umbrella-stand': UmbrellaStand,
  'window-bench': WindowBench,
  'display-unit': DisplayUnit,
  desk: Desk,
  'staff-chair': StaffChair,
  'visitor-chair': VisitorChair,
  credenza: Credenza,
  'acoustic-screen': AcousticScreen,
  'tea-counter': TeaCounter,
  'water-cooler': WaterCooler,
  'tall-cabinet': TallCabinet,
  shelving: Shelving,
  'cleaning-cupboard': CleaningCupboard,
  printer: Printer,
  safe: Safe,
  bin: Bin,
  generic: Generic,
};
