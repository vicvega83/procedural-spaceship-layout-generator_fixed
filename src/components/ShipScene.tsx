import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, Html, Line, OrbitControls } from '@react-three/drei';
import { MOUSE, OrthographicCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { FACES, ROOM_COLORS, faceAxes, layoutBounds, roomCenter, type Room, type ShipLayout } from '../lib/ship';
import { ExteriorVisual, InteriorVisual, OpeningVisual, RoomVisual, type MeshOptions } from './MeshSystem';

export type CameraView = 'isometric' | 'top' | 'front' | 'right';
export type EditorTool = 'select' | 'orbit' | 'pan' | 'measure';
export type RenderMode = 'gizmos' | 'solid' | 'wireframe';
export interface SceneOptions extends MeshOptions {}

interface ShipSceneProps {
  layout: ShipLayout;
  selectedId: string | null;
  selectedOpeningId?: string | null;
  onSelect: (id: string | null) => void;
  onToggleDoor: (openingId: string) => void;
  options: SceneOptions;
  view: CameraView;
  tool: EditorTool;
  zoom: number;
  resetToken: number;
  onReady: (group: import('three').Group | null) => void;
}

interface RoomDimensionsProps { room: Room }
function Dimensions({ room }: RoomDimensionsProps) {
  const { min, size } = room;
  const y = min.y + 0.12;
  const z = min.z - 0.6;
  const x = min.x - 0.6;
  const color = '#bddf92';
  return <group>
    <Line points={[[min.x, y, z], [min.x + size.x, y, z]]} color={color} lineWidth={0.8} />
    <Line points={[[min.x, y, z - 0.15], [min.x, y, z + 0.15]]} color={color} lineWidth={0.8} />
    <Line points={[[min.x + size.x, y, z - 0.15], [min.x + size.x, y, z + 0.15]]} color={color} lineWidth={0.8} />
    <Line points={[[x, y, min.z], [x, y, min.z + size.z]]} color={color} lineWidth={0.8} />
    <Line points={[[x - 0.15, y, min.z], [x + 0.15, y, min.z]]} color={color} lineWidth={0.8} />
    <Line points={[[x - 0.15, y, min.z + size.z], [x + 0.15, y, min.z + size.z]]} color={color} lineWidth={0.8} />
    <Html center position={[min.x + size.x / 2, y + 0.05, z - 0.15]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}><span className="dimension-label">{size.x.toFixed(2)} m</span></Html>
    <Html center position={[x - 0.15, y + 0.05, min.z + size.z / 2]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}><span className="dimension-label">{size.z.toFixed(2)} m</span></Html>
  </group>;
}

function CameraController({ layout, view, zoom, resetToken, controls, moving }: {
  layout: ShipLayout; view: CameraView; zoom: number; resetToken: number; controls: RefObject<OrbitControlsImpl | null>; moving: RefObject<boolean>;
}) {
  const { camera, size } = useThree();
  const target = useRef(new Vector3());
  const position = useRef(new Vector3(34, 30, 38));
  const initialized = useRef(false);
  const bounds = useMemo(() => layoutBounds(layout), [layout]);
  useEffect(() => {
    const c = bounds.center;
    target.current.set(c.x, 0.8 + c.y * 0.3, c.z);
    const offset = view === 'top' ? [0, 55, 0.001] : view === 'front' ? [0, 8, 55] : view === 'right' ? [55, 8, 0] : [34, 31, 38];
    position.current.set(c.x + offset[0], target.current.y + offset[1], c.z + offset[2]);
    moving.current = true;
    if (!initialized.current) {
      camera.position.copy(position.current);
      camera.lookAt(target.current);
      controls.current?.target.copy(target.current);
      initialized.current = true;
    }
  }, [view, resetToken, bounds, camera, controls, moving]);
  useEffect(() => {
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const height = bounds.max.y - bounds.min.y;
    const projectedWidth = view === 'top' || view === 'front' ? width : view === 'right' ? depth : (width + depth) * 0.72;
    const projectedHeight = view === 'top' ? depth : view === 'isometric' ? (width + depth) * 0.39 + height : Math.max(height + 4, 16);
    const ortho = camera as OrthographicCamera;
    ortho.zoom = Math.min(size.width / (projectedWidth + 5), size.height / (projectedHeight + 6)) * (zoom / 100);
    ortho.updateProjectionMatrix();
  }, [size.width, size.height, zoom, view, bounds, camera]);
  useFrame((_, delta) => {
    if (!moving.current || !controls.current) return;
    const factor = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1 - Math.exp(-delta * 7);
    camera.position.lerp(position.current, factor);
    controls.current.target.lerp(target.current, factor);
    controls.current.update();
    if (camera.position.distanceTo(position.current) < 0.015) moving.current = false;
  });
  return null;
}

function SceneContents(props: ShipSceneProps) {
  const { layout, selectedId, selectedOpeningId, options, tool, onSelect, onToggleDoor, onReady } = props;
  const root = useRef<import('three').Group>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const moving = useRef(true);
  const selected = layout.rooms.find(room => room.id === selectedId);
  useEffect(() => { onReady(root.current); return () => onReady(null); }, [onReady]);
  const onSelectCallback = useCallback((id: string) => onSelect(id), [onSelect]);
  const onToggleDoorCallback = useCallback((id: string) => onToggleDoor(id), [onToggleDoor]);
  return <>
    <ambientLight intensity={1.6} />
    <directionalLight position={[10, 20, 8]} intensity={2} color="#e4f0df" />
    <directionalLight position={[-10, 8, -14]} intensity={0.8} color="#8caeb3" />
    {options.showGrid && <Grid position={[0, -1.15, 0]} args={[100, 100]} cellSize={1} cellThickness={0.45} cellColor="#25302b" sectionSize={5} sectionThickness={0.65} sectionColor="#364039" fadeDistance={65} fadeStrength={1.9} infiniteGrid />}
    <group ref={root} name="ORBITAL_Procedural_Ship">
      {layout.rooms.map((room, index) => <RoomVisual key={`${layout.seed}-${room.id}`} room={room} layout={layout} selected={selectedId === room.id} options={options} index={index} onSelect={onSelectCallback} />)}
      {layout.interior.map(item => <InteriorVisual key={item.id} item={item} visible={options.showFurniture && options.showInterior} />)}
      {layout.exterior.map(item => <ExteriorVisual key={item.id} item={item} visible={options.showMounts && options.showExterior} wire={options.mode === 'wireframe'} />)}
      {layout.openings.map(opening => <OpeningVisual key={opening.id} opening={opening} options={options} onToggle={onToggleDoorCallback} selected={opening.id === selectedOpeningId} />)}
    </group>
    {selected && (tool === 'measure' || selected.type === 'bridge') && <Dimensions room={selected} />}
    <OrbitControls ref={controls} makeDefault enableDamping enableZoom={false} dampingFactor={0.08} minZoom={5} maxZoom={70} maxPolarAngle={Math.PI / 2.02} mouseButtons={{ LEFT: tool === 'pan' ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} onStart={() => { moving.current = false; }} />
    <CameraController layout={layout} view={props.view} zoom={props.zoom} resetToken={props.resetToken} controls={controls} moving={moving} />
  </>;
}

function BlueprintFallback({ layout, selectedId, onSelect }: Pick<ShipSceneProps, 'layout' | 'selectedId' | 'onSelect'>) {
  const bounds = layoutBounds(layout);
  const project = (x: number, y: number, z: number) => [450 + (x - z) * 14, 295 + (x + z) * 7.5 - y * 19];
  const points = (vertices: number[][]) => vertices.map(vertex => project(vertex[0] - bounds.center.x, vertex[1], vertex[2] - bounds.center.z).join(',')).join(' ');
  const sorted = [...layout.rooms].sort((a, b) => a.min.x + a.min.z - b.min.x - b.min.z);
  return <svg className="blueprint-fallback" viewBox="0 0 900 620" role="img" aria-label="Interactive isometric spaceship layout">
    <defs><pattern id="iso-grid" width="56" height="30" patternUnits="userSpaceOnUse"><path d="M0 0L56 30M56 0L0 30" stroke="#29332c" strokeWidth="0.5" /></pattern><radialGradient id="grid-fade"><stop offset="0%" stopColor="white" /><stop offset="100%" stopColor="black" /></radialGradient><mask id="grid-mask"><rect width="900" height="620" fill="url(#grid-fade)" /></mask></defs>
    <rect width="900" height="620" fill="url(#iso-grid)" mask="url(#grid-mask)" />
    {sorted.map(room => {
      const { min: m, size: s } = room;
      const x = m.x + s.x, z = m.z + s.z, y = m.y + s.y;
      const color = selectedId === room.id ? '#c6ed8c' : ROOM_COLORS[room.type];
      const c = roomCenter(room);
      const label = project(c.x - bounds.center.x, m.y + 0.1, c.z - bounds.center.z);
      return <g key={room.id} onClick={() => onSelect(room.id)} style={{ cursor: 'pointer' }} stroke={color} strokeWidth={selectedId === room.id ? 1.3 : 0.7}>
        <polygon points={points([[m.x, m.y, m.z], [x, m.y, m.z], [x, m.y, z], [m.x, m.y, z]])} fill={color} fillOpacity={0.19} />
        <polygon points={points([[m.x, m.y, m.z], [x, m.y, m.z], [x, y, m.z], [m.x, y, m.z]])} fill={color} fillOpacity={0.09} />
        <polygon points={points([[m.x, m.y, m.z], [m.x, m.y, z], [m.x, y, z], [m.x, y, m.z]])} fill={color} fillOpacity={0.08} />
        <polygon points={points([[m.x, y, m.z], [x, y, m.z], [x, y, z], [m.x, y, z]])} fill="none" opacity={0.6} />
        <path d={`M${points([[x, m.y, z]])}L${points([[x, y, z]])}`} opacity={0.5} />
        <text x={label[0]} y={label[1]} fill={color} stroke="none" fontSize="8" textAnchor="middle" fontFamily="monospace" letterSpacing="1">{room.name.toUpperCase()}</text>
      </g>;
    })}
    {layout.openings.filter(o => o.face !== 'ceiling' && o.face !== 'floor').map(o => {
      const { u, v } = faceAxes(o.face);
      const vertices = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => { const c = { ...o.center }; c[u] += a * o.width / 2; c[v] += b * o.height / 2; return [c.x, c.y, c.z]; });
      return <polygon key={o.id} points={points(vertices)} fill="#669baa" fillOpacity={o.type === 'window' ? 0.2 : 0.04} stroke="#8abec9" strokeWidth="1.2" />;
    })}
  </svg>;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function ShipScene(props: ShipSceneProps) {
  const fallback = <BlueprintFallback layout={props.layout} selectedId={props.selectedId} onSelect={props.onSelect} />;
  return <SceneBoundary fallback={fallback}>
    <Canvas orthographic dpr={[1, 1.5]} camera={{ position: [34, 31, 38], zoom: 19, near: 0.1, far: 250 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} fallback={fallback} onPointerMissed={() => props.onSelect(null)}>
      <Suspense fallback={null}><SceneContents {...props} /></Suspense>
    </Canvas>
  </SceneBoundary>;
}

void FACES;
