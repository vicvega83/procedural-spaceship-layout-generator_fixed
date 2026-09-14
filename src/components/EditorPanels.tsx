import { useState } from 'react';
import {
  Navigation2, PanelsTopLeft, DoorOpen, Armchair, Boxes, Radar, Shuffle, Sparkles,
  Plus, Play, Pause, ArrowRight, ShieldCheck, SlidersHorizontal, ChevronDown, Box,
  LockKeyhole, X, Check, Info, Layers3, Cpu, ScanLine, ChevronsUpDown,
} from 'lucide-react';
import { IconButton, RangeField, SectionHeading, SelectField, Toggle, WallPreview } from './EditorUI';
import {
  DEFAULT_RULES, FACES, ROOM_NAMES, ROOM_TYPES, faceCenter, openingsOnFace, wallPanels,
  type Face, type GeneratorParams, type MountType, type Room, type RuleConfig, type RuleKey, type ShipLayout,
} from '../lib/ship';
import type { SceneOptions } from './ShipScene';

export const RULE_DEFINITIONS = [
  { key: 'bridge' as RuleKey, label: 'Bridge', icon: Navigation2, description: 'Designates the forward-most room as the command bridge.', detail: 'Forward-most room' },
  { key: 'windows' as RuleKey, label: 'Windows', icon: PanelsTopLeft, description: 'Places windows in exactly computed, unoccupied exterior face regions.', detail: 'Exterior faces' },
  { key: 'airlocks' as RuleKey, label: 'Airlocks', icon: DoorOpen, description: 'Adds a ceiling hatch and a floor airlock on exposed hull faces.', detail: 'Ceiling + floor' },
  { key: 'furniture' as RuleKey, label: 'Furnish rooms', icon: Armchair, description: 'Fits consoles, beds, tables, and reactors to the room role and bounds.', detail: 'Room-aware placement' },
  { key: 'populate' as RuleKey, label: 'Populate items', icon: Boxes, description: 'Populates compartments with correctly scaled cargo and supplies.', detail: 'Interior objects' },
  { key: 'external' as RuleKey, label: 'Hull mounts', icon: Radar, description: 'Attaches equipment to exposed faces. Mount footprints protect future growth.', detail: 'Exterior equipment' },
];

interface GeneratorPanelProps {
  params: GeneratorParams;
  setParams: (params: GeneratorParams) => void;
  rules: RuleConfig;
  setRules: (rules: RuleConfig) => void;
  running: boolean;
  onToggleRunning: () => void;
  onGenerate: () => void;
  onStep: () => void;
  onApplyRules: (key?: RuleKey) => void;
  onOpenRules: () => void;
  onShuffle: () => void;
}

export function GeneratorPanel({ params, setParams, rules, setRules, running, onToggleRunning, onGenerate, onStep, onApplyRules, onOpenRules, onShuffle }: GeneratorPanelProps) {
  const update = <K extends keyof GeneratorParams>(key: K, value: GeneratorParams[K]) => setParams({ ...params, [key]: value });
  return <>
    <div className="panel-title"><div><h2>Generator</h2><p>Structure from possibility.</p></div><span className="engine-tag">BSP</span></div>
    <div className="generator-fields">
      <label className="seed-field"><span className="field-label">Generation seed <span className="micro-label">DETERMINISTIC</span></span><span className="seed-input"><span className="hash-symbol">#</span><input aria-label="Generation seed" type="number" min="0" max="999999999" value={params.seed} onChange={event => update('seed', Math.max(0, Math.min(999999999, Number(event.target.value))))} /><IconButton label="Randomize seed" onClick={onShuffle}><Shuffle size={14} /></IconButton></span></label>
      <RangeField label="Room limit" value={params.maxRooms} min={8} max={48} onChange={value => update('maxRooms', value)} suffix="rooms" />
      <RangeField label="Minimum room size" value={params.minSize} min={2} max={5} step={0.1} display={params.minSize.toFixed(1)} suffix="m" onChange={value => update('minSize', value)} />
      <RangeField label="Maximum aspect ratio" value={params.maxAspect} min={1.5} max={5} step={0.1} display={params.maxAspect.toFixed(1)} suffix=": 1" onChange={value => update('maxAspect', value)} />
      <div className="setting-row vertical-setting"><span>Allow Y-axis growth <span className="axis-tag">Y</span></span><Toggle label="Allow vertical Y-axis growth" checked={params.enableY} onChange={value => update('enableY', value)} /></div>
      <div className="setting-row growth-mode"><span>Growth mode</span><SelectField aria-label="Growth strategy" value={params.splitBias} onChange={event => update('splitBias', Number(event.target.value))}><option value="0.65">Balanced</option><option value="0.35">Hull expansion</option><option value="1">Splits only</option><option value="0">Extrusions only</option></SelectField></div>
      <button className="button primary generate-button" onClick={onGenerate}><Sparkles size={15} /><span>Generate layout</span><kbd>R</kbd></button>
      <div className="generation-actions"><button className="button secondary" onClick={onStep} title="Grow one safe room"><Plus size={13} />Grow step</button><button className={`button secondary ${running ? 'running' : ''}`} onClick={onToggleRunning}>{running ? <Pause size={12} fill="currentColor" /> : <Play size={12} />}<span>{running ? 'Pause growth' : 'Auto-grow'}</span>{running && <span className="live-dot" />}</button></div>
      <div className="safe-note"><ShieldCheck size={12} /><span>Exact safe ranges. Zero retries.</span></div>
    </div>
    <div className="rule-stack">
      <SectionHeading aside={<button className="text-icon-button" onClick={onOpenRules} title="Configure goal rules"><span>{String(Object.values(rules.enabled).filter(Boolean).length).padStart(2, '0')}</span><SlidersHorizontal size={12} /></button>}>Goal rules</SectionHeading>
      <div className="compact-rules">{RULE_DEFINITIONS.map(rule => <div className={`compact-rule ${rules.enabled[rule.key] ? 'enabled' : ''}`} key={rule.key}><rule.icon size={15} strokeWidth={1.6} /><button className="rule-name" onClick={onOpenRules}>{rule.label}</button><Toggle small label={`Enable ${rule.label} rule`} checked={rules.enabled[rule.key]} onChange={value => setRules({ ...rules, enabled: { ...rules.enabled, [rule.key]: value } })} /></div>)}</div>
      <button className="button secondary apply-rules" onClick={() => onApplyRules()}><Play size={11} /><span>Apply rules</span><ArrowRight size={13} /></button>
    </div>
    <div className="sidebar-footnote"><span className="tiny-square" />FORWARD-ONLY BY DESIGN</div>
  </>;
}

export function RulesPanel({ rules, setRules, onApplyRules }: Pick<GeneratorPanelProps, 'rules' | 'setRules' | 'onApplyRules'>) {
  const [expanded, setExpanded] = useState<RuleKey | null>('windows');
  const toggleFace = (face: Face) => setRules({ ...rules, faces: rules.faces.includes(face) ? rules.faces.filter(f => f !== face) : [...rules.faces, face] });
  const toggleMount = (mount: MountType) => setRules({ ...rules, mounts: rules.mounts.includes(mount) ? rules.mounts.filter(m => m !== mount) : [...rules.mounts, mount] });
  return <>
    <div className="panel-title"><div><h2>Rule system</h2><p>Simple goals. Emergent detail.</p></div><Layers3 size={17} /></div>
    <p className="panel-intro">Goals run in a single pass. Existing openings and equipment stay protected.</p>
    <div className="expanded-rules">{RULE_DEFINITIONS.map(rule => <section className={`expanded-rule ${expanded === rule.key ? 'expanded' : ''}`} key={rule.key}>
      <div className="expanded-rule-heading"><button onClick={() => setExpanded(expanded === rule.key ? null : rule.key)}><rule.icon size={16} /><span>{rule.label}<small>{rule.detail}</small></span><ChevronDown size={12} /></button><Toggle label={`Enable ${rule.label}`} checked={rules.enabled[rule.key]} onChange={value => setRules({ ...rules, enabled: { ...rules.enabled, [rule.key]: value } })} /></div>
      {expanded === rule.key && <div className="rule-details"><p>{rule.description}</p>
        {rule.key === 'windows' && <><div className="two-fields"><label>Min width (m)<input type="number" min="0.6" max="3" step="0.05" value={rules.windowMinWidth} onChange={event => setRules({ ...rules, windowMinWidth: Math.max(0.6, Math.min(rules.windowMaxWidth - 0.1, Number(event.target.value))) })} /></label><label>Max width (m)<input type="number" min="0.8" max="3" step="0.05" value={rules.windowMaxWidth} onChange={event => setRules({ ...rules, windowMaxWidth: Math.max(rules.windowMinWidth + 0.1, Math.min(3, Number(event.target.value))) })} /></label></div>
<div className="two-fields"><label>Min height (m)<input type="number" min="0.6" max="2" step="0.05" value={rules.windowMinHeight} onChange={event => setRules({ ...rules, windowMinHeight: Math.max(0.6, Math.min(rules.windowMaxHeight - 0.1, Number(event.target.value))) })} /></label><label>Max height (m)<input type="number" min="0.8" max="2" step="0.05" value={rules.windowMaxHeight} onChange={event => setRules({ ...rules, windowMaxHeight: Math.max(rules.windowMinHeight + 0.1, Math.min(2, Number(event.target.value))) })} /></label></div><span className="micro-label">ELIGIBLE FACES</span><div className="face-filters">{(['north', 'east', 'south', 'west'] as Face[]).map(face => <button key={face} aria-pressed={rules.faces.includes(face)} className={rules.faces.includes(face) ? 'selected' : ''} onClick={() => toggleFace(face)}>{face.charAt(0).toUpperCase() + face.slice(1)}</button>)}</div></>}
        {rule.key === 'external' && <div className="mount-filters">{(['turret', 'thruster', 'antenna', 'landingGear'] as MountType[]).map(mount => <label key={mount}><input type="checkbox" checked={rules.mounts.includes(mount)} onChange={() => toggleMount(mount)} /><span>{mount === 'landingGear' ? 'Landing gear' : `${mount.charAt(0).toUpperCase() + mount.slice(1)}s`}</span></label>)}</div>}
        <button className="button secondary" disabled={!rules.enabled[rule.key]} onClick={() => onApplyRules(rule.key)}><Play size={11} />Run this rule<ArrowRight size={12} /></button>
      </div>}
    </section>)}</div>
    <button className="button primary full-width" onClick={() => onApplyRules()}><Play size={13} />Apply all enabled rules</button>
    <button className="quiet-button" onClick={() => setRules(JSON.parse(JSON.stringify(DEFAULT_RULES)))}>Restore default rules</button>
    <div className="info-note"><LockKeyhole size={15} /><p>Disabling a goal stops new placements. It never removes persistent openings.</p></div>
  </>;
}

export function GeometryPanel({ options, setOptions, onExport, onHelp }: { options: SceneOptions; setOptions: (options: SceneOptions) => void; onExport: () => void; onHelp: () => void }) {
  const update = <K extends keyof SceneOptions>(key: K, value: SceneOptions[K]) => setOptions({ ...options, [key]: value });
  return <>
    <div className="panel-title"><div><h2>Geometry</h2><p>From layout to actual form.</p></div><Box size={18} /></div>
    <div className="live-geometry"><span className="live-dot" /><span>PROCEDURAL MESH ACTIVE</span></div>
    <p className="panel-intro">Walls subdivide into fixed corners, angle rails, and stretchable middle tiles. Hull and interior meshes can be toggled independently.</p>
    <SectionHeading>Mesh settings</SectionHeading>
    <RangeField label="Wall thickness" value={options.thickness} min={0.04} max={0.4} step={0.01} display={options.thickness.toFixed(2)} suffix="m" onChange={value => update('thickness', value)} />
    <div className="setting-row"><span>Cutaway ceilings</span><Toggle label="Cutaway ceilings" checked={options.cutaway} onChange={value => update('cutaway', value)} /></div>
    <div className="setting-row"><span>Subdivision edges</span><Toggle label="Subdivision edges" checked={options.showSubdivisions} onChange={value => update('showSubdivisions', value)} /></div>
    <div className="panel-divider" />
    <SectionHeading>Walls</SectionHeading>
    <div className="setting-row"><span>Corner pieces</span><Toggle label="Corner pieces" checked={options.showCorners} onChange={value => update('showCorners', value)} /></div>
    <div className="setting-row"><span>Angle rails</span><Toggle label="Angle rails" checked={options.showAngles} onChange={value => update('showAngles', value)} /></div>
    <div className="setting-row"><span>Wall panels</span><Toggle label="Wall panels" checked={options.showPanels} onChange={value => update('showPanels', value)} /></div>
    <div className="panel-divider" />
    <SectionHeading>Openings</SectionHeading>
    <div className="setting-row"><span>Door & window frames</span><Toggle label="Door & window frames" checked={options.showFrames} onChange={value => update('showFrames', value)} /></div>
    <div className="setting-row"><span>Window glass</span><Toggle label="Window glass" checked={options.showGlass} onChange={value => update('showGlass', value)} /></div>
    <div className="setting-row"><span>Door panels</span><Toggle label="Door panels" checked={options.showDoors} onChange={value => update('showDoors', value)} /></div>
    <div className="setting-row"><span>Airlock rings</span><Toggle label="Airlock rings" checked={options.showAirlocks} onChange={value => update('showAirlocks', value)} /></div>
    <div className="panel-divider" />
    <SectionHeading>Surfaces</SectionHeading>
    <div className="setting-row"><span><Armchair size={14} />Interior meshes</span><Toggle label="Show interior meshes" checked={options.showInterior} onChange={value => update('showInterior', value)} /></div>
    <div className="setting-row"><span><Radar size={14} />Exterior hull meshes</span><Toggle label="Show exterior hull meshes" checked={options.showExterior} onChange={value => update('showExterior', value)} /></div>
    <div className="setting-row"><span><Boxes size={14} />Interior furniture</span><Toggle label="Show interior furniture" checked={options.showFurniture} onChange={value => update('showFurniture', value)} /></div>
    <div className="setting-row"><span><Radar size={14} />Hull equipment</span><Toggle label="Show hull equipment" checked={options.showMounts} onChange={value => update('showMounts', value)} /></div>
    <div className="mesh-output"><Box size={22} /><div><strong>{(options.showCorners ? 4 * 4 : 0) + (options.showAngles ? 4 : 0)}</strong><span>corner / angle pieces active</span></div></div>
    <button className="button primary full-width" onClick={onExport}><Box size={14} />Export visible geometry</button>
    <button className="quiet-button" onClick={onHelp}><Info size={12} />How subdivision works</button>
    <div className="info-note"><Cpu size={15} /><p>Corners and angle rails stay the same size. The center block stretches to fit each wall. Every room has its own randomized palette.</p></div>
  </>;
}

interface InspectorProps {
  layout: ShipLayout;
  selectedRoom: Room | undefined;
  onSelect: (id: string | null) => void;
  options: SceneOptions;
  setOptions: (options: SceneOptions) => void;
  face: Face;
  setFace: (face: Face) => void;
  onAddOpening: () => void;
  onEditRoom: (roomId: string, patch: Partial<Room>) => void;
  onHelp: () => void;
  errors: string[];
}

export function Inspector({ layout, selectedRoom: room, onSelect, options, setOptions, face, setFace, onAddOpening, onEditRoom, onHelp, errors }: InspectorProps) {
  const [allOpenings, setAllOpenings] = useState(false);
  if (!room) return <>
    <div className="inspector-heading"><span>INSPECTOR</span><SlidersHorizontal size={14} /></div>
    <div className="empty-inspector"><ScanLine size={30} strokeWidth={1.1} /><h3>Your ship, room by room.</h3><p>Select a compartment in the viewport to inspect its dimensions, geometry, and openings.</p></div>
    <SectionHeading aside={<span className="micro-label">{layout.rooms.length}</span>}>Room directory</SectionHeading>
    <div className="room-directory">{layout.rooms.map(item => <button key={item.id} onClick={() => onSelect(item.id)}><Box size={13} /><span>{item.name}<small>{item.id}</small></span><ArrowRight size={12} /></button>)}</div>
  </>;
  const openings = layout.openings.filter(o => o.roomId === room.id || o.otherRoomId === room.id);
  const panels = FACES.reduce((sum, f) => sum + wallPanels(layout, room, f, options.thickness).length, 0);
  const selectedFaceOpenings = openingsOnFace(layout, room, face);
  const openingFace = (id: string) => FACES.find(f => openingsOnFace(layout, room, f).some(o => o.id === id)) ?? 'north';
  const p = faceCenter(room, 'floor');
  return <>
    <div className="inspector-heading"><span>INSPECTOR</span><IconButton label="Clear room selection" onClick={() => onSelect(null)}><X size={13} /></IconButton></div>
    <div className="room-heading"><span className="room-heading-icon"><Box size={22} strokeWidth={1.3} /></span><div><span className="micro-label">{room.id} <span className="tiny-inline-dot" /> ROOM CELL</span><input key={`${room.id}-${room.name}`} aria-label="Room name" defaultValue={room.name} maxLength={40} onBlur={event => { if (event.target.value.trim() && event.target.value !== room.name) onEditRoom(room.id, { name: event.target.value.trim() }); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></div><ChevronsUpDown size={14} className="muted" /></div>
    <SelectField label="Room role" aria-label="Room role" value={room.type} onChange={event => onEditRoom(room.id, { type: event.target.value as Room['type'], name: ROOM_NAMES[event.target.value as Room['type']] })}>{ROOM_TYPES.map(type => <option key={type} value={type}>{ROOM_NAMES[type]}</option>)}</SelectField>
    <div className="dimension-fields"><div className="field-label"><span>Dimensions</span><span className="micro-label">METERS</span></div><div className="vector-fields">{(['x', 'y', 'z'] as const).map((axis, index) => <label key={axis}><span>{['Width', 'Height', 'Depth'][index]}</span><div><i className={`axis-${axis}`}>{axis.toUpperCase()}</i><input aria-label={`Room ${['width', 'height', 'depth'][index]}`} readOnly value={room.size[axis].toFixed(2)} /></div></label>)}</div></div>
    <div className="position-fields"><span className="field-label">Position <LockKeyhole size={10} /></span><div>{(['x', 'y', 'z'] as const).map(axis => <span key={axis}><i className={`axis-${axis}`}>{axis.toUpperCase()}</i>{room.min[axis].toFixed(2)}</span>)}</div></div>
    <div className="panel-divider" />
    <SectionHeading aside={<span className="live-label"><span />LIVE</span>}>Geometry</SectionHeading>
    <div className="setting-row thickness-setting"><span>Wall thickness</span><label><input aria-label="Wall thickness in meters" type="number" value={options.thickness} min="0.04" max="0.4" step="0.01" onChange={event => setOptions({ ...options, thickness: Math.min(0.4, Math.max(0.04, Number(event.target.value))) })} /><span>m</span></label></div>
    <div className="setting-row"><span>Cutaway ceiling</span><Toggle label="Cutaway ceiling" checked={options.cutaway} onChange={value => setOptions({ ...options, cutaway: value })} /></div>
    <WallPreview layout={layout} room={room} face={face} onFaceChange={setFace} onHelp={onHelp} />
    <div className="panel-divider openings-divider" />
    <SectionHeading aside={<IconButton label="Add a persistent opening" onClick={onAddOpening}><Plus size={14} /></IconButton>}>Openings <span className="heading-count">{openings.length}</span></SectionHeading>
    <div className="opening-list">{(allOpenings ? openings : openings.slice(0, 3)).map(opening => {
      const f = openingFace(opening.id);
      const Icon = opening.type === 'window' ? PanelsTopLeft : DoorOpen;
      return <button className={`opening-row ${selectedFaceOpenings.includes(opening) ? 'on-face' : ''}`} key={opening.id} onClick={() => setFace(f)} title={`Inspect ${opening.id}. Persistent opening, protected from growth.`}><Icon size={15} className={opening.type === 'window' ? 'window-color' : 'door-color'} /><span>{opening.type.charAt(0).toUpperCase() + opening.type.slice(1)}<small>{f.toUpperCase()} / {opening.width.toFixed(1)} x {opening.height.toFixed(1)} m</small></span><LockKeyhole size={11} /></button>;
    })}{!openings.length && <button className="empty-openings" onClick={onAddOpening}><Plus size={13} />Add a door, window, or airlock</button>}{openings.length > 3 && <button className="show-more" onClick={() => setAllOpenings(!allOpenings)}>{allOpenings ? 'Show less' : `View ${openings.length - 3} more openings`}<ChevronDown size={11} /></button>}</div>
    <div className={`layout-health ${errors.length ? 'has-errors' : ''}`} title={errors.length ? errors.join('\n') : `${panels} room panels. Floor center: ${p.x.toFixed(2)}, ${p.z.toFixed(2)}.`}><ShieldCheck size={16} /><div><strong>{errors.length ? 'Settings need regeneration' : 'All constraints satisfied'}</strong><span>{errors.length ? 'Generate a layout with the new limits.' : 'No overlaps. Openings protected.'}</span></div>{!errors.length && <Check size={12} />}</div>
  </>;
}