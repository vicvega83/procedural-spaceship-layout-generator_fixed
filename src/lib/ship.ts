export type Axis = 'x' | 'y' | 'z';
export type Vec3 = { x: number; y: number; z: number };
export type Face = 'north' | 'south' | 'east' | 'west' | 'ceiling' | 'floor';
export type RoomType = 'bridge' | 'quarters' | 'cargo' | 'engineering' | 'corridor' | 'medical' | 'reactor' | 'airlock';
export type OpeningType = 'window' | 'door' | 'airlock';
export type MountType = 'turret' | 'thruster' | 'antenna' | 'landingGear' | 'sensorPod' | 'cargoHook' | 'dockingPort' | 'heatSink' | 'lifeSupport';
export type RuleKey = 'bridge' | 'windows' | 'airlocks' | 'furniture' | 'populate' | 'external';
export type FurnishingType = 'console' | 'crate' | 'bed' | 'reactor' | 'table' | 'locker' | 'desk' | 'shelf' | 'chair' | 'tank' | 'panel' | 'cable' | 'pipe';
export type InteriorObjectKind = 'desk' | 'crate' | 'locker' | 'shelf' | 'chair' | 'bed' | 'table' | 'console' | 'panel' | 'tank' | 'pipe' | 'cable' | 'poster' | 'reactor' | 'crateOpen' | 'barrel';
export type ExteriorObjectKind = 'turret' | 'thruster' | 'antenna' | 'landingGear' | 'sensorPod' | 'cargoHook' | 'dockingPort' | 'heatSink' | 'lifeSupport';

export interface RoomPalette { wall: string; corner: string; trim: string; accent: string; dark: string; highlight: string }

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  min: Vec3;
  size: Vec3;
  born: number;
  palette?: RoomPalette;
}

export interface Opening {
  id: string;
  roomId: string;
  otherRoomId?: string;
  type: OpeningType;
  face: Face;
  center: Vec3;
  width: number;
  height: number;
  opened?: boolean;
}

export interface HullMount {
  id: string;
  roomId: string;
  type: MountType;
  face: Face;
  center: Vec3;
}

export interface Furnishing {
  id: string;
  roomId: string;
  type: FurnishingType;
  center: Vec3;
  size: Vec3;
}

export interface InteriorObject {
  id: string;
  roomId: string;
  kind: InteriorObjectKind;
  parentId?: string;
  center: Vec3;
  size: Vec3;
  rotation: number;
  seed: number;
  data?: Record<string, unknown>;
}

export interface ExteriorObject {
  id: string;
  roomId: string;
  kind: ExteriorObjectKind;
  face: Face;
  center: Vec3;
  size: Vec3;
  rotation: number;
  seed: number;
}

export interface GrowthEvent {
  id: number;
  type: 'seed' | 'split' | 'extrude' | 'rules' | 'opening' | 'edit' | 'interior' | 'exterior';
  label: string;
  detail: string;
  roomId?: string;
  undoable: boolean;
}

export interface ShipLayout {
  rooms: Room[];
  openings: Opening[];
  mounts: HullMount[];
  furniture: Furnishing[];
  interior: InteriorObject[];
  exterior: ExteriorObject[];
  seed: number;
  iteration: number;
  nextId: number;
  log: GrowthEvent[];
}

export interface GeneratorParams {
  seed: number;
  minSize: number;
  maxAspect: number;
  maxRooms: number;
  enableY: boolean;
  splitBias: number;
  extrusionSize: number;
  exteriorDensity: number;
}

export interface RuleConfig {
  enabled: Record<RuleKey, boolean>;
  windowMinWidth: number;
  windowMaxWidth: number;
  windowMinHeight: number;
  windowMaxHeight: number;
  faces: Face[];
  mounts: ExteriorObjectKind[];
}

export interface Panel {
  center: Vec3;
  size: Vec3;
  roomId: string;
  face: Face;
}

type Range = [number, number];
const EPS = 0.001;
export const FRAME_MARGIN = 0.18;
export const WALL_TILE = 0.55;
export const CORNER_SIZE = 0.55;
export const ANGLE_SIZE = 0.45;
export const OPENING_EDGE_CLEARANCE = CORNER_SIZE + FRAME_MARGIN;
export const FRAME_DEPTH = 0.18;
export const FRAME_THICKNESS = 0.07;
export const WINDOW_GLASS_TINT = 0.32;
export const DOOR_PANEL_THICKNESS = 0.06;
export const AIRLOCK_RING_THICKNESS = 0.12;
export const FACES: Face[] = ['north', 'south', 'east', 'west', 'ceiling', 'floor'];
export const SIDE_FACES: Face[] = ['north', 'east', 'south', 'west'];
export const ROOM_TYPES: RoomType[] = ['bridge', 'quarters', 'cargo', 'engineering', 'corridor', 'medical', 'reactor', 'airlock'];
export const ROOM_COLORS: Record<RoomType, string> = {
  bridge: '#c6ed8c', quarters: '#729996', cargo: '#bca17a', engineering: '#72afa4',
  corridor: '#7c9ea4', medical: '#81aab9', reactor: '#b69c7b', airlock: '#dba16e',
};
export const ROOM_NAMES: Record<RoomType, string> = {
  bridge: 'Bridge', quarters: 'Crew quarters', cargo: 'Cargo bay', engineering: 'Engineering',
  corridor: 'Passage', medical: 'Med bay', reactor: 'Reactor', airlock: 'Airlock',
};
export const DEFAULT_PARAMS: GeneratorParams = {
  seed: 48291, minSize: 2.4, maxAspect: 3, maxRooms: 24, enableY: false, splitBias: 0.65, extrusionSize: 5, exteriorDensity: 1,
};
export const DEFAULT_RULES: RuleConfig = {
  enabled: { bridge: true, windows: true, airlocks: true, furniture: true, populate: true, external: true },
  windowMinWidth: 0.9, windowMaxWidth: 2.4, windowMinHeight: 0.9, windowMaxHeight: 1.6,
  faces: ['north', 'east', 'south', 'west'],
  mounts: ['turret', 'thruster', 'antenna', 'landingGear', 'sensorPod', 'cargoHook', 'dockingPort', 'heatSink', 'lifeSupport'],
};

export function random(seed: number) {
  let value = (seed >>> 0) || 0x9E3779B9;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cloneLayout(layout: ShipLayout): ShipLayout { return JSON.parse(JSON.stringify(layout)); }
export function roomCenter(room: Room): Vec3 { return { x: room.min.x + room.size.x / 2, y: room.min.y + room.size.y / 2, z: room.min.z + room.size.z / 2 }; }

export function faceAxes(face: Face): { normal: Axis; u: Axis; v: Axis; sign: number } {
  if (face === 'north' || face === 'south') return { normal: 'z', u: 'x', v: 'y', sign: face === 'north' ? -1 : 1 };
  if (face === 'east' || face === 'west') return { normal: 'x', u: 'z', v: 'y', sign: face === 'west' ? -1 : 1 };
  return { normal: 'y', u: 'x', v: 'z', sign: face === 'floor' ? -1 : 1 };
}

export function faceCenter(room: Room, face: Face): Vec3 {
  const center = roomCenter(room);
  const { normal, sign } = faceAxes(face);
  center[normal] = room.min[normal] + (sign > 0 ? room.size[normal] : 0);
  return center;
}

function intervalOverlap(a0: number, a1: number, b0: number, b1: number) { return Math.min(a1, b1) - Math.max(a0, b0) > EPS; }

function subtractRange(ranges: Range[], blocked: Range): Range[] {
  return ranges.flatMap(([lo, hi]) => {
    if (blocked[1] <= lo || blocked[0] >= hi) return [[lo, hi] as Range];
    const result: Range[] = [];
    if (blocked[0] > lo + EPS) result.push([lo, Math.min(hi, blocked[0])]);
    if (blocked[1] < hi - EPS) result.push([Math.max(lo, blocked[1]), hi]);
    return result;
  });
}

function sampleRanges(ranges: Range[], rng: () => number): number {
  const total = ranges.reduce((sum, range) => sum + range[1] - range[0], 0);
  let distance = rng() * total;
  for (const [lo, hi] of ranges) {
    if (distance <= hi - lo) return lo + distance;
    distance -= hi - lo;
  }
  return ranges[ranges.length - 1][1];
}

function nearestInRanges(ranges: Range[], value: number) {
  return ranges.map(([lo, hi]) => Math.max(lo, Math.min(hi, value)))
    .sort((a, b) => Math.abs(a - value) - Math.abs(b - value))[0];
}

function addEvent(layout: ShipLayout, event: Omit<GrowthEvent, 'id'>) { layout.log.push({ ...event, id: layout.log.length }); }

function openingMarginExtent(opening: Opening, axis: Axis): Range {
  const { u, v } = faceAxes(opening.face);
  const span = axis === u ? opening.width : axis === v ? opening.height : 0;
  return [opening.center[axis] - span / 2 - FRAME_MARGIN, opening.center[axis] + span / 2 + FRAME_MARGIN];
}



export function getSplitRanges(layout: ShipLayout, room: Room, axis: Axis, params: GeneratorParams): Range[] {
  if (axis === 'y' && !params.enableY) return [];
  const axes: Axis[] = params.enableY ? ['x', 'y', 'z'] : ['x', 'z'];
  const others = axes.filter(a => a !== axis).map(a => room.size[a]);
  if (Math.max(...others) / Math.min(...others) > params.maxAspect + EPS) return [];
  const minChild = Math.max(params.minSize, Math.max(...others) / params.maxAspect);
  const maxChild = Math.min(...others) * params.maxAspect;
  const start = room.min[axis];
  const end = start + room.size[axis];
  const lo = Math.max(start + minChild, end - maxChild);
  const hi = Math.min(end - minChild, start + maxChild);
  if (hi < lo) return [];
  let ranges: Range[] = [[lo, hi]];
  for (const opening of layout.openings) {
    if (opening.roomId === room.id || opening.otherRoomId === room.id) {
      ranges = subtractRange(ranges, openingMarginExtent(opening, axis));
    }
  }
  for (const object of [...layout.interior, ...layout.exterior]) {
    if (object.roomId !== room.id) continue;
    const span = Math.max(object.size.x, object.size.y, object.size.z);
    ranges = subtractRange(ranges, [object.center[axis] - span / 2 - FRAME_MARGIN, object.center[axis] + span / 2 + FRAME_MARGIN]);
  }
  return ranges;
}

export function splitRoom(layout: ShipLayout, roomId: string, axis: Axis, params: GeneratorParams, fraction?: number): string | null {
  if (layout.rooms.length >= params.maxRooms) return null;
  const room = layout.rooms.find(r => r.id === roomId);
  if (!room) return null;
  const ranges = getSplitRanges(layout, room, axis, params);
  if (!ranges.length) return null;
  const rng = random(layout.seed * 1009 + layout.iteration * 977 + layout.nextId * 53);
  const basePosition = fraction === undefined ? sampleRanges(ranges, rng) : nearestInRanges(ranges, room.min[axis] + room.size[axis] * fraction);
  const jitter = (rng() - 0.5) * Math.max(0, ranges[0][1] - ranges[0][0]) * 0.4;
  const position = fraction === undefined ? nearestInRanges(ranges, basePosition + jitter) : basePosition;
  const newRoom: Room = {
    ...room, id: `R-${String(layout.nextId++).padStart(3, '0')}`,
    min: { ...room.min, [axis]: position },
    size: { ...room.size, [axis]: room.min[axis] + room.size[axis] - position },
    born: layout.iteration + 1,
  };
  room.size[axis] = position - room.min[axis];
  const movedToNew = <T extends { roomId: string; center: Vec3 }>(item: T) => { if (item.center[axis] >= position) item.roomId = newRoom.id; };
  layout.openings.forEach(opening => {
    if (opening.center[axis] >= position) {
      if (opening.roomId === room.id) opening.roomId = newRoom.id;
      if (opening.otherRoomId === room.id) opening.otherRoomId = newRoom.id;
    }
  });
  layout.furniture.forEach(movedToNew);
  layout.interior.forEach(movedToNew);
  layout.exterior.forEach(movedToNew);
  layout.mounts.forEach(mount => { if (mount.center[axis] >= position) mount.roomId = newRoom.id; });
  layout.rooms.push(newRoom);
  layout.iteration++;
  addEvent(layout, { type: 'split', label: `${axis.toUpperCase()} split`, detail: `${room.id} into ${room.id} + ${newRoom.id}`, roomId: newRoom.id, undoable: true });
  return newRoom.id;
}

export function getExtrusionRange(layout: ShipLayout, room: Room, face: Face, params: GeneratorParams): Range | null {
  const { normal, u, v, sign } = faceAxes(face);
  if (normal === 'y' && !params.enableY) return null;
  const plane = faceCenter(room, face)[normal];
  if (layout.openings.some(o => (o.roomId === room.id || o.otherRoomId === room.id) && faceAxes(o.face).normal === normal && Math.abs(o.center[normal] - plane) < EPS)) return null;
  if (layout.exterior.some(o => o.roomId === room.id && faceMatchesMount(o, face))) return null;
  const constrainedAxes: Axis[] = params.enableY ? ['x', 'y', 'z'] : ['x', 'z'];
  const others = constrainedAxes.filter(a => a !== normal).map(a => room.size[a]);
  if (Math.max(...others) / Math.min(...others) > params.maxAspect + EPS) return null;
  const minLength = Math.max(params.minSize, Math.max(...others) / params.maxAspect);
  let maxLength = Math.min(params.extrusionSize, Math.min(...others) * params.maxAspect);
  for (const other of layout.rooms) {
    if (other.id === room.id) continue;
    if (!intervalOverlap(room.min[u], room.min[u] + room.size[u], other.min[u], other.min[u] + other.size[u])) continue;
    if (!intervalOverlap(room.min[v], room.min[v] + room.size[v], other.min[v], other.min[v] + other.size[v])) continue;
    const near = sign > 0 ? other.min[normal] : other.min[normal] + other.size[normal];
    const far = sign > 0 ? other.min[normal] + other.size[normal] : other.min[normal];
    if ((far - plane) * sign <= EPS) continue;
    maxLength = Math.min(maxLength, Math.max(0, (near - plane) * sign));
  }
  return maxLength >= minLength ? [minLength, maxLength] : null;
}

function faceMatchesMount(object: ExteriorObject | HullMount, face: Face): boolean {
  if ('face' in object) return object.face === face;
  return false;
}

export function extrudeRoom(layout: ShipLayout, roomId: string, face: Face, params: GeneratorParams, requestedLength?: number): string | null {
  if (layout.rooms.length >= params.maxRooms) return null;
  const room = layout.rooms.find(r => r.id === roomId);
  if (!room) return null;
  const range = getExtrusionRange(layout, room, face, params);
  if (!range) return null;
  const rng = random(layout.seed * 7919 + layout.iteration * 541 + layout.nextId * 71);
  const baseLength = requestedLength === undefined ? sampleRanges([range], rng) : Math.max(range[0], Math.min(range[1], requestedLength));
  const length = requestedLength === undefined ? Math.max(range[0], Math.min(range[1], baseLength + (rng() - 0.5) * (range[1] - range[0]) * 0.45)) : baseLength;
  const { normal, sign } = faceAxes(face);
  const next: Room = {
    id: `R-${String(layout.nextId++).padStart(3, '0')}`,
    name: 'Compartment', type: 'cargo', min: { ...room.min }, size: { ...room.size, [normal]: length }, born: layout.iteration + 1,
  };
  next.min[normal] = sign > 0 ? room.min[normal] + room.size[normal] : room.min[normal] - length;
  layout.rooms.push(next);
  layout.iteration++;
  addEvent(layout, { type: 'extrude', label: `${face.charAt(0).toUpperCase() + face.slice(1)} extrusion`, detail: `${room.id} to ${next.id} / ${length.toFixed(2)} m`, roomId: next.id, undoable: true });
  return next.id;
}

export function faceNeighbors(layout: ShipLayout, room: Room, face: Face): Room[] {
  const { normal, u, v, sign } = faceAxes(face);
  const plane = faceCenter(room, face)[normal];
  return layout.rooms.filter(other => {
    if (other.id === room.id) return false;
    const otherPlane = other.min[normal] + (sign < 0 ? other.size[normal] : 0);
    return Math.abs(otherPlane - plane) < EPS
      && intervalOverlap(room.min[u], room.min[u] + room.size[u], other.min[u], other.min[u] + other.size[u])
      && intervalOverlap(room.min[v], room.min[v] + room.size[v], other.min[v], other.min[v] + other.size[v]);
  });
}

export function partialFaceNeighbors(layout: ShipLayout, room: Room, face: Face): Room[] {
  const { normal, u, v, sign } = faceAxes(face);
  const plane = faceCenter(room, face)[normal];
  return layout.rooms.filter(other => {
    if (other.id === room.id) return false;
    const otherPlane = other.min[normal] + (sign < 0 ? other.size[normal] : 0);
    if (Math.abs(otherPlane - plane) > EPS) return false;
    return intervalOverlap(room.min[u], room.min[u] + room.size[u], other.min[u], other.min[u] + other.size[u])
      && intervalOverlap(room.min[v], room.min[v] + room.size[v], other.min[v], other.min[v] + other.size[v]);
  });
}

export function openingsOnFace(layout: ShipLayout, room: Room, face: Face): Opening[] {
  const { normal, u, v } = faceAxes(face);
  const plane = faceCenter(room, face)[normal];
  return layout.openings.filter(o => faceAxes(o.face).normal === normal && Math.abs(o.center[normal] - plane) < EPS
    && o.center[u] > room.min[u] - EPS && o.center[u] < room.min[u] + room.size[u] + EPS
    && o.center[v] > room.min[v] - EPS && o.center[v] < room.min[v] + room.size[v] + EPS);
}

interface Rect { u0: number; u1: number; v0: number; v1: number }

interface Bounds3 { min: Vec3; max: Vec3 }

function boundsFromCenter(center: Vec3, size: Vec3, rotation = 0): Bounds3 {
  const quarterTurn = Math.abs(Math.sin(rotation)) > 0.707;
  const sx = quarterTurn ? size.z : size.x;
  const sz = quarterTurn ? size.x : size.z;
  return {
    min: { x: center.x - sx / 2, y: center.y - size.y / 2, z: center.z - sz / 2 },
    max: { x: center.x + sx / 2, y: center.y + size.y / 2, z: center.z + sz / 2 },
  };
}

function boundsOverlap(a: Bounds3, b: Bounds3, clearance = 0): boolean {
  return (['x', 'y', 'z'] as Axis[]).every(axis => a.min[axis] < b.max[axis] + clearance - EPS && a.max[axis] > b.min[axis] - clearance + EPS);
}

function insideRoom(bounds: Bounds3, room: Room, inset = 0.08): boolean {
  return (['x', 'y', 'z'] as Axis[]).every(axis => bounds.min[axis] >= room.min[axis] + inset - EPS && bounds.max[axis] <= room.min[axis] + room.size[axis] - inset + EPS);
}

function openingBounds(opening: Opening, depth = 0.7): Bounds3 {
  const { normal, u, v } = faceAxes(opening.face);
  const size: Vec3 = { x: depth, y: depth, z: depth };
  size[u] = opening.width + FRAME_MARGIN * 2;
  size[v] = opening.height + FRAME_MARGIN * 2;
  size[normal] = depth;
  return boundsFromCenter(opening.center, size);
}

function mountedWorldSize(face: Face, localSize: Vec3): Vec3 {
  const { normal } = faceAxes(face);
  if (normal === 'x') return { x: localSize.y, y: localSize.x, z: localSize.z };
  if (normal === 'z') return { x: localSize.x, y: localSize.z, z: localSize.y };
  return { ...localSize };
}

function interiorCandidateValid(layout: ShipLayout, room: Room, center: Vec3, size: Vec3, rotation = 0, wallFace?: Face, ignoreId?: string): boolean {
  const bounds = boundsFromCenter(center, size, rotation);
  if (!wallFace && !insideRoom(bounds, room)) return false;
  if (layout.openings.some(opening => (opening.roomId === room.id || opening.otherRoomId === room.id) && boundsOverlap(bounds, openingBounds(opening)))) return false;
  const occupied = [...layout.furniture.filter(item => item.roomId === room.id), ...layout.interior.filter(item => item.roomId === room.id)];
  return !occupied.some(item => item.id !== ignoreId && boundsOverlap(bounds, boundsFromCenter(item.center, item.size, 'rotation' in item ? item.rotation : 0), 0.12));
}

function subtractRect(rects: Rect[], block: Rect): Rect[] {
  return rects.flatMap(r => {
    if (block.u1 <= r.u0 || block.u0 >= r.u1 || block.v1 <= r.v0 || block.v0 >= r.v1) return [r];
    const u0 = Math.max(r.u0, block.u0), u1 = Math.min(r.u1, block.u1);
    const v0 = Math.max(r.v0, block.v0), v1 = Math.min(r.v1, block.v1);
    const parts: Rect[] = [];
    if (u0 > r.u0) parts.push({ u0: r.u0, u1: u0, v0: r.v0, v1: r.v1 });
    if (u1 < r.u1) parts.push({ u0: u1, u1: r.u1, v0: r.v0, v1: r.v1 });
    if (v0 > r.v0) parts.push({ u0, u1, v0: r.v0, v1: v0 });
    if (v1 < r.v1) parts.push({ u0, u1, v0: v1, v1: r.v1 });
    return parts;
  });
}

export function placeOpening(layout: ShipLayout, roomId: string, face: Face, type: OpeningType, width = 1.8, height = 1.25, neighborId?: string): Opening | null {
  const room = layout.rooms.find(r => r.id === roomId);
  if (!room) return null;
  const { u, v, normal } = faceAxes(face);
  const neighbor = neighborId ? layout.rooms.find(r => r.id === neighborId) : undefined;
  const horizontal = normal === 'y';
  const requestedWidth = type === 'door' ? 1.15 : type === 'airlock' ? 1.55 : width;
  const requestedHeight = horizontal ? (type === 'window' ? height : 1.55) : type === 'door' ? 2.35 : type === 'airlock' ? 2.4 : height;
  const u0 = Math.max(room.min[u], neighbor?.min[u] ?? -Infinity);
  const u1 = Math.min(room.min[u] + room.size[u], neighbor ? neighbor.min[u] + neighbor.size[u] : Infinity);
  const v0 = Math.max(room.min[v], neighbor?.min[v] ?? -Infinity);
  const v1 = Math.min(room.min[v] + room.size[v], neighbor ? neighbor.min[v] + neighbor.size[v] : Infinity);
  const wallMargin = OPENING_EDGE_CLEARANCE;
  const w = Math.min(requestedWidth, u1 - u0 - wallMargin * 2);
  const h = Math.min(requestedHeight, v1 - v0 - wallMargin * 2);
  if (w < 0.65 || h < 0.65) return null;
  const sill = !horizontal && type !== 'window' ? wallMargin : wallMargin;
  let regions: Rect[] = [{ u0: u0 + w / 2 + wallMargin, u1: u1 - w / 2 - wallMargin, v0: v0 + h / 2 + sill, v1: !horizontal && type !== 'window' ? v0 + h / 2 + sill : v1 - h / 2 - wallMargin }];
  if (regions[0].u1 < regions[0].u0 || regions[0].v1 < regions[0].v0) return null;
  for (const existing of openingsOnFace(layout, room, face)) {
    regions = subtractRect(regions, {
      u0: existing.center[u] - (existing.width + w) / 2 - FRAME_MARGIN,
      u1: existing.center[u] + (existing.width + w) / 2 + FRAME_MARGIN,
      v0: existing.center[v] - (existing.height + h) / 2 - FRAME_MARGIN,
      v1: existing.center[v] + (existing.height + h) / 2 + FRAME_MARGIN,
    });
  }
  const plane = faceCenter(room, face)[normal];
  const blockers = [
    ...layout.furniture.filter(item => item.roomId === room.id).map(item => boundsFromCenter(item.center, item.size)),
    ...layout.interior.filter(item => item.roomId === room.id).map(item => boundsFromCenter(item.center, item.size, item.rotation)),
    ...layout.exterior.filter(item => item.roomId === room.id).map(item => boundsFromCenter(item.center, mountedWorldSize(item.face, item.size))),
  ];
  for (const bounds of blockers) {
    if (plane < bounds.min[normal] - FRAME_MARGIN || plane > bounds.max[normal] + FRAME_MARGIN) continue;
    regions = subtractRect(regions, {
      u0: bounds.min[u] - w / 2 - FRAME_MARGIN,
      u1: bounds.max[u] + w / 2 + FRAME_MARGIN,
      v0: bounds.min[v] - h / 2 - FRAME_MARGIN,
      v1: bounds.max[v] + h / 2 + FRAME_MARGIN,
    });
  }
  if (!regions.length) return null;
  const preferred = regions.sort((a, b) => (b.u1 - a.u0) * (b.v1 - b.v0) - (a.u1 - a.u0) * (a.v1 - a.v0))[0];
  const center = faceCenter(room, face);
  center[u] = (preferred.u0 + preferred.u1) / 2;
  center[v] = !horizontal && type !== 'window' ? preferred.v0 : (preferred.v0 + preferred.v1) / 2;
  const opening: Opening = { id: `O-${String(layout.nextId++).padStart(3, '0')}`, roomId, otherRoomId: neighborId, face, type, center, width: w, height: h, opened: false };
  layout.openings.push(opening);
  return opening;
}

function hashId(id: string) {
  let value = 0;
  for (let i = 0; i < id.length; i++) value = (value * 33 + id.charCodeAt(i)) >>> 0;
  return value;
}

function mix(a: string, b: string, ratio: number) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * ratio), g = Math.round(ag + (bg - ag) * ratio), bch = Math.round(ab + (bb - ab) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bch.toString(16).padStart(2, '0')}`;
}

export function derivePalette(room: Room, seed: number): RoomPalette {
  const rng = random(((seed >>> 0) ^ hashId(room.id)) >>> 0 || 1);
  const wallPalette = ['#3d5a4c', '#4a4853', '#5b4537', '#43586b', '#53424a', '#586349', '#3e5045', '#4d574d', '#423d4c', '#4a5a64'];
  const accentPalette = ['#c4df98', '#dbb888', '#b8c8b0', '#cdb29a', '#a8c5b6', '#c5d4e2', '#d2b6a0', '#cce0b4'];
  const wall = wallPalette[Math.floor(rng() * wallPalette.length)];
  return {
    wall,
    corner: mix(wall, '#15180f', 0.55),
    trim: mix(wall, '#aebba0', 0.32),
    accent: accentPalette[Math.floor(rng() * accentPalette.length)],
    dark: mix(wall, '#0c0e07', 0.7),
    highlight: mix(wall, '#f1f4d9', 0.45),
  };
}

function assignRoomTypes(layout: ShipLayout) {
  const rng = random(((layout.seed * 131 + 7) >>> 0) || 1);
  const choices: RoomType[] = ['quarters', 'cargo', 'engineering', 'corridor', 'medical', 'quarters', 'reactor'];
  for (let i = 0; i < layout.rooms.length; i++) {
    const room = layout.rooms[i];
    const center = roomCenter(room);
    if (room.size.x > 4.5 && Math.abs(center.x) < 1.6 && room.size.z > 4.5) room.type = 'cargo';
    else room.type = choices[Math.floor(rng() * choices.length)];
    room.name = ROOM_NAMES[room.type];
    room.palette = derivePalette(room, layout.seed);
  }
}

interface RuleStats { doors: number; windows: number; airlocks: number }

export function applyRules(input: ShipLayout, config: RuleConfig, only?: RuleKey): ShipLayout {
  const layout = cloneLayout(input);
  const active = (key: RuleKey) => config.enabled[key] && (!only || only === key);
  const rng = random(layout.seed * 257 + 17);
  const stats: RuleStats = { doors: 0, windows: 0, airlocks: 0 };

  if (active('bridge')) {
    const bridge = [...layout.rooms].sort((a, b) => a.min.z - b.min.z || b.size.x - a.size.x)[0];
    for (const room of layout.rooms) {
      if (room.id !== bridge?.id && room.type === 'bridge') { room.type = 'quarters'; room.name = ROOM_NAMES.quarters; }
    }
    if (bridge) { bridge.type = 'bridge'; bridge.name = 'Bridge'; }
  }

  for (const room of layout.rooms) {
    for (const face of FACES) {
      const existing = openingsOnFace(layout, room, face);
      const neighbors = faceNeighbors(layout, room, face);
      if (!only && neighbors.length) {
        for (const neighbor of neighbors) {
          if (room.id > neighbor.id) continue;
          if (!layout.openings.some(o => (o.roomId === room.id && o.otherRoomId === neighbor.id) || (o.roomId === neighbor.id && o.otherRoomId === room.id))) {
            const created = placeOpening(layout, room.id, face, faceAxes(face).normal === 'y' ? 'airlock' : 'door', 1.15, 2.35, neighbor.id);
            if (created) stats.doors++;
          }
        }
      }
      if (active('windows') && !neighbors.length && config.faces.includes(face) && !existing.some(o => o.type === 'window') && faceAxes(face).normal !== 'y') {
        const roomWindows = layout.openings.filter(o => o.roomId === room.id && o.type === 'window').length;
        const max = room.type === 'bridge' ? 2 : 1;
        if (roomWindows < max) {
          const width = config.windowMinWidth + rng() * (config.windowMaxWidth - config.windowMinWidth);
          const height = config.windowMinHeight + rng() * (config.windowMaxHeight - config.windowMinHeight);
          const created = placeOpening(layout, room.id, face, 'window', width, height);
          if (created) stats.windows++;
        }
      }
    }
    if (active('airlocks') && layout.openings.filter(o => o.type === 'airlock').length < 3 && room.size.x > 3) {
      const face: Face = layout.openings.some(o => o.type === 'airlock') ? 'floor' : 'ceiling';
      if (!faceNeighbors(layout, room, face).length && !openingsOnFace(layout, room, face).some(o => o.type === 'airlock')) {
        const created = placeOpening(layout, room.id, face, 'airlock');
        if (created) stats.airlocks++;
      }
    }
  }

  if (active('furniture') || active('populate')) {
    populateInterior(layout, config, rng, only);
  }
  if (active('external')) {
    populateExterior(layout, config, rng);
  }

  addEvent(layout, {
    type: 'rules', label: only ? `${only.charAt(0).toUpperCase() + only.slice(1)} rule` : 'Rules applied',
    detail: `${stats.windows} windows / ${stats.doors} doors / ${stats.airlocks} airlocks / single pass`,
    undoable: false,
  });
  return layout;
}

function populateInterior(layout: ShipLayout, config: RuleConfig, rng: () => number, only: RuleKey | undefined) {
  const furniture = layout.furniture;
  for (const room of layout.rooms) {
    if (room.type === 'corridor') continue;
    const existing = furniture.filter(f => f.roomId === room.id);
    if (!existing.length && (config.enabled.furniture || only === 'furniture')) {
      furniture.push(...primaryFurnishings(layout, room));
    }
    if (config.enabled.populate || only === 'populate') {
      layout.interior.push(...recursiveInterior(layout, room, rng, only, config));
    }
  }
}

function primaryFurnishings(layout: ShipLayout, room: Room): Furnishing[] {
  const items: Furnishing[] = [];
  const type: FurnishingType = room.type === 'bridge' ? 'console'
    : room.type === 'quarters' || room.type === 'medical' ? 'bed'
    : room.type === 'reactor' ? 'reactor'
    : room.type === 'engineering' ? 'desk'
    : room.type === 'cargo' ? 'crate'
    : 'table';
  if (room.type === 'corridor') return items;
  const size: Vec3 = type === 'desk' ? { x: 1.6, y: 0.78, z: 0.8 }
    : type === 'bed' ? { x: 1.05, y: 0.5, z: 2.0 }
    : type === 'reactor' ? { x: 0.9, y: 1.3, z: 0.9 }
    : type === 'crate' ? { x: 0.8, y: 0.9, z: 0.8 }
    : type === 'console' ? { x: 1.8, y: 0.85, z: 0.7 }
    : { x: 1.2, y: 0.74, z: 0.8 };
  const center: Vec3 = { ...roomCenter(room) };
  center.y = room.min.y + size.y / 2;
  center.z = Math.max(room.min.z + size.z / 2 + 0.1, Math.min(room.min.z + room.size.z - size.z / 2 - 0.1, center.z));
  center.x = Math.max(room.min.x + size.x / 2 + 0.1, Math.min(room.min.x + room.size.x - size.x / 2 - 0.1, center.x));
  if (interiorCandidateValid(layout, room, center, size)) items.push({ id: `F-${layout.nextId++}`, roomId: room.id, type, center, size });
  return items;
}

function recursiveInterior(layout: ShipLayout, room: Room, rng: () => number, only: RuleKey | undefined, config: RuleConfig): InteriorObject[] {
  const objects: InteriorObject[] = [];
  const placed: InteriorObject[] = [];
  const add = (kind: InteriorObjectKind, center: Vec3, size: Vec3, parentId?: string, rotation = 0, wallFace?: Face) => {
    const placedCenter = { ...center };
    if (wallFace) {
      const { normal, sign } = faceAxes(wallFace);
      const worldSize = boundsFromCenter({ x: 0, y: 0, z: 0 }, size, rotation);
      const depth = worldSize.max[normal] - worldSize.min[normal];
      placedCenter[normal] -= sign * (depth / 2 + 0.015);
    }
    if (!interiorCandidateValid({ ...layout, interior: [...layout.interior, ...placed] }, room, placedCenter, size, rotation, wallFace, parentId)) return null;
    const object: InteriorObject = { id: `I-${layout.nextId++}`, roomId: room.id, kind, parentId, center: placedCenter, size, rotation, seed: layout.seed };
    objects.push(object);
    placed.push(object);
    return object;
  };
  if ((only === undefined && config.enabled.populate) || only === 'populate') {
    const wallFaces: Face[] = ['north', 'east', 'south', 'west'];
    for (const face of wallFaces) {
      const { u, v, normal, sign } = faceAxes(face);
      const openingCount = layout.openings.filter(o => o.roomId === room.id && o.face === face).length;
      const wallLength = room.size[u];
      const spacing = wallLength / 4;
      if (room.type === 'corridor') continue;
      for (let i = 0; i < 3; i++) {
        if (rng() > 0.45) continue;
        const cu = (i + 1) * spacing + (rng() - 0.5) * 0.4;
        if (cu < 0.35 || cu > wallLength - 0.35) continue;
        const cv = 0.9 + rng() * (room.size[v] - 1.4);
        const center = { x: 0, y: 0, z: 0 };
        center[u] = room.min[u] + cu;
        center[v] = room.min[v] + cv;
        center[normal] = room.min[normal] + (sign > 0 ? room.size[normal] : 0);
        const r = rng();
        if (room.type === 'quarters' && r < 0.5) {
          add('poster', center, { x: 0.6, y: 0.45, z: 0.04 }, undefined, faceRotation(face, rng), face);
        } else if (r < 0.6) {
          add('shelf', center, { x: 0.8, y: 0.18, z: 0.3 }, undefined, faceRotation(face, rng), face);
        } else if (r < 0.75) {
          add('panel', center, { x: 0.5, y: 0.5, z: 0.06 }, undefined, faceRotation(face, rng), face);
        } else if (r < 0.85) {
          add('pipe', center, { x: 0.12, y: 0.12, z: 0.12 }, undefined, faceRotation(face, rng), face);
        } else {
          add('cable', center, { x: 0.1, y: 0.4, z: 0.08 }, undefined, faceRotation(face, rng), face);
        }
        void openingCount;
      }
    }
    const floorArea = room.size.x * room.size.z;
    const itemTarget = Math.max(1, Math.floor(floorArea / 6));
    for (let i = 0; i < itemTarget; i++) {
      if (rng() > 0.6) continue;
      const x = room.min.x + 0.4 + rng() * (room.size.x - 0.8);
      const z = room.min.z + 0.4 + rng() * (room.size.z - 0.8);
      const center = { x, y: room.min.y + 0.4, z };
      const r = rng();
      if (r < 0.2) {
        const crate = add('crate', center, { x: 0.7, y: 0.7, z: 0.7 }, undefined, rng() * Math.PI * 2);
        if (crate && rng() < 0.4) add('crateOpen', { ...center, y: room.min.y + 0.85 }, { x: 0.55, y: 0.18, z: 0.55 }, crate.id);
      } else if (r < 0.35) {
        add('crate', center, { x: 0.6 + rng() * 0.3, y: 0.6 + rng() * 0.4, z: 0.6 + rng() * 0.3 });
      } else if (r < 0.5) {
        add('locker', center, { x: 0.55, y: 1.65, z: 0.45 }, undefined, rng() * Math.PI * 2);
      } else if (r < 0.6) {
        add('barrel', center, { x: 0.45, y: 0.9, z: 0.45 }, undefined, rng() * Math.PI * 2);
      } else if (r < 0.75) {
        const desk = add('desk', center, { x: 1.4, y: 0.75, z: 0.7 }, undefined, rng() * Math.PI * 2);
        const surface: Vec3 = { x: center.x, y: room.min.y + 0.8, z: center.z };
        const offset = (rng() - 0.5) * 0.6;
        if (desk && rng() < 0.4) add('chair', { x: surface.x + offset, y: room.min.y + 0.45, z: surface.z + 0.5 }, { x: 0.45, y: 0.6, z: 0.45 }, desk.id);
        if (desk && rng() < 0.35) add('panel', { x: surface.x + offset, y: room.min.y + 1.15, z: surface.z + 0.15 }, { x: 0.45, y: 0.35, z: 0.2 }, desk.id);
        if (desk && rng() < 0.3) add('crateOpen', { x: surface.x + offset, y: room.min.y + 0.95, z: surface.z + 0.15 }, { x: 0.4, y: 0.18, z: 0.3 }, desk.id);
        if (desk && rng() < 0.3) add('barrel', { x: surface.x + offset, y: room.min.y + 0.7, z: surface.z + 0.35 }, { x: 0.35, y: 0.55, z: 0.35 }, desk.id);
        if (desk && rng() < 0.25) add('pipe', { x: surface.x + offset, y: room.min.y + 1.05, z: surface.z + 0.25 }, { x: 0.1, y: 0.1, z: 0.18 }, desk.id);
      } else if (r < 0.85) {
        add('tank', center, { x: 0.7, y: 1.05, z: 0.7 }, undefined, rng() * Math.PI * 2);
      } else {
        add('cable', { x: center.x, y: room.min.y + 0.06, z: center.z }, { x: 0.06, y: 0.06, z: 1 + rng() });
      }
    }
    if (room.type === 'engineering' || room.type === 'reactor') {
      for (let i = 0; i < 2; i++) if (rng() < 0.6) {
        const x = room.min.x + 0.6 + rng() * (room.size.x - 1.2);
        const z = room.min.z + 0.6 + rng() * (room.size.z - 1.2);
        add('pipe', { x, y: room.min.y + 1.4 + i * 0.4, z }, { x: 0.18, y: 0.18, z: 0.18 }, undefined, 0);
      }
    }
  }
  void placed;
  return objects;
}

function faceRotation(face: Face, rng: () => number): number {
  switch (face) {
    case 'north': return 0;
    case 'south': return Math.PI;
    case 'east': return -Math.PI / 2;
    case 'west': return Math.PI / 2;
    case 'ceiling': return rng() * Math.PI * 2;
    case 'floor': return rng() * Math.PI * 2;
  }
}

function populateExterior(layout: ShipLayout, config: RuleConfig, rng: () => number) {
  const density = layout.iteration > 0 ? 1.6 : 1;
  const targets: Record<ExteriorObjectKind, number> = {
    turret: 4, thruster: 4, antenna: 2, landingGear: 6,
    sensorPod: 5, cargoHook: 4, dockingPort: 2, heatSink: 4, lifeSupport: 3,
  };
  for (const kind of config.mounts) {
    const target = Math.round(targets[kind] * density);
    let placed = 0;
    for (const room of layout.rooms) {
      const face: Face = kind === 'landingGear' ? 'floor'
        : kind === 'thruster' ? 'south'
        : kind === 'dockingPort' ? 'east'
        : (kind === 'lifeSupport' ? 'east' : 'ceiling');
      const plane = faceCenter(room, face);
      const hasOpening = layout.openings.some(o => o.roomId === room.id && o.face === face && faceAxes(o.face).normal === faceAxes(face).normal);
      const hasNeighbor = faceNeighbors(layout, room, face).length > 0;
      if (hasOpening || hasNeighbor) continue;
      if (layout.exterior.some(o => o.roomId === room.id && o.kind === kind)) continue;
      const slots = kind === 'antenna' || kind === 'dockingPort' ? 1
        : kind === 'turret' || kind === 'lifeSupport' ? Math.max(1, Math.floor(room.size.x / 2.5))
        : Math.max(1, Math.floor((room.size.x * room.size.z) / 8));
      for (let s = 0; s < slots && placed < target; s++) {
        if (rng() < 0.45) continue;
        const size = exteriorSize(kind);
        const center: Vec3 = { ...plane };
        if (face === 'floor' || face === 'ceiling') {
          center.x = room.min.x + 0.5 + rng() * (room.size.x - 1);
          center.z = room.min.z + 0.5 + rng() * (room.size.z - 1);
        } else {
          const axis: Axis = (face as string) === 'east' || (face as string) === 'west' ? 'z' : 'x';
          center[axis] = room.min[axis] + 0.5 + rng() * (room.size[axis] - 1);
        }
        const { normal, u, v, sign } = faceAxes(face);
        center[normal] += sign * size.y / 2;
        const candidate: ExteriorObject = { id: `X-${layout.nextId}`, roomId: room.id, kind, face, center, size, rotation: rng() * Math.PI * 2, seed: layout.seed };
        const worldSize = mountedWorldSize(face, size);
        const candidateBounds = boundsFromCenter(center, worldSize);
        if (candidateBounds.min[u] < room.min[u] + FRAME_MARGIN || candidateBounds.max[u] > room.min[u] + room.size[u] - FRAME_MARGIN || candidateBounds.min[v] < room.min[v] + FRAME_MARGIN || candidateBounds.max[v] > room.min[v] + room.size[v] - FRAME_MARGIN) continue;
        if (layout.openings.some(opening => boundsOverlap(candidateBounds, openingBounds(opening, 1.2)))) continue;
        if (layout.exterior.some(other => boundsOverlap(candidateBounds, boundsFromCenter(other.center, mountedWorldSize(other.face, other.size)), 0.15))) continue;
        layout.nextId++;
        layout.exterior.push(candidate);
        placed++;
      }
    }
  }
}

function exteriorSize(kind: ExteriorObjectKind): Vec3 {
  switch (kind) {
    case 'turret': return { x: 0.9, y: 1.05, z: 2.2 };
    case 'antenna': return { x: 0.65, y: 2.4, z: 0.65 };
    case 'thruster': return { x: 1.35, y: 1.8, z: 1.35 };
    case 'landingGear': return { x: 0.9, y: 2.1, z: 0.75 };
    case 'dockingPort': return { x: 1.15, y: 0.45, z: 1.15 };
    case 'heatSink': return { x: 1.2, y: 0.35, z: 0.8 };
    case 'cargoHook': return { x: 0.5, y: 1.25, z: 0.5 };
    case 'sensorPod': return { x: 0.65, y: 0.85, z: 0.65 };
    case 'lifeSupport': return { x: 0.65, y: 0.75, z: 0.55 };
    default: return { x: 0.8, y: 0.9, z: 0.8 };
  }
}

export function createLayout(params: GeneratorParams = DEFAULT_PARAMS, rules: RuleConfig = DEFAULT_RULES): ShipLayout {
  const scale = Math.max(1, params.minSize / 2.4);
  const height = params.enableY ? Math.max(3.6, params.minSize, 14 * scale / Math.max(1, params.maxAspect - 1)) : Math.max(3.2, params.minSize);
  const layout: ShipLayout = {
    rooms: [{ id: 'R-001', name: 'Primary hull', type: 'cargo', min: { x: -7.5 * scale, y: 0, z: -8.5 * scale }, size: { x: 15 * scale, y: height, z: 17 * scale }, born: 0 }],
    openings: [], mounts: [], furniture: [], interior: [], exterior: [],
    seed: params.seed, iteration: 0, nextId: 2,
    log: [{ id: 0, type: 'seed', label: 'Initial hull', detail: `Seed ${params.seed}`, roomId: 'R-001', undoable: false }],
  };
  const rng = random(((params.seed * 1664525 + 1013904223) >>> 0) || 1);
  const jitter = () => (rng() - 0.5) * 0.16;
  const rear = splitRoom(layout, 'R-001', 'z', params, 0.3 + jitter());
  const frontRight = splitRoom(layout, 'R-001', 'x', params, 0.267 + jitter());
  const farRight = frontRight && splitRoom(layout, frontRight, 'x', params, 0.635 + jitter());
  const rearMiddle = rear && splitRoom(layout, rear, 'x', params, 1 / 3 + jitter());
  const rearRight = rearMiddle && splitRoom(layout, rearMiddle, 'x', params, 0.5 + jitter());
  const rearChildren = [rear, rearMiddle, rearRight].map(id => id ? splitRoom(layout, id, 'z', params, 0.5 + jitter()) : null);
  if (rear) extrudeRoom(layout, rear, 'west', params, 3.5 * scale);
  if (rearRight) extrudeRoom(layout, rearRight, 'east', params, 3.5 * scale);
  extrudeRoom(layout, 'R-001', 'north', params, 2.8 * scale);
  if (frontRight) extrudeRoom(layout, frontRight, 'north', params, 4.3 * scale);
  if (rearChildren[1]) extrudeRoom(layout, rearChildren[1], 'south', params, 3.4 * scale);
  if (rearChildren[2]) {
    const extra = extrudeRoom(layout, rearChildren[2], 'south', params, 3.4 * scale);
    if (extra) splitRoom(layout, extra, 'x', params, 0.5);
  }
  if (farRight && params.maxRooms > 24) extrudeRoom(layout, farRight, 'north', params, 3.3 * scale);
  if (params.enableY) {
    const stackCandidates = layout.rooms.filter(room => room.size.x > 4.5 && room.size.z > 4.5 && room.size.y > 3.8 && layout.rooms.length < params.maxRooms);
    stackCandidates.sort((a, b) => b.size.x * b.size.z - a.size.x * a.size.z);
    const stack = stackCandidates[0];
    if (stack && layout.rooms.length < params.maxRooms - 1) {
      const upper = splitRoom(layout, stack.id, 'y', params, 0.55 + (rng() - 0.5) * 0.12);
      if (upper) {
        const upperRoom = layout.rooms.find(r => r.id === upper);
        if (upperRoom && layout.rooms.length < params.maxRooms) extrudeRoom(layout, upper, 'north', params, 2.1 * scale);
      }
      const newStack = layout.rooms.find(r => r.id === stack.id);
      if (newStack && newStack.size.y > 4.4 && layout.rooms.length < params.maxRooms) splitRoom(layout, newStack.id, 'y', params, 0.45 + (rng() - 0.5) * 0.1);
    }
  }
  assignRoomTypes(layout);
  return applyRules(layout, rules);
}

export function growLayout(input: ShipLayout, params: GeneratorParams, rules: RuleConfig, preferred?: 'split' | 'extrude'): { layout: ShipLayout; message: string; changed: boolean } {
  if (input.rooms.length >= params.maxRooms) return { layout: input, message: `Target reached: ${params.maxRooms} rooms. Increase the room limit to keep growing.`, changed: false };
  if (validateLayout(input, params).length) return { layout: input, message: 'The size constraints have changed. Generate a fresh layout before growing.', changed: false };
  const layout = cloneLayout(input);
  const rng = random((layout.seed * 1013904223 + layout.iteration * 1664525 + 7) >>> 0 || 1);
  const axes: Axis[] = params.enableY ? ['x', 'z', 'y'] : ['x', 'z'];
  const splitOptions = layout.rooms.flatMap(room => axes.filter(axis => getSplitRanges(layout, room, axis, params).length).map(axis => ({ room, axis })));
  const extrusionOptions = layout.rooms.flatMap(room => FACES.filter(face => getExtrusionRange(layout, room, face, params)).map(face => ({ room, face })));
  if (preferred === 'split' && !splitOptions.length) return { layout: input, message: 'No safe splits remain. Switch to balanced growth to allow extrusions.', changed: false };
  if (preferred === 'extrude' && !extrusionOptions.length) return { layout: input, message: 'No safe extrusions remain. Switch to balanced growth to allow splits.', changed: false };
  if (!splitOptions.length && !extrusionOptions.length) return { layout: input, message: 'Growth complete. Every remaining range is protected by an opening or a size constraint.', changed: false };
  const shouldSplit = preferred ? preferred === 'split' : rng() < params.splitBias;
  let newId: string | null = null;
  let operation = 'split';
  if (splitOptions.length && (shouldSplit || !extrusionOptions.length)) {
    const option = splitOptions[Math.floor(rng() * splitOptions.length)];
    newId = splitRoom(layout, option.room.id, option.axis, params);
  } else if (extrusionOptions.length) {
    const option = extrusionOptions[Math.floor(rng() * extrusionOptions.length)];
    newId = extrudeRoom(layout, option.room.id, option.face, params);
    operation = 'extrusion';
  }
  if (!newId) return { layout: input, message: 'No safe range is available for this operation.', changed: false };
  const newRoom = layout.rooms.find(r => r.id === newId)!;
  if (newRoom.type === 'bridge') { newRoom.type = 'quarters'; newRoom.name = 'Crew quarters'; }
  newRoom.palette = derivePalette(newRoom, layout.seed);
  const result = applyRules(layout, rules);
  return { layout: result, message: `${newId} created by ${operation}. All openings preserved.`, changed: true };
}

export interface WallTiling {
  corners: Panel[];
  angles: Panel[];
  middles: Panel[];
  junctions: Panel[];
  openings: Opening[];
  width: number;
  height: number;
  face: Face;
  roomId: string;
}

export function tileWall(layout: ShipLayout, room: Room, face: Face, thickness: number): WallTiling {
  const { normal, u, v } = faceAxes(face);
  if (face === 'floor' || face === 'ceiling') {
    return tileFloorCeiling(layout, room, face, thickness);
  }
  const openings = openingsOnFace(layout, room, face);
  const width = room.size[u];
  const height = room.size[v];
  const baseCenter = faceCenter(room, face);
  const panel = (cu: number, cv: number, su: number, sv: number, st = thickness): Panel => {
    const center: Vec3 = { ...baseCenter };
    center[u] = room.min[u] + cu;
    center[v] = room.min[v] + cv;
    const size: Vec3 = { x: thickness, y: thickness, z: thickness };
    size[u] = su; size[v] = sv; size[normal] = st;
    return { center, size, roomId: room.id, face };
  };
  const corners: Panel[] = [];
  const angles: Panel[] = [];
  const middles: Panel[] = [];
  const junctions: Panel[] = [];
  let regions: Rect[] = [{ u0: 0, u1: width, v0: 0, v1: height }];
  for (const opening of openings) {
    const clearance = FRAME_THICKNESS * 1.5;
    regions = subtractRect(regions, { u0: opening.center[u] - room.min[u] - opening.width / 2 - clearance, u1: opening.center[u] - room.min[u] + opening.width / 2 + clearance, v0: opening.center[v] - room.min[v] - opening.height / 2 - clearance, v1: opening.center[v] - room.min[v] + opening.height / 2 + clearance });
  }
  for (const neighbor of partialFaceNeighbors(layout, room, face)) {
    if (room.id < neighbor.id) continue;
    regions = subtractRect(regions, {
      u0: Math.max(0, neighbor.min[u] - room.min[u]),
      u1: Math.min(width, neighbor.min[u] + neighbor.size[u] - room.min[u]),
      v0: Math.max(0, neighbor.min[v] - room.min[v]),
      v1: Math.min(height, neighbor.min[v] + neighbor.size[v] - room.min[v]),
    });
  }
  for (const region of regions) {
    if (region.u1 - region.u0 < 0.18 || region.v1 - region.v0 < 0.18) continue;
    middles.push(panel(
      (region.u0 + region.u1) / 2,
      (region.v0 + region.v1) / 2,
      region.u1 - region.u0,
      region.v1 - region.v0,
      thickness,
    ));
  }
  const isFloorLike = (face as Face) === 'floor';
  for (const neighbor of partialFaceNeighbors(layout, room, face)) {
    if (neighbor.min[u] > room.min[u] + EPS || neighbor.min[u] + neighbor.size[u] < room.min[u] + room.size[u] - EPS) {
      const u0 = Math.max(room.min[u], neighbor.min[u]);
      const u1 = Math.min(room.min[u] + room.size[u], neighbor.min[u] + neighbor.size[u]);
      if (u1 - u0 < 0.3) continue;
      const center = faceCenter(room, face);
      center[u] = (u0 + u1) / 2;
      center[v] = isFloorLike ? room.min[v] + 0.18 : room.min[v] + height - 0.18;
      junctions.push({ center, size: { x: thickness * 1.4, y: thickness * 1.4, z: thickness * 1.4 }, roomId: room.id, face });
    } else if (neighbor.min[v] > room.min[v] + EPS || neighbor.min[v] + neighbor.size[v] < room.min[v] + room.size[v] - EPS) {
      const v0 = Math.max(room.min[v], neighbor.min[v]);
      const v1 = Math.min(room.min[v] + room.size[v], neighbor.min[v] + neighbor.size[v]);
      if (v1 - v0 < 0.3) continue;
      const center = faceCenter(room, face);
      center[v] = (v0 + v1) / 2;
      center[u] = isFloorLike ? room.min[u] + 0.18 : room.min[u] + width - 0.18;
      junctions.push({ center, size: { x: thickness * 1.4, y: thickness * 1.4, z: thickness * 1.4 }, roomId: room.id, face });
    }
  }
  return { corners, angles, middles, junctions, openings, width, height, face, roomId: room.id };
}

function tileFloorCeiling(layout: ShipLayout, room: Room, face: Face, thickness: number): WallTiling {
  const { normal, u, v } = faceAxes(face);
  const width = room.size[u];
  const height = room.size[v];
  const corner = Math.min(CORNER_SIZE * 1.4, width / 2, height / 2);
  const angle = Math.min(ANGLE_SIZE * 1.4, (width - corner * 2) / 2, (height - corner * 2) / 2);
  const baseCenter = faceCenter(room, face);
  const panel = (cu: number, cv: number, su: number, sv: number, st = thickness * 0.4): Panel => {
    const center: Vec3 = { ...baseCenter };
    center[u] = room.min[u] + cu;
    center[v] = room.min[v] + cv;
    const size: Vec3 = { x: thickness, y: thickness, z: thickness };
    size[u] = su; size[v] = sv; size[normal] = st;
    return { center, size, roomId: room.id, face };
  };
  const corners: Panel[] = [];
  const angles: Panel[] = [];
  const middles: Panel[] = [];
  const junctions: Panel[] = [];
  const cornerDepth = thickness * 0.6;
  corners.push(panel(corner / 2, corner / 2, corner, corner, cornerDepth));
  corners.push(panel(width - corner / 2, corner / 2, corner, corner, cornerDepth));
  corners.push(panel(corner / 2, height - corner / 2, corner, corner, cornerDepth));
  corners.push(panel(width - corner / 2, height - corner / 2, corner, corner, cornerDepth));
  const angleDepth = thickness * 0.45;
  angles.push(panel(width / 2, angle / 2, Math.max(0.001, width - corner * 2), angle, angleDepth));
  angles.push(panel(width / 2, height - angle / 2, Math.max(0.001, width - corner * 2), angle, angleDepth));
  angles.push(panel(angle / 2, height / 2, angle, Math.max(0.001, height - corner * 2), angleDepth));
  angles.push(panel(width - angle / 2, height / 2, angle, Math.max(0.001, height - corner * 2), angleDepth));
  const regions: Rect[] = [{ u0: corner + angle, u1: width - corner - angle, v0: corner + angle, v1: height - corner - angle }];
  const tileSize = WALL_TILE * 1.1;
  for (const region of regions) {
    if (region.u1 - region.u0 < 0.18 || region.v1 - region.v0 < 0.18) continue;
    const cols = Math.max(1, Math.round((region.u1 - region.u0) / tileSize));
    const rows = Math.max(1, Math.round((region.v1 - region.v0) / tileSize));
    const stepU = (region.u1 - region.u0) / cols;
    const stepV = (region.v1 - region.v0) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) middles.push(panel(region.u0 + stepU * (i + 0.5), region.v0 + stepV * (j + 0.5), stepU, stepV));
  }
  for (const neighbor of partialFaceNeighbors(layout, room, face)) {
    if (neighbor.min[u] > room.min[u] + EPS || neighbor.min[u] + neighbor.size[u] < room.min[u] + room.size[u] - EPS) {
      const u0 = Math.max(room.min[u], neighbor.min[u]);
      const u1 = Math.min(room.min[u] + room.size[u], neighbor.min[u] + neighbor.size[u]);
      if (u1 - u0 < 0.3) continue;
      const center = faceCenter(room, face);
      center[u] = (u0 + u1) / 2;
      center[v] = room.min[v] + corner;
      junctions.push({ center, size: { x: thickness * 0.6, y: thickness * 0.6, z: thickness * 0.6 }, roomId: room.id, face });
    }
  }
  return { corners, angles, middles, junctions, openings: [], width, height, face, roomId: room.id };
}

export function wallPanels(layout: ShipLayout, room: Room, face: Face, thickness: number): Panel[] {
  return tileWall(layout, room, face, thickness).middles;
}

export function getLayoutStats(layout: ShipLayout) {
  const panels = layout.rooms.reduce((sum, room) => sum + FACES.reduce((n, face) => n + wallPanels(layout, room, face, 0.12).length, 0), 0);
  return {
    rooms: layout.rooms.length,
    openings: layout.openings.length,
    panels,
    floorArea: layout.rooms.reduce((sum, room) => sum + room.size.x * room.size.z, 0),
    mounts: layout.mounts.length,
    furniture: layout.furniture.length,
    interior: layout.interior.length,
    exterior: layout.exterior.length,
  };
}

export function validateLayout(layout: ShipLayout, params: GeneratorParams): string[] {
  const errors: string[] = [];
  const axes: Axis[] = params.enableY ? ['x', 'y', 'z'] : ['x', 'z'];
  for (const room of layout.rooms) {
    const sizes = axes.map(a => room.size[a]);
    if (Math.min(...sizes) < params.minSize - EPS) errors.push(`${room.id}: below minimum room size`);
    if (Math.max(...sizes) / Math.min(...sizes) > params.maxAspect + EPS) errors.push(`${room.id}: aspect ratio exceeded`);
  }
  for (let i = 0; i < layout.rooms.length; i++) {
    for (let j = i + 1; j < layout.rooms.length; j++) {
      const a = layout.rooms[i], b = layout.rooms[j];
      if ((['x', 'y', 'z'] as Axis[]).every(axis => intervalOverlap(a.min[axis], a.min[axis] + a.size[axis], b.min[axis], b.min[axis] + b.size[axis]))) errors.push(`${a.id} overlaps ${b.id}`);
    }
  }
  for (const opening of layout.openings) {
    for (const id of [opening.roomId, opening.otherRoomId].filter(Boolean)) {
      const room = layout.rooms.find(r => r.id === id);
      if (!room) { errors.push(`${opening.id}: missing parent`); continue; }
      const { normal, u, v } = faceAxes(opening.face);
      if (Math.abs(opening.center[normal] - room.min[normal]) > EPS && Math.abs(opening.center[normal] - room.min[normal] - room.size[normal]) > EPS) errors.push(`${opening.id}: detached from parent face`);
      if (opening.center[u] - opening.width / 2 < room.min[u] - EPS || opening.center[u] + opening.width / 2 > room.min[u] + room.size[u] + EPS || opening.center[v] - opening.height / 2 < room.min[v] - EPS || opening.center[v] + opening.height / 2 > room.min[v] + room.size[v] + EPS) errors.push(`${opening.id}: outside parent bounds`);
      if (opening.center[u] - opening.width / 2 < room.min[u] + OPENING_EDGE_CLEARANCE - EPS || opening.center[u] + opening.width / 2 > room.min[u] + room.size[u] - OPENING_EDGE_CLEARANCE + EPS || opening.center[v] - opening.height / 2 < room.min[v] + OPENING_EDGE_CLEARANCE - EPS || opening.center[v] + opening.height / 2 > room.min[v] + room.size[v] - OPENING_EDGE_CLEARANCE + EPS) errors.push(`${opening.id}: violates structural edge clearance`);
    }
  }
  for (const object of layout.interior) {
    const room = layout.rooms.find(r => r.id === object.roomId);
    if (!room) errors.push(`${object.id}: missing parent`);
  }
  const interiorItems = [
    ...layout.furniture.map(item => ({ ...item, rotation: 0, parentId: undefined as string | undefined })),
    ...layout.interior,
  ];
  for (let i = 0; i < interiorItems.length; i++) for (let j = i + 1; j < interiorItems.length; j++) {
    const a = interiorItems[i], b = interiorItems[j];
    if (a.roomId !== b.roomId || a.parentId === b.id || b.parentId === a.id) continue;
    if (boundsOverlap(boundsFromCenter(a.center, a.size, a.rotation), boundsFromCenter(b.center, b.size, b.rotation))) errors.push(`${a.id} overlaps ${b.id}`);
  }
  for (let i = 0; i < layout.exterior.length; i++) {
    const object = layout.exterior[i];
    const room = layout.rooms.find(r => r.id === object.roomId);
    if (!room) { errors.push(`${object.id}: missing parent`); continue; }
    const { normal, sign } = faceAxes(object.face);
    const expected = faceCenter(room, object.face)[normal] + sign * object.size.y / 2;
    if (Math.abs(object.center[normal] - expected) > EPS) errors.push(`${object.id}: detached from mounting face`);
    for (let j = i + 1; j < layout.exterior.length; j++) {
      if (boundsOverlap(boundsFromCenter(object.center, mountedWorldSize(object.face, object.size)), boundsFromCenter(layout.exterior[j].center, mountedWorldSize(layout.exterior[j].face, layout.exterior[j].size)))) errors.push(`${object.id} overlaps ${layout.exterior[j].id}`);
    }
  }
  return [...new Set(errors)];
}

export function layoutBounds(layout: ShipLayout) {
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const room of layout.rooms) {
    for (const axis of ['x', 'y', 'z'] as Axis[]) {
      min[axis] = Math.min(min[axis], room.min[axis]);
      max[axis] = Math.max(max[axis], room.min[axis] + room.size[axis]);
    }
  }
  return { min, max, center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 } };
}

export function toggleDoor(layout: ShipLayout, openingId: string): ShipLayout {
  const layoutCopy = cloneLayout(layout);
  const opening = layoutCopy.openings.find(opening => opening.id === openingId);
  if (opening && opening.type === 'door') opening.opened = !opening.opened;
  return layoutCopy;
}
