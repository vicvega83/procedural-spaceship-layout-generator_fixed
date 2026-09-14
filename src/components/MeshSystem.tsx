import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { BoxGeometry, BufferGeometry, EdgesGeometry, Group } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  AIRLOCK_RING_THICKNESS, DOOR_PANEL_THICKNESS, FRAME_DEPTH, FRAME_THICKNESS, WINDOW_GLASS_TINT,
  type ExteriorObject, type Face, type InteriorObject, type Opening, type Panel, type Room, type ShipLayout,
  faceAxes, tileWall,
} from '../lib/ship';

export interface MeshOptions {
  mode: 'gizmos' | 'solid' | 'wireframe';
  cutaway: boolean;
  showGrid: boolean;
  showLabels: boolean;
  showInterior: boolean;
  showExterior: boolean;
  showCorners: boolean;
  showAngles: boolean;
  showPanels: boolean;
  showJunctions: boolean;
  showFrames: boolean;
  showGlass: boolean;
  showDoors: boolean;
  showAirlocks: boolean;
  showSubdivisions: boolean;
  showFurniture: boolean;
  showMounts: boolean;
  thickness: number;
}

export interface RoomMeshBundle {
  walls: { corners: BufferGeometry[]; angles: BufferGeometry[]; middles: BufferGeometry[]; junctions: BufferGeometry[]; floor: BufferGeometry; ceiling: BufferGeometry; outline: BufferGeometry };
  interior: BufferGeometry;
  exterior: BufferGeometry;
  hullEdges: BufferGeometry;
}

export function buildRoomMeshes(layout: ShipLayout, room: Room, options: MeshOptions): RoomMeshBundle {
  const sideFaces: Face[] = ['north', 'east', 'south', 'west'];
  const corners: BufferGeometry[] = [];
  const angles: BufferGeometry[] = [];
  const middles: BufferGeometry[] = [];
  const junctions: BufferGeometry[] = [];
  for (const face of sideFaces) {
    const tiling = tileWall(layout, room, face, options.thickness);
    if (options.showCorners) for (const panel of tiling.corners) corners.push(panelToGeometry(panel));
    if (options.showAngles) for (const panel of tiling.angles) angles.push(panelToGeometry(panel));
    if (options.showPanels) for (const panel of tiling.middles) middles.push(panelToGeometry(panel));
    if (options.showJunctions) for (const panel of tiling.junctions) junctions.push(panelToGeometry(panel));
  }
  const floorTile = tileWall(layout, room, 'floor', options.thickness);
  const ceilingTile = tileWall(layout, room, 'ceiling', options.thickness);
  const floor = mergeSafe(floorTile.middles.map(panelToGeometry));
  const ceiling = mergeSafe(ceilingTile.middles.map(panelToGeometry));
  if (options.showJunctions) {
    for (const panel of floorTile.junctions) junctions.push(panelToGeometry(panel));
    for (const panel of ceilingTile.junctions) junctions.push(panelToGeometry(panel));
  }
  const outline = outlineGeometry(room, options.thickness);
  return {
    walls: { corners, angles, middles, junctions, floor, ceiling, outline },
    interior: new BufferGeometry(), exterior: new BufferGeometry(), hullEdges: new BufferGeometry(),
  };
}

function panelToGeometry(panel: Panel): BufferGeometry {
  const geometry = new BoxGeometry(panel.size.x, panel.size.y, panel.size.z);
  geometry.translate(panel.center.x, panel.center.y, panel.center.z);
  return geometry;
}

function outlineGeometry(room: Room, thickness: number): BufferGeometry {
  const x = thickness * 0.65;
  const pieces: BufferGeometry[] = [];
  const cx = room.min.x + room.size.x / 2;
  const cy = room.min.y + room.size.y / 2;
  const cz = room.min.z + room.size.z / 2;
  const add = (sx: number, sy: number, sz: number, px: number, py: number, pz: number) => {
    const piece = new BoxGeometry(sx, sy, sz);
    piece.translate(px, py, pz);
    pieces.push(piece);
  };
  add(room.size.x, room.size.y, x, cx, cy, room.min.z);
  add(room.size.x, room.size.y, x, cx, cy, room.min.z + room.size.z);
  add(x, room.size.y, room.size.z, room.min.x, cy, cz);
  add(x, room.size.y, room.size.z, room.min.x + room.size.x, cy, cz);
  add(room.size.x, x, room.size.z, cx, room.min.y, cz);
  add(room.size.x, x, room.size.z, cx, room.min.y + room.size.y, cz);
  return mergeSafe(pieces);
}

function mergeSafe(pieces: BufferGeometry[]): BufferGeometry {
  if (!pieces.length) return new BufferGeometry();
  const merged = mergeGeometries(pieces);
  pieces.forEach(piece => piece.dispose());
  return merged ?? new BufferGeometry();
}

export function GeometryEdges({ geometry, color, opacity = 0.65 }: { geometry: BufferGeometry; color: string; opacity?: number }) {
  const edges = useMemo(() => (geometry.getAttribute('position') ? new EdgesGeometry(geometry, 20) : new BufferGeometry()), [geometry]);
  useEffect(() => () => edges.dispose(), [edges]);
  if (!edges.getAttribute('position')) return null;
  return <lineSegments geometry={edges}><lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} /></lineSegments>;
}

function mix(a: string, b: string, ratio: number) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * ratio), g = Math.round(ag + (bg - ag) * ratio), bch = Math.round(ab + (bb - ab) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bch.toString(16).padStart(2, '0')}`;
}

interface RoomVisualProps { room: Room; layout: ShipLayout; selected: boolean; options: MeshOptions; index: number; onSelect: (id: string) => void; }
export function RoomVisual({ room, layout, selected, options, index, onSelect }: RoomVisualProps) {
  const ref = useRef<Group>(null);
  const progress = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : -Math.min(index * 0.025, 0.35));
  const meshes = useMemo(() => buildRoomMeshes(layout, room, options), [layout, room, options]);
  useEffect(() => () => {
    [meshes.walls.floor, meshes.walls.ceiling, meshes.walls.outline, meshes.interior, meshes.exterior, meshes.hullEdges,
     ...meshes.walls.corners, ...meshes.walls.angles, ...meshes.walls.middles, ...meshes.walls.junctions].forEach(geometry => geometry.dispose());
  }, [meshes]);
  useFrame((_, delta) => {
    progress.current = Math.min(1, progress.current + delta * 2.2);
    if (ref.current) ref.current.scale.set(0.95, 0.05 + Math.max(0, progress.current) * 0.95, 0.95);
  });
  const select = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(room.id); };
  const solid = options.mode === 'solid';
  const wire = options.mode === 'wireframe';
  const wallColor = room.palette?.wall ?? '#3d5a4c';
  const cornerColor = room.palette?.corner ?? '#1d211b';
  const trimColor = room.palette?.trim ?? '#5e8a73';
  const junctionColor = room.palette?.accent ?? '#c4df98';
  const floorColor = room.palette?.dark ?? mix(wallColor, '#0c0e07', 0.7);
  const ceilingColor = mix(wallColor, '#0c0e07', 0.45);
  return (
    <group ref={ref}>
      {options.showInterior && <>
        <mesh geometry={meshes.walls.floor} onClick={select}>
          <meshStandardMaterial color={floorColor} transparent opacity={wire ? 0.06 : selected ? 0.55 : solid ? 0.85 : 0.55} roughness={0.85} metalness={0.05} depthWrite={!wire} />
        </mesh>
        {(options.showSubdivisions || wire) && <GeometryEdges geometry={meshes.walls.floor} color={floorColor} opacity={selected ? 0.9 : 0.45} />}
      </>}
      {options.showExterior && <>
        <mesh geometry={meshes.walls.ceiling} onClick={select}>
          <meshStandardMaterial color={ceilingColor} transparent opacity={wire ? 0.04 : solid ? 0.6 : 0.18} roughness={0.9} metalness={0.05} depthWrite={!wire} />
        </mesh>
        {(options.showSubdivisions || wire) && <GeometryEdges geometry={meshes.walls.ceiling} color={ceilingColor} opacity={0.45} />}
      </>}
      {options.showInterior && meshes.walls.corners.map((geometry, key) => <group key={key}>
        <mesh geometry={geometry}><meshStandardMaterial color={cornerColor} roughness={0.6} metalness={0.2} transparent opacity={wire ? 0.2 : 1} /></mesh>
        <GeometryEdges geometry={geometry} color={cornerColor} opacity={0.85} />
      </group>)}
      {options.showInterior && meshes.walls.angles.map((geometry, key) => <group key={`angle-${key}`}>
        <mesh geometry={geometry}><meshStandardMaterial color={trimColor} roughness={0.55} metalness={0.3} transparent opacity={wire ? 0.25 : 1} /></mesh>
        <GeometryEdges geometry={geometry} color={trimColor} opacity={0.7} />
      </group>)}
      {options.showInterior && meshes.walls.junctions.map((geometry, key) => <group key={`junction-${key}`}>
        <mesh geometry={geometry}><meshStandardMaterial color={junctionColor} roughness={0.45} metalness={0.4} transparent opacity={wire ? 0.25 : 1} /></mesh>
        <GeometryEdges geometry={geometry} color={junctionColor} opacity={0.85} />
      </group>)}
      {options.showInterior && meshes.walls.middles.map((geometry, key) => <group key={`middle-${key}`}>
        <mesh geometry={geometry}><meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.15} transparent opacity={wire ? 0.08 : selected ? 0.6 : solid ? 0.85 : 0.32} /></mesh>
        {(options.showSubdivisions || wire) && <GeometryEdges geometry={geometry} color={wallColor} opacity={selected ? 0.85 : solid ? 0.55 : 0.3} />}
      </group>)}
      <GeometryEdges geometry={meshes.walls.outline} color={trimColor} opacity={selected ? 0.95 : 0.5} />
    </group>
  );
}

interface OpeningVisualProps { opening: Opening; options: MeshOptions; onToggle?: (id: string) => void; selected?: boolean; }
export function OpeningVisual({ opening, options, onToggle, selected }: OpeningVisualProps) {
  const { normal, u, v } = faceAxes(opening.face);
  const { center, width, height } = opening;
  const frameColor = opening.type === 'airlock' ? '#7d6741' : opening.type === 'door' ? '#5e8a73' : '#83b9db';
  const panelColor = opening.type === 'door' ? '#84bfc2' : '#6db4d6';
  const isVisible = (opening.type === 'window' && options.showGlass) || (opening.type === 'door' && options.showDoors) || (opening.type === 'airlock' && options.showAirlocks);
  if (!isVisible) return null;
  const open = !!(opening.opened && opening.type === 'door');
  const handleClick = (event: ThreeEvent<MouseEvent>) => { if (opening.type === 'door' && onToggle) { event.stopPropagation(); onToggle(opening.id); } };
  return (
    <group onClick={handleClick}>
      {options.showFrames && <FrameMesh center={center} width={width} height={height} normal={normal} u={u} v={v} color={frameColor} wireframe={options.mode === 'wireframe'} />}
      {opening.type === 'window' && options.showGlass && options.mode !== 'wireframe' && (
        <WindowPane center={center} width={width} height={height} normal={normal} u={u} v={v} tint={WINDOW_GLASS_TINT} />
      )}
      {opening.type === 'door' && options.showDoors && <DoorPanel center={center} width={width} height={height} normal={normal} u={u} v={v} opened={open} panelColor={panelColor} wireframe={options.mode === 'wireframe'} selected={selected} />}
      {opening.type === 'airlock' && options.showAirlocks && options.mode !== 'wireframe' && <AirlockRing center={center} width={width} height={height} normal={normal} thickness={AIRLOCK_RING_THICKNESS} />}
    </group>
  );
}

function FrameMesh({ center, width, height, normal, u, v, color, wireframe }: { center: import('../lib/ship').Vec3; width: number; height: number; normal: import('../lib/ship').Axis; u: import('../lib/ship').Axis; v: import('../lib/ship').Axis; color: string; wireframe: boolean }) {
  const geometry = useMemo(() => {
    const parts: BufferGeometry[] = [];
    const rail = FRAME_THICKNESS;
    const depth = FRAME_DEPTH;
    const addRail = (cu: number, cv: number, su: number, sv: number) => {
      const size = { x: depth, y: depth, z: depth };
      size[u] = su; size[v] = sv; size[normal] = depth;
      const piece = new BoxGeometry(size.x, size.y, size.z);
      const offset = { x: 0, y: 0, z: 0 };
      offset[u] = cu; offset[v] = cv;
      piece.translate(center.x + offset.x, center.y + offset.y, center.z + offset.z);
      parts.push(piece);
    };
    addRail(0, height / 2, width + rail * 2, rail);
    addRail(0, -height / 2, width + rail * 2, rail);
    addRail(-width / 2, 0, rail, height);
    addRail(width / 2, 0, rail, height);
    return mergeSafe(parts);
  }, [center.x, center.y, center.z, width, height, u, v, normal]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={0.5} metalness={0.4} transparent opacity={wireframe ? 0.45 : 0.95} /></mesh>
    <GeometryEdges geometry={geometry} color={color} opacity={0.9} />
  </>;
}

function WindowPane({ center, width, height, normal, u, v, tint }: { center: import('../lib/ship').Vec3; width: number; height: number; normal: import('../lib/ship').Axis; u: import('../lib/ship').Axis; v: import('../lib/ship').Axis; tint: number }) {
  const size = { x: 0.04, y: 0.04, z: 0.04 };
  size[u] = width - 0.08; size[v] = height - 0.08; size[normal] = 0.04;
  return <mesh position={[center.x, center.y, center.z]}><boxGeometry args={[size.x, size.y, size.z]} /><meshBasicMaterial color="#6db4d6" transparent opacity={tint} depthWrite={false} toneMapped={false} /></mesh>;
}

function DoorPanel({ center, width, height, normal, u, v, opened, panelColor, wireframe, selected }: { center: import('../lib/ship').Vec3; width: number; height: number; normal: import('../lib/ship').Axis; u: import('../lib/ship').Axis; v: import('../lib/ship').Axis; opened: boolean; panelColor: string; wireframe: boolean; selected?: boolean }) {
  const groupRef = useRef<Group>(null);
  const size = { x: DOOR_PANEL_THICKNESS, y: DOOR_PANEL_THICKNESS, z: DOOR_PANEL_THICKNESS };
  size[u] = width - 0.08; size[v] = height - 0.08; size[normal] = DOOR_PANEL_THICKNESS;
  const edgesGeometry = useMemo(() => new BoxGeometry(size.x, size.y, size.z), [size.x, size.y, size.z]);
  useEffect(() => () => edgesGeometry.dispose(), [edgesGeometry]);
  const slideAxis: 'x' | 'y' | 'z' = u === 'x' ? 'x' : u === 'y' ? 'y' : 'z';
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const factor = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1 - Math.exp(-delta * 6);
    const target = opened ? -1 : 0;
    const current = groupRef.current.position[slideAxis];
    groupRef.current.position[slideAxis] = current + (target - current) * factor;
  });
  return <group ref={groupRef} position={[center.x, center.y, center.z]}>
    <mesh><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color={panelColor} roughness={0.5} metalness={0.4} transparent opacity={wireframe ? 0.45 : 0.95} /></mesh>
    <GeometryEdges geometry={edgesGeometry} color={selected ? '#b9df93' : panelColor} opacity={0.85} />
  </group>;
}

function AirlockRing({ center, width, height, normal, thickness }: { center: import('../lib/ship').Vec3; width: number; height: number; normal: import('../lib/ship').Axis; thickness: number }) {
  const radius = Math.min(width, height) * 0.5;
  return <group position={[center.x, center.y, center.z]} rotation={normal === 'x' ? [0, Math.PI / 2, 0] : normal === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
    <mesh><torusGeometry args={[radius, thickness, 8, 22]} /><meshStandardMaterial color="#d9a06c" roughness={0.6} metalness={0.5} /></mesh>
  </group>;
}

interface InteriorVisualProps { item: InteriorObject; visible: boolean; }
export function InteriorVisual({ item, visible }: InteriorVisualProps) {
  if (!visible) return null;
  const accent = '#c4df98';
  const trim = '#5e8a73';
  const dark = '#1d211b';
  return <group position={[item.center.x, item.center.y, item.center.z]} rotation={[0, item.rotation, 0]}>
    <InteriorMesh item={item} accent={accent} trim={trim} dark={dark} />
  </group>;
}

function InteriorMesh({ item, accent, trim, dark }: { item: InteriorObject; accent: string; trim: string; dark: string }) {
  const { kind, size } = item;
  if (kind === 'desk') return <>
    <mesh><boxGeometry args={[size.x, 0.04, size.z]} /><meshStandardMaterial color="#6e5840" /></mesh>
    <mesh position={[-size.x / 2 + 0.04, -size.y / 2 + size.y / 4, 0]}><boxGeometry args={[0.04, size.y, size.z - 0.06]} /><meshStandardMaterial color={dark} /></mesh>
    <mesh position={[size.x / 2 - 0.04, -size.y / 2 + size.y / 4, 0]}><boxGeometry args={[0.04, size.y, size.z - 0.06]} /><meshStandardMaterial color={dark} /></mesh>
  </>;
  if (kind === 'chair') return <>
    <mesh position={[0, -size.y / 2 + 0.3, 0]}><boxGeometry args={[size.x, 0.06, size.z]} /><meshStandardMaterial color={dark} /></mesh>
    <mesh position={[0, 0, -size.z / 2 + 0.04]}><boxGeometry args={[size.x, size.y, 0.04]} /><meshStandardMaterial color={trim} /></mesh>
  </>;
  if (kind === 'locker') return <>
    <mesh><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color="#46544b" /></mesh>
    <mesh position={[0, size.y / 4, size.z / 2 + 0.001]}><boxGeometry args={[size.x * 0.7, size.y * 0.3, 0.01]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} /></mesh>
    <mesh position={[0, 0.02, size.z / 2 + 0.005]}><boxGeometry args={[0.02, 0.18, 0.01]} /><meshStandardMaterial color={accent} /></mesh>
  </>;
  if (kind === 'shelf') return <>
    <mesh position={[0, -size.y / 2 + 0.04, 0]}><boxGeometry args={[size.x, 0.02, size.z]} /><meshStandardMaterial color="#5d4a3a" /></mesh>
    <mesh position={[0, size.y / 2 - 0.04, 0]}><boxGeometry args={[size.x, 0.02, size.z]} /><meshStandardMaterial color="#5d4a3a" /></mesh>
    <mesh position={[-size.x / 2 + 0.02, 0, 0]}><boxGeometry args={[0.02, size.y, size.z]} /><meshStandardMaterial color={dark} /></mesh>
    <mesh position={[size.x / 2 - 0.02, 0, 0]}><boxGeometry args={[0.02, size.y, size.z]} /><meshStandardMaterial color={dark} /></mesh>
    <mesh position={[0, 0, 0]}><boxGeometry args={[size.x - 0.04, 0.08, size.z - 0.04]} /><meshStandardMaterial color="#8a7256" /></mesh>
  </>;
  if (kind === 'panel') return <>
    <mesh><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color="#3c463d" /></mesh>
    <mesh position={[0, size.y / 4, size.z / 2 + 0.005]}><boxGeometry args={[size.x * 0.7, size.y * 0.4, 0.01]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} /></mesh>
  </>;
  if (kind === 'pipe') return <>
    <mesh><cylinderGeometry args={[size.x / 2, size.x / 2, size.y, 6]} /><meshStandardMaterial color="#7d8a72" metalness={0.7} roughness={0.4} /></mesh>
    <mesh position={[0, size.y / 2, 0]}><torusGeometry args={[size.x / 2, 0.04, 5, 8]} /><meshStandardMaterial color={trim} /></mesh>
  </>;
  if (kind === 'cable') return <mesh><cylinderGeometry args={[size.x / 2, size.x / 2, size.y, 4]} /><meshStandardMaterial color="#3a3025" /></mesh>;
  if (kind === 'tank') return <>
    <mesh><cylinderGeometry args={[size.x / 2, size.x / 2, size.y, 10]} /><meshStandardMaterial color="#54726a" metalness={0.6} roughness={0.4} /></mesh>
    <mesh position={[0, size.y / 2 + 0.03, 0]}><sphereGeometry args={[size.x / 2, 8, 6]} /><meshStandardMaterial color={trim} /></mesh>
  </>;
  if (kind === 'barrel') return <>
    <mesh><cylinderGeometry args={[size.x / 2, size.x / 2, size.y, 10]} /><meshStandardMaterial color="#7d6843" roughness={0.55} /></mesh>
    <mesh position={[0, size.y / 2, 0]}><torusGeometry args={[size.x / 2 + 0.02, 0.025, 5, 10]} /><meshStandardMaterial color={trim} /></mesh>
  </>;
  if (kind === 'crate') return <>
    <mesh><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color="#8a6f4d" /></mesh>
    <mesh position={[0, size.y / 2 + 0.001, 0]}><boxGeometry args={[size.x + 0.02, 0.04, size.z + 0.02]} /><meshStandardMaterial color={trim} /></mesh>
  </>;
  if (kind === 'crateOpen') return <>
    <mesh><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color="#6e5a3f" /></mesh>
    <mesh position={[0, 0, size.z / 2]}><boxGeometry args={[size.x * 0.7, size.y * 0.6, 0.02]} /><meshStandardMaterial color="#1b140d" /></mesh>
    <mesh position={[0, size.y * 0.4, 0]}><boxGeometry args={[size.x * 0.55, 0.02, size.z * 0.7]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.2} /></mesh>
  </>;
  if (kind === 'poster') return <>
    <mesh><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color={accent} /></mesh>
    <mesh position={[0, 0, size.z / 2 + 0.001]}><boxGeometry args={[size.x * 0.85, size.y * 0.7, 0.01]} /><meshStandardMaterial color={dark} /></mesh>
  </>;
  if (kind === 'console') return <>
    <mesh><boxGeometry args={[size.x, size.y, size.z]} /><meshStandardMaterial color="#5b6c5a" /></mesh>
    <mesh position={[0, size.y / 2 + 0.045, -0.1]}><boxGeometry args={[size.x * 0.86, 0.055, size.z * 0.65]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} /></mesh>
  </>;
  if (kind === 'table') return <>
    <mesh><boxGeometry args={[size.x, 0.05, size.z]} /><meshStandardMaterial color="#7c6c4d" /></mesh>
    <mesh position={[-size.x / 2 + 0.05, -size.y / 2, 0]}><boxGeometry args={[0.08, size.y, 0.08]} /><meshStandardMaterial color={dark} /></mesh>
    <mesh position={[size.x / 2 - 0.05, -size.y / 2, 0]}><boxGeometry args={[0.08, size.y, 0.08]} /><meshStandardMaterial color={dark} /></mesh>
  </>;
  return null;
}

interface ExteriorVisualProps { item: ExteriorObject; visible: boolean; wire: boolean; }
export function ExteriorVisual({ item, visible, wire }: ExteriorVisualProps) {
  if (!visible) return null;
  const { center, kind, size } = item;
  const mountRotation: [number, number, number] = item.face === 'floor' ? [0, 0, Math.PI]
    : item.face === 'east' ? [0, 0, -Math.PI / 2]
    : item.face === 'west' ? [0, 0, Math.PI / 2]
    : item.face === 'north' ? [-Math.PI / 2, 0, 0]
    : item.face === 'south' ? [Math.PI / 2, 0, 0]
    : [0, 0, 0];
  return <group position={[center.x, center.y, center.z]} rotation={mountRotation}>
    <group rotation={[0, item.rotation, 0]}>
    {kind === 'turret' && <>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.5, 0.65, 0.24, 8]} /><meshStandardMaterial color="#7b8a7b" metalness={0.7} roughness={0.4} /></mesh>
      <mesh position={[0, 0.46, 0]}><boxGeometry args={[0.65, 0.45, 0.85]} /><meshStandardMaterial color="#9d9f80" /></mesh>
      <mesh position={[-0.17, 0.5, -0.8]}><boxGeometry args={[0.1, 0.1, 1.2]} /><meshStandardMaterial color="#a5b3a1" /></mesh>
      <mesh position={[0.17, 0.5, -0.8]}><boxGeometry args={[0.1, 0.1, 1.2]} /><meshStandardMaterial color="#a5b3a1" /></mesh>
    </>}
    {kind === 'antenna' && <>
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.4, 0.3, 0.4]} /><meshStandardMaterial color="#829389" /></mesh>
      <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[0.025, 0.06, 2.2, 6]} /><meshStandardMaterial color="#acb4a1" /></mesh>
      <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.27, 0.025, 5, 12]} /><meshBasicMaterial color="#8c9f91" /></mesh>
      <mesh position={[0, 2.28, 0]}><sphereGeometry args={[0.065, 8, 8]} /><meshBasicMaterial color="#c5eb91" /></mesh>
    </>}
    {kind === 'thruster' && <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.46, 0]}><cylinderGeometry args={[0.68, 0.43, 1, 12, 1, true]} /><meshStandardMaterial color="#788f8a" metalness={0.8} roughness={0.4} side={2} /></mesh>
      <mesh position={[0, 0.85, 0]}><cylinderGeometry args={[0.51, 0.51, 0.07, 12]} /><meshBasicMaterial color="#91d1c5" transparent opacity={0.75} /></mesh>
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.65, 0.055, 5, 12]} /><meshStandardMaterial color="#c5ccae" /></mesh>
    </group>}
    {kind === 'landingGear' && <>
      <mesh position={[0, -0.48, 0]}><boxGeometry args={[0.18, 0.95, 0.18]} /><meshStandardMaterial color="#8c9b8c" /></mesh>
      <mesh position={[0.15, -0.75, 0]}><boxGeometry args={[0.13, 0.5, 0.13]} /><meshStandardMaterial color="#b2b6a0" /></mesh>
      <mesh position={[0, -1.02, 0]}><boxGeometry args={[0.8, 0.12, 0.65]} /><meshStandardMaterial color="#a2a990" /></mesh>
    </>}
    {kind === 'sensorPod' && <>
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.55, 0.4, 0.55]} /><meshStandardMaterial color="#6c7a72" metalness={0.5} /></mesh>
      <mesh position={[0, 0.5, 0]}><sphereGeometry args={[0.18, 8, 6]} /><meshBasicMaterial color="#bce897" /></mesh>
    </>}
    {kind === 'cargoHook' && <>
      <mesh position={[0, -0.05, 0]}><boxGeometry args={[0.4, 0.1, 0.4]} /><meshStandardMaterial color="#78857a" /></mesh>
      <mesh position={[0, -0.35, 0]}><cylinderGeometry args={[0.05, 0.05, 0.4, 6]} /><meshStandardMaterial color="#566560" /></mesh>
      <mesh position={[0, -0.6, 0]}><torusGeometry args={[0.18, 0.03, 5, 10]} /><meshStandardMaterial color="#566560" /></mesh>
    </>}
    {kind === 'dockingPort' && <>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 0.15, 18, 1, true]} /><meshStandardMaterial color="#8c9b8c" metalness={0.6} roughness={0.4} side={2} /></mesh>
      <mesh position={[0, 0, 0.06]}><cylinderGeometry args={[0.45, 0.45, 0.04, 18]} /><meshStandardMaterial color="#c5eb91" emissive="#c5eb91" emissiveIntensity={0.4} /></mesh>
    </>}
    {kind === 'heatSink' && <>
      {[0, 0.06, 0.12, 0.18, 0.24].map(offset => <mesh key={offset} position={[0, 0, 0.05 + offset]}><boxGeometry args={[size.x, size.y, 0.03]} /><meshStandardMaterial color="#7d8a8a" metalness={0.7} roughness={0.4} /></mesh>)}
    </>}
    {kind === 'lifeSupport' && <>
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.5, 0.5, 0.4]} /><meshStandardMaterial color="#9bb39b" /></mesh>
      <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.36, 0.04, 0.3]} /><meshStandardMaterial color="#c5eb91" emissive="#c5eb91" emissiveIntensity={0.5} /></mesh>
    </>}
    {wire && <mesh visible><boxGeometry args={[size.x, size.y, size.z]} /><meshBasicMaterial color="#b5d98e" wireframe /></mesh>}
    </group>
  </group>;
}
