import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Check, ChevronDown, Info } from 'lucide-react';
import { CORNER_SIZE, ANGLE_SIZE, openingsOnFace, tileWall, type Face, type Room, type ShipLayout } from '../lib/ship';

export function IconButton({ children, label, active, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; label: string; active?: boolean }) {
  return <button type="button" className={`icon-button ${active ? 'active' : ''} ${className}`} title={label} aria-label={label} aria-pressed={active} {...props}>{children}</button>;
}

export function Toggle({ checked, onChange, label, small = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; small?: boolean }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)} className={`toggle ${checked ? 'on' : ''} ${small ? 'small' : ''}`}><span>{checked && small && <Check size={8} strokeWidth={3} />}</span></button>;
}

export function RangeField({ label, value, min, max, step = 1, suffix = '', display, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; display?: string; onChange: (value: number) => void }) {
  const style = { '--range-progress': `${((value - min) / (max - min)) * 100}%` } as CSSProperties;
  return <label className="range-field"><span className="field-label"><span>{label}</span><span className="range-value">{display ?? value}<em>{suffix}</em></span></span><input type="range" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} style={style} /></label>;
}

export function SectionHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <div className="section-heading"><h3>{children}</h3>{aside}</div>;
}

export function SelectField({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  return <label className="select-field">{label && <span className="field-label">{label}</span>}<span className="select-wrap"><select {...props}>{children}</select><ChevronDown size={12} /></span></label>;
}

export function Modal({ open, title, subtitle, onClose, children, className = '' }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode; className?: string }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]');
        if (!focusable?.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', onKey); previousFocus?.focus(); };
  }, [open, onClose]);
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`modal ${className}`} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.2 }}>
      <div className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton></div>
      {children}
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

export function WallPreview({ layout, room, face, onFaceChange, onHelp }: { layout: ShipLayout; room: Room; face: Face; onFaceChange: (face: Face) => void; onHelp: () => void }) {
  const openings = openingsOnFace(layout, room, face);
  const tiling = tileWall(layout, room, face, 0.12);
  const { width, height, corners, angles, middles } = tiling;
  const drawWidth = 206;
  const drawHeight = Math.min(89, drawWidth * height / width);
  const offsetY = 25 + (89 - drawHeight) / 2;
  const corner = Math.min(CORNER_SIZE, width / 2, height / 2);
  const angle = Math.min(ANGLE_SIZE, (width - corner * 2) / 2, (height - corner * 2) / 2);
  const tileRects = middles.map(mid => {
    const uStart = mid.center.x - mid.size.x / 2 - room.min.x;
    const vStart = mid.center.z - mid.size.z / 2 - room.min.z;
    return { x: uStart, y: vStart, w: mid.size.x, h: mid.size.z };
  });
  return <div className="wall-preview-section">
    <div className="subsection-title"><h4>Wall subdivision</h4><IconButton label="About wall subdivision" onClick={onHelp}><Info size={13} /></IconButton></div>
    <div className="wall-face-row"><SelectField aria-label="Inspect wall face" value={face} onChange={event => onFaceChange(event.target.value as Face)}>{['north', 'east', 'south', 'west', 'ceiling', 'floor'].map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)} {f === 'ceiling' || f === 'floor' ? '' : 'wall'}</option>)}</SelectField><span className="micro-label">{openings.length ? `${openings.length} OPENING${openings.length > 1 ? 'S' : ''}` : 'SOLID'}</span></div>
    <div className="wall-preview">
      <svg viewBox="0 0 236 132" role="img" aria-label={`${face} wall: ${corners.length} corners, ${angles.length} angle rails, ${middles.length} stretched middle tiles`}>
        <text x="15" y="11" fill="#64725f" fontSize="6.5" fontFamily="monospace" letterSpacing="0.7">{width.toFixed(2)} x {height.toFixed(2)} m</text>
        <rect x="15" y={offsetY} width={drawWidth} height={drawHeight} fill="#1c2316" stroke="#2d3624" strokeWidth="0.6" />
        {corners.map((_, index) => {
          const positions = [[0, 0], [1, 0], [0, 1], [1, 1]];
          const [px, py] = positions[index] ?? [0, 0];
          const x = 15 + (px ? width - corner : 0) / width * drawWidth;
          const y = offsetY + (py ? height - corner : 0) / height * drawHeight;
          return <rect key={index} x={x} y={y} width={corner / width * drawWidth} height={corner / height * drawHeight} fill="#c2a472" stroke="#7d6741" strokeWidth="0.6" />;
        })}
        {angles.map((_panel, index) => {
          const positions = [[0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]];
          const [px, py] = positions[index] ?? [0, 0];
          const u = px === 0.5 ? width - corner * 2 : angle;
          const v = py === 0.5 ? height - corner * 2 : angle;
          const x = 15 + (px === 0.5 ? corner : 0) / width * drawWidth;
          const y = offsetY + (py === 0.5 ? corner : 0) / height * drawHeight;
          const w = (px === 0.5 ? u : angle) / width * drawWidth;
          const h = (py === 0.5 ? v : angle) / height * drawHeight;
          return <rect key={index} x={x} y={y} width={w} height={h} fill="#5e8a73" stroke="#3c5d49" strokeWidth="0.5" fillOpacity="0.85" />;
        })}
        {tileRects.map((rect, index) => <rect key={index} x={15 + rect.x / width * drawWidth} y={offsetY + (height - rect.y - rect.h) / height * drawHeight} width={rect.w / width * drawWidth} height={rect.h / height * drawHeight} fill="#3c483a" stroke="#5e7152" strokeWidth="0.5" fillOpacity="0.9"><title>{`Stretchable tile ${index + 1}: ${rect.w.toFixed(2)} x ${rect.h.toFixed(2)} m`}</title></rect>)}
        {openings.map(opening => {
          const { u, v } = { u: 'x' as 'x' | 'y' | 'z', v: 'z' as 'x' | 'y' | 'z' };
          const u0 = opening.center[u] - room.min[u] - opening.width / 2;
          const v0 = opening.center[v] - room.min[v] - opening.height / 2;
          return <rect key={opening.id} x={15 + u0 / width * drawWidth} y={offsetY + (height - v0 - opening.height) / height * drawHeight} width={opening.width / width * drawWidth} height={opening.height / height * drawHeight} fill="#17262a" stroke="#80b7c7" strokeWidth="1.1" fillOpacity="0.85"><title>{opening.type} / {opening.width.toFixed(2)} x {opening.height.toFixed(2)} m</title></rect>;
        })}
        <text x="15" y="129" fill="#64725f" fontSize="6.5" fontFamily="monospace" letterSpacing="0.7">{`4 corners / 4 angle rails / ${middles.length} stretched middle tiles`}</text>
        <circle cx="220" cy="127" r="1.6" fill="#bedf92" />
      </svg>
    </div>
    <div className="subdivision-counts"><span><strong>{corners.length}</strong> corners</span><span><strong>{angles.length}</strong> angle rails</span><span><strong>{middles.length}</strong> stretched tiles</span></div>
  </div>;
}