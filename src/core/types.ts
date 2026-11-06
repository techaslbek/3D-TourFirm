// Layout data model. Units are metres.
// Layout coordinates: x along the street facade (0..width), y into the room (0 = facade, depth = back wall).
// Three.js mapping: X = x, Y = height, Z = -y (see toThree in geometry.ts).

export type ItemLayer = 'floor' | 'rug' | 'under';
export type Facing = '+x' | '-x' | '+y' | '-y';

export interface Item {
  id: string;
  label: string;
  cat: string;
  layer: ItemLayer;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  faces?: Facing;
  shape?: 'round';
  /** Catalogue entry this item was made from (used for the budget and model swaps). */
  catalogId?: string;
  /** Colour override for the item's main finish (upholstery or cabinet body). */
  color?: string;
  /** Hidden items are not drawn, not collided with and not counted in the budget. */
  hidden?: boolean;
}

export type WallName = 'left' | 'right' | 'back' | 'front' | 'partition-east' | 'partition-west';

export interface WallItem {
  id: string;
  label: string;
  wall: WallName;
  at: number;
  width: number;
  z0: number;
  z1: number;
}

export interface Opening {
  id: string;
  x0: number;
  x1: number;
  type?: string;
  note?: string;
}

export interface Partition {
  id: string;
  label: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  openings: Opening[];
}

export interface Zone {
  id: string;
  label: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  labelAt?: [number, number];
}

export interface WindowSpec {
  id: string;
  x0: number;
  x1: number;
  sill: number;
  head: number;
}

export interface DoorSpec {
  id: string;
  x0: number;
  x1: number;
  clearWidth: number;
  leaf: number;
  hinge: 'left' | 'right';
  swing: 'inward' | 'outward';
  note?: string;
}

export interface Room {
  width: number;
  depth: number;
  ceilingHeight: number;
  ceilingHeightNote?: string;
  facade: { wall: 'front'; windows: WindowSpec[]; door: DoorSpec };
}

export interface CeilingRect { id: string; label: string; x0: number; y0: number; x1: number; y1: number }
export interface CeilingPoint { id: string; label: string; x: number; y: number }
export type CeilingItem = CeilingRect | CeilingPoint;

export type FloorFinish = 'oak' | 'light-oak' | 'walnut' | 'stone' | 'carpet-tiles';

export interface Finishes {
  floor: FloorFinish;
  wall: string;
  feature: string;
  ceiling: string;
}

export interface LightingSettings {
  /** Colour temperature of the interior lights, in kelvin (2700 warm … 4000 neutral). */
  warmth: number;
  /** Brightness multiplier for the interior lights (0.5 … 1.5). */
  brightness: number;
}

export const DEFAULT_FINISHES: Finishes = { floor: 'oak', wall: '#f4eee4', feature: '#e2cdae', ceiling: '#f6f1e8' };
export const DEFAULT_LIGHTING: LightingSettings = { warmth: 3000, brightness: 1 };

export interface Layout {
  schema: string;
  name: string;
  status: string;
  room: Room;
  partitions: Partition[];
  zones: Zone[];
  items: Item[];
  wallItems: WallItem[];
  ceiling: CeilingItem[];
  finishes?: Finishes;
  lighting?: LightingSettings;
}

export interface Rect { x0: number; x1: number; y0: number; y1: number }

export const isCeilingRect = (c: CeilingItem): c is CeilingRect => 'x0' in c;
