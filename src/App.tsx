import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  LayoutGrid, Workflow, Box, BookOpen, Download, ChevronDown,
  Undo2, Redo2, Rocket, MousePointer2, Hand, Rotate3d, Ruler, Grid3X3, Eye,
  Focus, Minus, Plus, Keyboard, Play, Pause, SkipForward, ChevronsUp, ChevronsDown,
  Check, X, FileJson, ShieldCheck, LockKeyhole, ArrowUpRight, Settings2, PanelLeft,
  PanelRight, Layers3, CheckCheck, PanelsTopLeft, DoorOpen, GitBranch,
  CircleHelp, ArrowRight, MoveUpRight,
} from 'lucide-react';
import type { Group } from 'three';
import ShipScene, { type CameraView, type EditorTool, type RenderMode, type SceneOptions } from './components/ShipScene';
import { GeneratorPanel, GeometryPanel, Inspector, RulesPanel } from './components/EditorPanels';
import { IconButton, Modal, SelectField } from './components/EditorUI';
import {
  DEFAULT_PARAMS, DEFAULT_RULES, FACES, applyRules, cloneLayout, createLayout, faceNeighbors,
  getLayoutStats, growLayout, openingsOnFace, placeOpening, toggleDoor, validateLayout,
  type Face, type GeneratorParams, type OpeningType, type Room, type RuleConfig, type RuleKey, type ShipLayout,
} from './lib/ship';

type Tab = 'workspace' | 'rules' | 'geometry';
type Toast = { id: number; message: string; tone: 'success' | 'info' };
interface SavedWorkspace { layout: ShipLayout; params: GeneratorParams; rules: RuleConfig; name: string }
const STORAGE_KEY = 'orbital-shipyard-workspace-v3';
const DEFAULT_OPTIONS: SceneOptions = {
  mode: 'gizmos', cutaway: true, showGrid: true, showLabels: true,
  showInterior: true, showExterior: true,
  showCorners: true, showAngles: true, showPanels: true, showJunctions: true, showFrames: true,
  showGlass: true, showDoors: true, showAirlocks: true,
  showFurniture: true, showMounts: true,
  showSubdivisions: true, thickness: 0.12,
};

function loadWorkspace(): SavedWorkspace {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as SavedWorkspace;
      if (data.layout?.rooms?.length && data.params?.minSize && data.rules?.enabled) return data;
    }
  } catch { /* fresh workspace */ }
  const params = { ...DEFAULT_PARAMS };
  const rules = JSON.parse(JSON.stringify(DEFAULT_RULES)) as RuleConfig;
  return { layout: createLayout(params, rules), params, rules, name: 'Peregrine' };
}

function downloadFile(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function OrbitalLogo() {
  return <svg className="orbital-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true"><circle cx="18" cy="18" r="9.5" stroke="currentColor" strokeWidth="1.5" /><ellipse cx="18" cy="18" rx="17" ry="6.5" transform="rotate(-39 18 18)" stroke="currentColor" strokeWidth="1.5" /><path d="M12.5 13.2L18 10L23.5 13.2V20L18 23.3L12.5 20V13.2Z" fill="currentColor" fillOpacity="0.16" /><circle cx="29.8" cy="7.8" r="2.2" fill="currentColor" /><circle cx="18" cy="18" r="2" fill="currentColor" /></svg>;
}

function ViewCube({ view, onChange }: { view: CameraView; onChange: (view: CameraView) => void }) {
  const views: CameraView[] = ['isometric', 'top', 'front', 'right'];
  return <button className="view-cube" aria-label={`Camera: ${view}. Click to cycle camera views.`} title="Cycle camera view" onClick={() => onChange(views[(views.indexOf(view) + 1) % views.length])}>
    <svg width="87" height="89" viewBox="0 0 87 89" fill="none"><path d="M44 3V17M7 67L20 60M67 61L80 68" stroke="#53614f" strokeWidth="0.8" /><circle cx="44" cy="4" r="2.5" fill="#b6d38b" /><circle cx="7" cy="67" r="2.5" fill="#bb8e7b" /><circle cx="80" cy="68" r="2.5" fill="#7d9fb5" /><path d="M44 20L69 34L44 49L19 34L44 20Z" fill={view === 'top' ? '#394330' : '#252c24'} stroke="#67715c" strokeWidth="0.8" /><path d="M19 34L44 49V77L19 62V34Z" fill={view === 'front' ? '#333d2d' : '#1c221c'} stroke="#53604d" strokeWidth="0.8" /><path d="M44 49L69 34V62L44 77V49Z" fill={view === 'right' ? '#333d2d' : '#222921'} stroke="#53604d" strokeWidth="0.8" /><text x="44" y="38" textAnchor="middle" fill="#a6b499" fontSize="8" fontFamily="monospace">TOP</text><text x="31" y="59" textAnchor="middle" fill="#6e7b65" fontSize="8" fontFamily="monospace">F</text><text x="57" y="59" textAnchor="middle" fill="#88947b" fontSize="8" fontFamily="monospace">R</text><text x="49" y="8" fill="#a8be89" fontSize="7" fontFamily="monospace">Y</text><text x="1" y="79" fill="#a88774" fontSize="7" fontFamily="monospace">X</text><text x="80" y="80" fill="#7697ae" fontSize="7" fontFamily="monospace">Z</text></svg>
    <span>{view === 'isometric' ? 'ISOMETRIC' : `${view.toUpperCase()} VIEW`}</span>
  </button>;
}

export default function App() {
  const [initial] = useState(loadWorkspace);
  const [history, setHistory] = useState<{ entries: ShipLayout[]; index: number }>({ entries: [initial.layout], index: 0 });
  const layout = history.entries[history.index];
  const [params, setParams] = useState<GeneratorParams>(initial.params);
  const [rules, setRules] = useState<RuleConfig>(initial.rules);
  const [projectName, setProjectName] = useState(initial.name);
  const [selectedId, setSelectedId] = useState<string | null>(initial.layout.rooms.find(room => room.type === 'bridge')?.id ?? initial.layout.rooms[0]?.id ?? null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('workspace');
  const [options, setOptions] = useState<SceneOptions>(DEFAULT_OPTIONS);
  const [view, setView] = useState<CameraView>('isometric');
  const [tool, setTool] = useState<EditorTool>('select');
  const [zoom, setZoom] = useState(100);
  const [resetToken, setResetToken] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [face, setFace] = useState<Face>('north');
  const [toast, setToast] = useState<Toast | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'unavailable'>('saved');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'generator' | 'inspector' | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'obj'>('json');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingType, setOpeningType] = useState<OpeningType>('window');
  const [openingFace, setOpeningFace] = useState<Face>('north');
  const [openingError, setOpeningError] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(projectName);
  const sceneRef = useRef<Group | null>(null);
  const selectedRoom = layout.rooms.find(room => room.id === selectedId);
  const stats = useMemo(() => getLayoutStats(layout), [layout]);
  const errors = useMemo(() => validateLayout(layout, params), [layout, params]);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => setToast({ id: Date.now(), message, tone }), []);
  const commit = useCallback((next: ShipLayout) => {
    setHistory(previous => {
      const entries = [...previous.entries.slice(0, previous.index + 1), next].slice(-60);
      return { entries, index: entries.length - 1 };
    });
  }, []);
  const rollbackTo = useCallback((target: number) => {
    setRunning(false);
    setHistory(previous => ({ ...previous, index: Math.min(Math.max(target, 0), previous.entries.length - 1) }));
  }, []);
  const selectRoom = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedOpeningId(null);
    if (!id) return;
    const room = layout.rooms.find(r => r.id === id);
    if (room) {
      const preferredFace = FACES.find(f => openingsOnFace(layout, room, f).some(o => o.type === 'window'));
      setFace(preferredFace ?? 'north');
    }
  }, [layout]);
  const undo = useCallback(() => setHistory(previous => ({ ...previous, index: Math.max(0, previous.index - 1) })), []);
  const redo = useCallback(() => setHistory(previous => ({ ...previous, index: Math.min(previous.entries.length - 1, previous.index + 1) })), []);
  const frameLayout = useCallback(() => { setZoom(100); setView('isometric'); setResetToken(value => value + 1); }, []);
  const onSceneReady = useCallback((group: Group | null) => { sceneRef.current = group; }, []);
  const toggleDoorOpening = useCallback((openingId: string) => commit(toggleDoor(layout, openingId)), [layout, commit]);

  const generate = useCallback(() => {
    setRunning(false);
    const next = createLayout(params, rules);
    commit(next);
    setSelectedId(next.rooms.find(room => room.type === 'bridge')?.id ?? next.rooms[0]?.id ?? null);
    setSelectedOpeningId(null);
    setFace('north');
    frameLayout();
    notify(`Layout generated. ${next.rooms.length} rooms, built from seed ${params.seed}.`);
  }, [params, rules, commit, frameLayout, notify]);

  const step = useCallback(() => {
    const result = growLayout(layout, params, rules, params.splitBias === 1 ? 'split' : params.splitBias === 0 ? 'extrude' : undefined);
    if (!result.changed) { setRunning(false); notify(result.message, 'info'); return; }
    commit(result.layout);
    const events = result.layout.log.filter(event => event.type === 'split' || event.type === 'extrude');
    setSelectedId(events[events.length - 1]?.roomId ?? selectedId);
    if (!running) notify(result.message);
  }, [layout, params, rules, selectedId, running, commit, notify]);

  const runRules = useCallback((key?: RuleKey) => {
    const result = applyRules(layout, rules, key);
    const added = result.openings.length - layout.openings.length + result.furniture.length - layout.furniture.length + result.mounts.length - layout.mounts.length + result.interior.length - layout.interior.length + result.exterior.length - layout.exterior.length;
    commit(result);
    notify(`${key ? `${key.charAt(0).toUpperCase() + key.slice(1)} rule` : 'Goal rules'} applied in one pass. ${added} new features; existing openings preserved.`);
  }, [layout, rules, commit, notify]);

  const editRoom = useCallback((roomId: string, patch: Partial<Room>) => {
    const next = cloneLayout(layout);
    const room = next.rooms.find(r => r.id === roomId);
    if (!room) return;
    Object.assign(room, patch);
    next.log.push({ id: next.log.length, type: 'edit', label: 'Room updated', detail: `${roomId} / ${room.name}`, roomId, undoable: true });
    if (patch.type) {
      next.furniture = next.furniture.filter(item => item.roomId !== roomId);
      next.interior = next.interior.filter(item => item.roomId !== roomId);
      const roleRules: RuleConfig = { ...rules, enabled: { bridge: false, windows: false, airlocks: false, external: false, furniture: rules.enabled.furniture, populate: rules.enabled.populate } };
      commit(applyRules(next, roleRules));
    } else commit(next);
  }, [layout, commit, rules]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(step, 1350 / speed);
    return () => window.clearInterval(timer);
  }, [running, speed, step]);

  useEffect(() => { if (helpOpen || exportOpen || openingOpen || renameOpen) setRunning(false); }, [helpOpen, exportOpen, openingOpen, renameOpen]);

  useEffect(() => {
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, params, rules, name: projectName }));
        setSaveStatus('saved');
      } catch { setSaveStatus('unavailable'); }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [layout, params, rules, projectName]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (helpOpen || exportOpen || openingOpen || renameOpen) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === ' ') { event.preventDefault(); setRunning(value => !value); }
      if (key === 'r') generate();
      if (key === 'f') frameLayout();
      if (key === 'g') setOptions(previous => ({ ...previous, showGrid: !previous.showGrid }));
      if (key === 'v') setTool('select');
      if (key === 'h') setTool('pan');
      if (key === 'o') setTool('orbit');
      if (key === 'm') setTool('measure');
      if (key === '?') setHelpOpen(true);
      if (key === 'escape') { setSelectedId(null); setSelectedOpeningId(null); setMobilePanel(null); setLayersOpen(false); setProjectMenuOpen(false); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [generate, frameLayout, undo, redo, helpOpen, exportOpen, openingOpen, renameOpen]);

  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const closeOpening = useCallback(() => setOpeningOpen(false), []);
  const closeRename = useCallback(() => setRenameOpen(false), []);

  const exportLayout = async () => {
    setExporting(true);
    try {
      const filename = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (exportFormat === 'json') {
        const data = { format: 'orbital-layout', version: '2.0', name: projectName, units: 'meters', generator: params, rules, geometry: { thickness: options.thickness }, layout: { ...layout, log: includeHistory ? layout.log : [] } };
        downloadFile(JSON.stringify(data, null, 2), `${filename}-layout.json`, 'application/json');
      } else {
        if (!sceneRef.current) throw new Error('3D geometry is still loading. Please try again in a moment.');
        const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
        const clone = sceneRef.current.clone(true);
        const helpers: Group[] = [];
        clone.traverse(object => { if (object.type.includes('Line') || object.type === 'Sprite') helpers.push(object as Group); });
        helpers.forEach(object => object.removeFromParent());
        clone.children.forEach(object => object.scale.set(1, 1, 1));
        clone.updateMatrixWorld(true);
        const content = `# ORBITAL SHIPYARD\n# ${projectName} / seed ${layout.seed}\n# Units: meters. Visible geometry; cutaway ${options.cutaway ? 'on' : 'off'}.\n${new OBJExporter().parse(clone)}`;
        downloadFile(content, `${filename}-geometry.obj`, 'text/plain');
      }
      setExportOpen(false);
      notify(`${exportFormat === 'json' ? 'Layout data' : 'Procedural geometry'} exported. Ready for your next stage.`);
    } catch (error) { notify(error instanceof Error ? error.message : 'Export failed. Please try again.', 'info'); }
    finally { setExporting(false); }
  };

  const addOpening = (type: OpeningType, width: number, height: number) => {
    if (!selectedRoom) return;
    const next = cloneLayout(layout);
    const neighbors = faceNeighbors(next, selectedRoom, openingFace);
    const opening = placeOpening(next, selectedRoom.id, openingFace, type, width, height, neighbors[0]?.id);
    if (!opening) { setOpeningError('This face has no safe region for the opening. Try a smaller window or another face.'); return; }
    next.log.push({ id: next.log.length, type: 'opening', label: `${type.charAt(0).toUpperCase() + type.slice(1)} added`, detail: `${selectedRoom.id} / ${openingFace} face`, roomId: selectedRoom.id, undoable: true });
    commit(next);
    setFace(openingFace);
    setOpeningOpen(false);
    notify(`Persistent ${type} created. Wall geometry subdivided automatically.`);
  };

  const usePreset = (preset: 'explorer' | 'scout' | 'hauler') => {
    const nextParams = { ...DEFAULT_PARAMS, seed: params.seed, maxRooms: preset === 'scout' ? 10 : preset === 'hauler' ? 32 : 24, splitBias: preset === 'hauler' ? 0.35 : 0.65 };
    const next = createLayout(nextParams, rules);
    setParams(nextParams);
    setProjectName(preset === 'scout' ? 'Kestrel' : preset === 'hauler' ? 'Albatross' : 'Peregrine');
    commit(next);
    setSelectedId(next.rooms.find(room => room.type === 'bridge')?.id ?? next.rooms[0].id);
    setProjectMenuOpen(false);
    setRunning(false);
    frameLayout();
    notify(`${preset.charAt(0).toUpperCase() + preset.slice(1)} hull preset loaded.`);
  };

  const updateLayer = (key: keyof SceneOptions) => setOptions(previous => ({ ...previous, [key]: !previous[key] }));
  const currentPreset = params.maxRooms <= 12 ? 'Scout class' : params.maxRooms > 24 ? 'Hauler class' : 'Explorer class';
  const timelineEvents = layout.log;
  void stats.panels;

  return <MotionConfig reducedMotion="user"><div className="shipyard-app">
    <header className="app-header">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setActiveTab('workspace'); }} aria-label="Orbital Shipyard workspace"><OrbitalLogo /><span>ORBITAL<span className="brand-subtitle">SHIPYARD</span></span></a>
      <nav className="main-nav" aria-label="Editor workspace"><button aria-label="Workspace" className={activeTab === 'workspace' ? 'active' : ''} onClick={() => setActiveTab('workspace')}><LayoutGrid size={14} /><span>Workspace</span></button><button aria-label="Rule system" className={activeTab === 'rules' ? 'active' : ''} onClick={() => { setActiveTab('rules'); setMobilePanel('generator'); }}><Workflow size={14} /><span>Rule system</span></button><button aria-label="Geometry" className={activeTab === 'geometry' ? 'active' : ''} onClick={() => { setActiveTab('geometry'); setMobilePanel('generator'); }}><Box size={15} /><span>Geometry</span></button></nav>
      <div className="header-actions"><button className="documentation-button" aria-label="Documentation" onClick={() => setHelpOpen(true)}><BookOpen size={14} /><span>Documentation</span><ArrowUpRight size={12} /></button><button className="button primary export-button" aria-label="Export layout" onClick={() => { setExportFormat('json'); setExportOpen(true); }}><Download size={14} /><span>Export layout</span><ChevronDown size={12} /></button></div>
    </header>
    <div className="project-bar">
      <div className="project-bar-left"><IconButton className="mobile-generator-button" label="Toggle generator panel" onClick={() => setMobilePanel(mobilePanel === 'generator' ? null : 'generator')}><PanelLeft size={16} /></IconButton><span className="project-glyph"><Rocket size={16} strokeWidth={1.5} /></span><div className="project-switcher"><button onClick={() => setProjectMenuOpen(!projectMenuOpen)} aria-expanded={projectMenuOpen}><strong>{projectName}</strong><ChevronDown size={12} /></button>{projectMenuOpen && <><button className="popover-backdrop" aria-label="Close project menu" onClick={() => setProjectMenuOpen(false)} /><div className="project-menu popover"><span className="popover-title">HULL PRESETS</span>{([{ key: 'explorer', name: 'Peregrine', detail: 'A versatile explorer' }, { key: 'scout', name: 'Kestrel', detail: 'A compact, agile scout' }, { key: 'hauler', name: 'Albatross', detail: 'A heavy cargo hauler' }] as const).map(preset => <button key={preset.key} onClick={() => usePreset(preset.key)}><Rocket size={15} /><span>{preset.name}<small>{preset.detail}</small></span><ArrowRight size={12} /></button>)}<div className="popover-divider" /><button onClick={() => { setNewName(projectName); setRenameOpen(true); setProjectMenuOpen(false); }}><Settings2 size={14} /><span>Rename project</span></button></div></>}</div><span className="breadcrumb-slash">/</span><span className="project-class">{currentPreset}</span><span className="project-version">LAYOUT 01</span></div>
      <div className="project-bar-right"><span className={`save-status ${saveStatus}`}><CheckCheck size={13} /><span>{saveStatus === 'saving' ? 'Saving changes...' : saveStatus === 'saved' ? 'All changes saved' : 'Session only'}</span></span><div className="undo-controls"><IconButton label="Undo (Ctrl+Z)" disabled={history.index === 0} onClick={undo}><Undo2 size={15} /></IconButton><IconButton label="Redo (Ctrl+Shift+Z)" disabled={history.index >= history.entries.length - 1} onClick={redo}><Redo2 size={15} /></IconButton></div><IconButton label="Keyboard shortcuts (?)" onClick={() => setHelpOpen(true)}><Keyboard size={16} /></IconButton><IconButton className="mobile-inspector-button" label="Toggle inspector" onClick={() => setMobilePanel(mobilePanel === 'inspector' ? null : 'inspector')}><PanelRight size={16} /></IconButton></div>
    </div>
    <main className="editor-workspace">
      {mobilePanel && <button className="mobile-panel-backdrop" aria-label="Close sidebar" onClick={() => setMobilePanel(null)} />}
      <motion.aside className={`left-sidebar sidebar ${mobilePanel === 'generator' ? 'mobile-open' : ''}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} aria-label="Generator and rules"><div className="sidebar-scroll">
        {activeTab === 'workspace' && <GeneratorPanel params={params} setParams={setParams} rules={rules} setRules={setRules} running={running} onToggleRunning={() => setRunning(value => !value)} onGenerate={generate} onStep={step} onApplyRules={runRules} onOpenRules={() => setActiveTab('rules')} onShuffle={() => { setParams(previous => ({ ...previous, seed: Math.floor(Math.random() * 899999) + 100000 })); notify('New seed set. Generate a layout to explore it.', 'info'); }} />}
        {activeTab === 'rules' && <RulesPanel rules={rules} setRules={setRules} onApplyRules={runRules} />}
        {activeTab === 'geometry' && <GeometryPanel options={options} setOptions={setOptions} onExport={() => { setExportFormat('obj'); setExportOpen(true); }} onHelp={() => setHelpOpen(true)} />}
      </div></motion.aside>
      <section className="center-workspace" aria-label="Spaceship scene editor">
        <div className="scene-toolbar"><div className="scene-toolbar-left"><span className="scene-title"><Box size={13} />SCENE</span><span className="toolbar-separator" /><SelectField aria-label="Camera view" value={view} onChange={event => setView(event.target.value as CameraView)}><option value="isometric">Isometric</option><option value="top">Top view</option><option value="front">Front view</option><option value="right">Right view</option></SelectField></div><div className="scene-toolbar-right"><div className="render-modes" aria-label="Render mode">{(['gizmos', 'solid', 'wireframe'] as RenderMode[]).map(mode => <button key={mode} className={options.mode === mode ? 'active' : ''} aria-pressed={options.mode === mode} onClick={() => setOptions(previous => ({ ...previous, mode }))}>{mode === 'gizmos' ? <Layers3 size={12} /> : mode === 'solid' ? <Box size={12} /> : <Grid3X3 size={12} />}<span>{mode.charAt(0).toUpperCase() + mode.slice(1)}</span></button>)}</div><span className="toolbar-separator" /><IconButton label="Scene visibility layers" active={layersOpen} onClick={() => setLayersOpen(!layersOpen)}><Eye size={15} /></IconButton></div>
          {layersOpen && <><button className="popover-backdrop" aria-label="Close visibility layers" onClick={() => setLayersOpen(false)} /><div className="layers-popover popover"><span className="popover-title">SCENE VISIBILITY</span>{([
            { key: 'showInterior', label: 'Interior surfaces' },
            { key: 'showExterior', label: 'Exterior hull' },
            { key: 'showCorners', label: 'Corner pieces' },
            { key: 'showAngles', label: 'Angle rails' },
            { key: 'showPanels', label: 'Wall panels' },
            { key: 'showJunctions', label: 'T-junction blocks' },
            { key: 'showFrames', label: 'Door & window frames' },
            { key: 'showGlass', label: 'Window glass' },
            { key: 'showDoors', label: 'Door panels' },
            { key: 'showAirlocks', label: 'Airlock rings' },
            { key: 'showFurniture', label: 'Interior furniture' },
            { key: 'showMounts', label: 'Hull mounts' },
            { key: 'showSubdivisions', label: 'Subdivision edges' },
            { key: 'showLabels', label: 'Room labels' },
            { key: 'showGrid', label: 'Reference grid' },
          ] as const).map(layer => <button key={layer.key} onClick={() => updateLayer(layer.key)}><span>{layer.label}</span><span className={`check-box ${options[layer.key] ? 'checked' : ''}`}>{options[layer.key] && <Check size={10} />}</span></button>)}</div></>}
        </div>
        <div className={`scene-canvas tool-${tool}`} onWheel={event => setZoom(value => Math.max(40, Math.min(220, value * (event.deltaY > 0 ? 0.94 : 1.06))))}>
          <div className="canvas-renderer"><ShipScene layout={layout} selectedId={selectedId} selectedOpeningId={selectedOpeningId} onSelect={selectRoom} onToggleDoor={toggleDoorOpening} options={options} view={view} tool={tool} zoom={zoom} resetToken={resetToken} onReady={onSceneReady} /></div>
          <motion.div className="viewport-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}><h1>{projectName}</h1><span>PROCEDURAL INTERIOR <i>/</i> {String(layout.iteration).padStart(3, '0')}</span></motion.div>
          <div className="viewport-tools" role="toolbar" aria-label="Viewport tools"><IconButton label="Select room (V)" active={tool === 'select'} onClick={() => setTool('select')}><MousePointer2 size={17} /></IconButton><IconButton label="Orbit view (O)" active={tool === 'orbit'} onClick={() => setTool('orbit')}><Rotate3d size={17} /></IconButton><IconButton label="Pan view (H)" active={tool === 'pan'} onClick={() => setTool('pan')}><Hand size={16} /></IconButton><IconButton label="Measure selected room (M)" active={tool === 'measure'} onClick={() => setTool('measure')}><Ruler size={16} /></IconButton><span className="tool-divider" /><IconButton label="Toggle reference grid (G)" active={options.showGrid} onClick={() => updateLayer('showGrid')}><Grid3X3 size={16} /></IconButton></div>
          <div className="viewport-orientation"><ViewCube view={view} onChange={setView} /><button className={`cutaway-control ${options.cutaway ? 'active' : ''}`} onClick={() => setOptions(previous => ({ ...previous, cutaway: !previous.cutaway }))}><Layers3 size={11} /><span>Cutaway</span><span className="cutaway-dot" /></button></div>
          <div className="scene-legend"><span><i className="legend-room" />Room cells</span><span><i className="legend-opening" />Openings</span><span><i className="legend-mount" />Hull mounts</span></div>
          <div className="viewport-bottom"><div className="navigation-hint"><MousePointer2 size={11} /><span>Drag to orbit<span className="hint-separator" />Right-drag to pan<span className="hint-separator" />Scroll to zoom</span></div><div className="zoom-controls"><IconButton label="Zoom out" onClick={() => setZoom(value => Math.max(40, value - 10))}><Minus size={13} /></IconButton><button className="zoom-value" title="Reset zoom" onClick={() => setZoom(100)}>{Math.round(zoom)}<span>%</span></button><IconButton label="Zoom in" onClick={() => setZoom(value => Math.min(220, value + 10))}><Plus size={13} /></IconButton><span className="toolbar-separator" /><IconButton label="Frame entire layout (F)" onClick={frameLayout}><Focus size={15} /></IconButton></div></div>
          {running && <div className="growth-indicator"><span className="live-dot" />GROWING LAYOUT<span>{speed}x</span></div>}
        </div>
        <div className="scene-status"><span className={`layout-valid ${errors.length ? 'warning' : ''}`}><span className="status-dot" />{errors.length ? 'Settings changed' : 'Layout valid'}</span><div className="scene-counts"><span><strong>{stats.rooms}</strong> rooms</span><span><strong>{stats.interior}</strong> interior</span><span><strong>{stats.exterior}</strong> exterior</span><span><strong>{stats.openings}</strong> openings</span><span className="floor-area"><strong>{stats.floorArea.toFixed(0)}</strong> m<sup>2</sup></span></div><span className="unit-note">1 UNIT = 1 M</span></div>
        <div className={`history-dock ${historyOpen ? '' : 'collapsed'}`}><div className="history-header"><button className="history-heading" onClick={() => setHistoryOpen(!historyOpen)}><GitBranch size={12} /><span>GROWTH HISTORY</span><span className="history-step-count">{layout.iteration} steps / {history.entries.length - 1} snapshots</span></button><div className="history-playback"><button className="playback-speed" onClick={() => setSpeed(value => value === 1 ? 2 : value === 2 ? 0.5 : 1)} title="Change auto-growth speed">{speed}x</button><IconButton label="Undo growth step" disabled={history.index === 0} onClick={undo}><Undo2 size={12} /></IconButton><IconButton label={running ? 'Pause auto-growth (Space)' : 'Start auto-growth (Space)'} active={running} onClick={() => setRunning(value => !value)}>{running ? <Pause size={12} /> : <Play size={12} />}</IconButton><IconButton label="Grow one step" onClick={step}><SkipForward size={12} /></IconButton><span className="toolbar-separator" /><IconButton label={historyOpen ? 'Collapse growth history' : 'Expand growth history'} onClick={() => setHistoryOpen(!historyOpen)}>{historyOpen ? <ChevronsDown size={13} /> : <ChevronsUp size={13} />}</IconButton></div></div>
          {historyOpen && <div className="history-timeline">{timelineEvents.map((event, index) => <button key={`${layout.seed}-${event.id}`} className={`history-event ${index === history.index ? 'selected' : ''}`} title={`Step ${event.id} · ${event.detail}`} onClick={() => { if (event.roomId) { selectRoom(event.roomId); } rollbackTo(event.id === 0 ? 0 : Math.min(history.index, index >= history.index ? history.index : index)); notify(event.detail, 'info'); }}><span className="event-track"><span className="event-node">{event.type === 'seed' ? <Box size={11} /> : event.type === 'split' ? <LayoutGrid size={11} /> : event.type === 'extrude' ? <MoveUpRight size={12} /> : event.type === 'rules' ? <Check size={12} /> : event.type === 'opening' ? <DoorOpen size={11} /> : <Plus size={11} />}</span><span className="event-connector" /></span><span className="event-label">{event.label}</span><span className="event-meta">{event.type === 'seed' ? `# ${layout.seed}` : event.type === 'rules' ? 'Single pass' : event.roomId ?? `Step ${event.id}`}</span></button>)}</div>}
        </div>
      </section>
      <motion.aside className={`right-sidebar sidebar ${mobilePanel === 'inspector' ? 'mobile-open' : ''}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.08 }} aria-label="Room inspector"><div className="sidebar-scroll"><Inspector layout={layout} selectedRoom={selectedRoom} onSelect={selectRoom} options={options} setOptions={setOptions} face={face} setFace={setFace} onAddOpening={() => { setOpeningFace(face); setOpeningError(''); setOpeningOpen(true); }} onEditRoom={editRoom} onHelp={() => setHelpOpen(true)} errors={errors} /></div></motion.aside>
    </main>
    <footer className="app-statusbar"><div><span className="engine-status"><span className="status-dot" />ENGINE READY</span><span className="footer-separator" /><span>SAFE-RANGE BSP</span><span className="version-label">v0.9.0</span></div><div className="footer-selection">{selectedRoom ? <><Box size={10} /><span>{selectedRoom.id}</span><span className="footer-separator" /><span>X {selectedRoom.min.x.toFixed(2)}</span><span>Y {selectedRoom.min.y.toFixed(2)}</span><span>Z {selectedRoom.min.z.toFixed(2)}</span></> : <span>No room selected</span>}</div><div><span className="local-workspace"><span className="tiny-square" />LOCAL WORKSPACE</span><button onClick={() => setHelpOpen(true)} title="Help and keyboard shortcuts"><CircleHelp size={12} /></button></div></footer>
    <AnimatePresence>{toast && <motion.div key={toast.id} className={`toast ${toast.tone}`} role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span className="toast-icon">{toast.tone === 'success' ? <Check size={15} /> : <CircleHelp size={15} />}</span><span>{toast.message}</span><IconButton label="Dismiss notification" onClick={() => setToast(null)}><X size={13} /></IconButton></motion.div>}</AnimatePresence>

    <Modal open={exportOpen} onClose={closeExport} title="Ready for the next stage." subtitle="Take your ship beyond the editor." className="export-modal">
      <div className="export-project"><span className="export-project-icon"><Rocket size={24} strokeWidth={1.3} /></span><div><strong>{projectName}</strong><span>{stats.rooms} rooms / {stats.openings} openings / seed {layout.seed}</span></div><span className="engine-tag">{currentPreset.replace(' class', '').toUpperCase()}</span></div>
      <span className="modal-section-label">EXPORT FORMAT</span>
      <div className="export-options">
        <button className={exportFormat === 'json' ? 'selected' : ''} onClick={() => setExportFormat('json')}><FileJson size={23} /><span><strong>Layout data</strong><small>Room bounds, rules, persistent openings, and objects.</small></span><code>.json</code><span className="radio-circle" /></button>
        <button className={exportFormat === 'obj' ? 'selected' : ''} onClick={() => setExportFormat('obj')}><Box size={23} /><span><strong>Visible geometry</strong><small>Actual subdivided walls, furniture, and hull equipment.</small></span><code>.obj</code><span className="radio-circle" /></button>
      </div>
      {exportFormat === 'json' ? <label className="export-checkbox"><input type="checkbox" checked={includeHistory} onChange={event => setIncludeHistory(event.target.checked)} /><span>Include generation history</span></label> : <div className="export-mesh-note"><Layers3 size={14} /><span>Exports current visibility settings. Ceilings are {options.cutaway ? 'cut away' : 'included'}. All dimensions are in meters.</span></div>}
      <div className="modal-actions"><button className="button secondary" onClick={closeExport}>Keep designing</button><button className="button primary" onClick={exportLayout} disabled={exporting}><Download size={14} />{exporting ? 'Preparing export...' : `Download ${exportFormat === 'json' ? 'layout' : 'geometry'}`}</button></div>
    </Modal>

    <Modal open={openingOpen} onClose={closeOpening} title="Make an opening." subtitle={`A persistent feature on ${selectedRoom?.name ?? 'this room'}.`}><div className="opening-type-picker">{([{ type: 'window', icon: PanelsTopLeft, label: 'Window' }, { type: 'door', icon: DoorOpen, label: 'Door' }, { type: 'airlock', icon: Box, label: 'Airlock' }] as const).map(item => <button key={item.type} className={openingType === item.type ? 'selected' : ''} onClick={() => { setOpeningType(item.type); setOpeningError(''); if (item.type === 'airlock') setOpeningFace('ceiling'); }}><item.icon size={20} /><span>{item.label}</span></button>)}</div><SelectField label="Room face" value={openingFace} onChange={event => { setOpeningFace(event.target.value as Face); setOpeningError(''); }}>{FACES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)} / {selectedRoom && faceNeighbors(layout, selectedRoom, f).length ? 'shared interior face' : 'exterior hull'}</option>)}</SelectField><div className="info-note"><LockKeyhole size={16} /><p>The opening is placed in an exact safe region and stays protected during all future growth. Its wall mesh updates automatically.</p></div>{openingError && <p className="form-error" role="alert">{openingError}</p>}<div className="modal-actions"><button className="button secondary" onClick={closeOpening}>Cancel</button><button className="button primary" onClick={() => addOpening(openingType, openingType === 'door' ? 1.15 : openingType === 'airlock' ? 1.55 : 1.8, openingType === 'door' ? 2.35 : openingType === 'airlock' ? 2.4 : 1.25)}><Plus size={14} />Create {openingType}</button></div></Modal>

    <Modal open={helpOpen} onClose={closeHelp} title="A shipyard for possibilities." subtitle="ORBITAL / WORKSPACE GUIDE" className="help-modal"><div className="help-sections"><section><span><GitBranch size={17} /></span><div><h3>Forward-only. Always valid.</h3><p>BSP growth splits or extrudes AABB room cells. Every position is sampled from an exactly computed safe interval, with minimum size and aspect ratio enforced. Enable the Y axis for stacked layouts.</p></div></section><section><span><LockKeyhole size={17} /></span><div><h3>Openings are part of the structure.</h3><p>Doors, windows, and airlocks survive growth. They re-parent to the split child that contains them and block cuts or extrusions through their footprints. Goal rules never remove existing features.</p></div></section><section><span><Box size={17} /></span><div><h3>T-junctions, sealing, randomized features.</h3><p>Every wall uses fixed corners and angle rails. When a wall meets a neighbor only partway along its length, a T-junction block fills the seam. Rooms get randomized palettes, randomized window sizes, and recursive furniture / decoration meshes.</p></div></section></div><div className="keyboard-guide"><h3><Keyboard size={14} />A few useful shortcuts</h3><div>{[['V', 'Select room'], ['O', 'Orbit camera'], ['H', 'Pan camera'], ['M', 'Measure room'], ['F', 'Frame layout'], ['G', 'Toggle grid'], ['R', 'Regenerate layout'], ['Space', 'Play / pause growth'], ['Click door', 'Open / close'], ['Ctrl Z', 'Undo'], ['Ctrl Shift Z', 'Redo']].map(([key, label]) => <span key={key}><span>{label}</span><kbd>{key}</kbd></span>)}</div></div><div className="help-footer"><ShieldCheck size={13} /><span>Your workspace is saved locally in this browser.</span><button className="button primary" onClick={closeHelp}>Back to the shipyard<ArrowRight size={13} /></button></div></Modal>

    <Modal open={renameOpen} onClose={closeRename} title="Give it a name." subtitle="Every good ship starts somewhere."><label className="rename-field"><span className="field-label">Project name</span><input value={newName} onChange={event => setNewName(event.target.value)} maxLength={32} placeholder="Your ship's name" onKeyDown={event => { if (event.key === 'Enter' && newName.trim()) { setProjectName(newName.trim()); setRenameOpen(false); } }} /></label><div className="modal-actions"><button className="button secondary" onClick={closeRename}>Cancel</button><button className="button primary" disabled={!newName.trim()} onClick={() => { setProjectName(newName.trim()); setRenameOpen(false); notify('Project renamed. A new identity, the same possibilities.'); }}><Check size={14} />Save name</button></div></Modal>
  </div></MotionConfig>;
}
