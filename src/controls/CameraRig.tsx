import { MapControls, OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { moveWithCollision } from '../core/collision';
import { walkBounds, walkColliders } from '../core/layout';
import { useStore } from '../state/store';
import { debug } from '../debug';
import { isTypingTarget } from '../ui/keys';

/** Layout (x, y, height) to Three.js (x, height, -y). */
const L2T = (p: [number, number, number]): [number, number, number] => [p[0], p[2], -p[1]];

export function CameraRig() {
  const mode = useStore((s) => s.cameraMode);
  if (mode === 'plan') return <PlanRig />;
  if (mode === 'walk') return <WalkRig />;
  return <OrbitRig />;
}

function OrbitRig() {
  const req = useStore((s) => s.cameraRequest);
  const get = useThree((s) => s.get);
  const preset = req?.preset;
  const target = useMemo(() => (preset ? L2T(preset.look) : ([5, 0.5, -3] as [number, number, number])), [preset]);
  useLayoutEffect(() => {
    if (!preset) return;
    const cam = get().camera;
    cam.position.set(...L2T(preset.pos));
    cam.lookAt(...target);
  }, [req?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <OrbitControls
      key={req?.nonce}
      makeDefault
      target={target}
      enableDamping
      dampingFactor={0.12}
      minDistance={0.6}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.03}
    />
  );
}

function PlanRig() {
  const req = useStore((s) => s.cameraRequest);
  const layout = useStore((s) => s.layout);
  const panelOpen = useStore((s) => s.panelOpen);
  const size = useThree((s) => s.size);
  const { width: W, depth: D } = layout.room;
  // Fit the room into the part of the screen not covered by the side panel and toolbar.
  const padLeft = panelOpen && size.width > 760 ? 360 : 0;
  const padTop = 80;
  const zoom = Math.max(10, Math.min((size.width - padLeft) / (W + 3), (size.height - padTop) / (D + 4.5)));
  const cx = W / 2 - padLeft / 2 / zoom;
  const cz = -D / 2 - padTop / 2 / zoom + 0.6;
  return (
    <>
      <OrthographicCamera key={`cam-${req?.nonce}`} makeDefault position={[cx, 40, cz + 0.001]} zoom={zoom} near={0.1} far={200} />
      <MapControls key={`ctl-${req?.nonce}`} makeDefault target={[cx, 0, cz]} enableRotate={false} screenSpacePanning minZoom={8} maxZoom={400} />
    </>
  );
}

const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
/**
 * First-person walking: WASD / arrows, mouse-look with pointer lock (click the view),
 * drag-to-look as a fallback, 2D collision against walls, partitions, furniture and the door.
 */
function WalkRig() {
  const get = useThree((s) => s.get);
  const gl = useThree((s) => s.gl);
  const req = useStore((s) => s.cameraRequest);
  const layout = useStore((s) => s.layout);
  const doorOpen = useStore((s) => s.doorOpen);
  const rects = useMemo(() => walkColliders(layout, doorOpen), [layout, doorOpen]);
  const bounds = useMemo(() => walkBounds(layout), [layout]);
  const keys = useRef(new Set<string>());
  const pose = useRef({ x: 5, y: -3, yaw: 0, pitch: 0 });

  useLayoutEffect(() => {
    const p = req?.preset;
    if (!p || p.mode !== 'walk') return;
    const dx = p.look[0] - p.pos[0], dy = p.look[1] - p.pos[1], dz = p.look[2] - p.pos[2];
    pose.current = { x: p.pos[0], y: p.pos[1], yaw: Math.atan2(-dx, dy), pitch: Math.atan2(dz, Math.hypot(dx, dy)) };
  }, [req?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: KeyboardEvent) => { if (!isTypingTarget(e.target) && KEYS.has(e.code)) { keys.current.add(e.code); e.preventDefault(); } };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    const look = (mx: number, my: number) => {
      const p = pose.current;
      p.yaw -= mx * 0.0022;
      p.pitch = Math.max(-1.35, Math.min(1.35, p.pitch - my * 0.0022));
    };
    const mouse = (e: MouseEvent) => { if (document.pointerLockElement === el) look(e.movementX, e.movementY); };
    let drag: { x: number; y: number; moved: number } | null = null;
    const pdown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      // Clicking the 3D view returns keyboard focus to navigation.
      (document.activeElement as HTMLElement | null)?.blur?.();
    };
    const pmove = (e: PointerEvent) => {
      if (!drag || document.pointerLockElement === el) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX; drag.y = e.clientY;
      look(-dx * 1.6, -dy * 1.6); // drag the scene: opposite of mouse-look
    };
    const pup = (e: PointerEvent) => {
      const click = drag && drag.moved < 4 && e.pointerType === 'mouse';
      drag = null;
      if (click && document.pointerLockElement !== el) {
        try {
          const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
          r?.catch?.(() => { /* pointer lock refused: drag-to-look still works */ });
        } catch { /* not supported */ }
      }
    };
    const lockChange = () => useStore.getState().set({ pointerLocked: document.pointerLockElement === el });
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('mousemove', mouse);
    document.addEventListener('pointerlockchange', lockChange);
    el.addEventListener('pointerdown', pdown);
    window.addEventListener('pointermove', pmove);
    window.addEventListener('pointerup', pup);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('mousemove', mouse);
      document.removeEventListener('pointerlockchange', lockChange);
      el.removeEventListener('pointerdown', pdown);
      window.removeEventListener('pointermove', pmove);
      window.removeEventListener('pointerup', pup);
      if (document.pointerLockElement === el) document.exitPointerLock();
      useStore.getState().set({ pointerLocked: false });
    };
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { walkSpeed, eyeHeight, collision } = useStore.getState();
    const k = keys.current;
    const p = pose.current;
    const turn = (k.has('KeyQ') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyE') || k.has('ArrowRight') ? 1 : 0);
    p.yaw += turn * 1.8 * dt;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const strafe = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    if (fwd || strafe) {
      const run = k.has('ShiftLeft') || k.has('ShiftRight') ? 2 : 1;
      const len = Math.hypot(fwd, strafe);
      const v = (walkSpeed * run * dt) / len;
      // Layout frame: forward = (-sin yaw, cos yaw), right = (cos yaw, sin yaw)
      const dx = (-Math.sin(p.yaw) * fwd + Math.cos(p.yaw) * strafe) * v;
      const dy = (Math.cos(p.yaw) * fwd + Math.sin(p.yaw) * strafe) * v;
      if (collision) {
        [p.x, p.y] = moveWithCollision(p.x, p.y, dx, dy, 0.25, rects, bounds);
      } else {
        p.x = Math.min(Math.max(p.x + dx, bounds.x0), bounds.x1);
        p.y = Math.min(Math.max(p.y + dy, bounds.y0), bounds.y1);
      }
    }
    const cam = get().camera;
    cam.position.set(p.x, eyeHeight, -p.y);
    cam.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    debug.walk = { ...p };
  });

  return null;
}
