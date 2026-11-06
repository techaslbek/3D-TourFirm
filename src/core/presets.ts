import type { Layout } from './types';

export type CameraMode = 'orbit' | 'walk' | 'plan' | 'dollhouse';

/** Camera preset in layout coordinates: position (x, y, height) looking at a target (x, y, height). */
export interface CameraPreset {
  id: string;
  mode: CameraMode;
  pos: [number, number, number];
  look: [number, number, number];
}

const EYE = 1.6;

export function cameraPresets(layout: Layout): CameraPreset[] {
  const { width: W, depth: D } = layout.room;
  const door = layout.room.facade.door;
  const dc = (door.x0 + door.x1) / 2;
  const sx = W / 10, sy = D / 6; // keep interior presets proportional when the room is resized
  return [
    { id: 'overview', mode: 'orbit', pos: [W / 2, -7.5, 6.5], look: [W / 2, D / 2, 0.6] },
    { id: 'dollhouse', mode: 'dollhouse', pos: [W / 2 - 5.5, -6.5, 9.5], look: [W / 2, D / 2, 0] },
    { id: 'plan', mode: 'plan', pos: [W / 2, D / 2, 30], look: [W / 2, D / 2, 0] },
    { id: 'street', mode: 'walk', pos: [dc, -3.0, EYE], look: [dc, 3, EYE] },
    { id: 'entrance', mode: 'walk', pos: [dc, 0.9, EYE], look: [dc - 0.3, D, 1.4] },
    { id: 'lounge', mode: 'walk', pos: [4.1 * sx, 3.1 * sy, EYE], look: [1.4 * sx, 0.9 * sy, 0.9] },
    { id: 'visitor', mode: 'walk', pos: [6.3 * sx, 2.65 * sy, 1.2], look: [6.3 * sx, 5.5 * sy, 1.1] },
    { id: 'consultant', mode: 'walk', pos: [6.3 * sx, 5.05 * sy, 1.2], look: [dc, 0.2, 1.1] },
    { id: 'tea', mode: 'walk', pos: [4.6 * sx, 3.0 * sy, EYE], look: [2.2 * sx, 5.6 * sy, 1.1] },
    { id: 'destination', mode: 'walk', pos: [6.6 * sx, 1.6 * sy, EYE], look: [W, 1.6 * sy, 1.5] },
  ];
}
