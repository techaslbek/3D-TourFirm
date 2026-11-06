import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraRig } from '../controls/CameraRig';
import { debug } from '../debug';
import { sceneHooks } from '../ui/exports';
import { useStore, type Quality } from '../state/store';
import { Architecture } from './Architecture';
import { DPR, Effects, Exterior, Lighting, Overlays } from './Environment';
import { Furniture } from './Furniture';
import { WallItems } from './WallItems';

export function Scene() {
  const quality = useStore.getState().quality;
  return (
    <Canvas
      shadows="percentage"
      dpr={DPR[quality]}
      camera={{ fov: 55, near: 0.05, far: 250, position: [5, 6.5, 7.5] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      onPointerMissed={(e) => { if (e.button === 0 && !useStore.getState().dragging) useStore.getState().set({ selected: null }); }}
    >
      <color attach="background" args={['#dfe7ec']} />
      <fog attach="fog" args={['#dfe7ec', 35, 90]} />
      <Lighting />
      <Exterior />
      <Architecture />
      <Furniture />
      <WallItems />
      <Overlays />
      <CameraRig />
      <Effects />
      <FrameStats />
      <DebugHooks />
    </Canvas>
  );
}

const STEP_DOWN: Record<Quality, Quality> = { high: 'balanced', balanced: 'low', low: 'low' };

/** Measures FPS once per second and lowers quality when it stays below 24 FPS for 3 seconds. */
function FrameStats() {
  const acc = useRef({ frames: 0, time: 0, slow: 0, warm: 0 });
  useFrame((_, delta) => {
    debug.frames++;
    const a = acc.current;
    a.frames++;
    a.time += delta;
    if (a.time < 1) return;
    const fps = Math.round(a.frames / a.time);
    a.frames = 0;
    a.time = 0;
    a.warm++;
    const s = useStore.getState();
    debug.fps = fps;
    if (s.showFps) s.set({ fps });
    if (!s.autoQuality || a.warm < 4 || document.hidden) return;
    a.slow = fps < 24 ? a.slow + 1 : 0;
    if (a.slow >= 3 && s.quality !== 'low') {
      a.slow = 0;
      a.warm = 0;
      s.set({ quality: STEP_DOWN[s.quality], qualityNotice: 'qualityLowered' });
    }
  });
  return null;
}

/** Lets tests convert layout coordinates to screen pixels (read-only helper). */
function DebugHooks() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    sceneHooks.capture = (scale) => {
      const { gl, scene, camera, size } = get();
      const ratio = gl.getPixelRatio();
      gl.setPixelRatio(ratio * scale);
      gl.setSize(size.width, size.height, false);
      gl.render(scene, camera);
      // toBlob copies the drawing buffer synchronously, before the browser can clear it.
      const blob = new Promise<Blob>((resolve, reject) => gl.domElement.toBlob((b) => (b ? resolve(b) : reject(new Error('Screenshot failed'))), 'image/png'));
      gl.setPixelRatio(ratio);
      gl.setSize(size.width, size.height, false);
      return blob;
    };
    sceneHooks.objects = () => ['architecture', 'furniture', 'wall-items', 'exterior']
      .map((n) => get().scene.getObjectByName(n))
      .filter((o): o is THREE.Object3D => !!o);
    debug.project = (x, y, h = 0) => {
      const { camera, size } = get();
      const v = new THREE.Vector3(x, h, -y).project(camera);
      return [((v.x + 1) / 2) * size.width + size.left, ((1 - v.y) / 2) * size.height + size.top];
    };
  }, [get]);
  return null;
}
