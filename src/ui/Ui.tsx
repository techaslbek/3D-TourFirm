import { useEffect, useMemo } from 'react';
import { itemsOutsideRoom, ROOM_LIMITS } from '../core/layout';
import { cameraPresets, type CameraMode } from '../core/presets';
import { findConflicts } from '../core/validate';
import { useStore, type CeilingMode, type PanelTab, type Quality, type WallMode } from '../state/store';
import { BudgetTab } from './Budget';
import { DesignTab, Inspector } from './Editor';
import { Joystick } from './Joystick';
import { useT, type Lang, type TKey } from './i18n';
import { isTypingTarget } from './keys';
import { ChecksSection, ProjectTab } from './Project';
import { Check, NumberField } from './controls';

const MODES: { id: CameraMode; key: TKey; shortcut: string }[] = [
  { id: 'orbit', key: 'orbit', shortcut: '1' },
  { id: 'walk', key: 'walk', shortcut: '2' },
  { id: 'plan', key: 'plan', shortcut: '3' },
  { id: 'dollhouse', key: 'dollhouse', shortcut: '4' },
];

const PRESET_FOR_MODE: Record<CameraMode, string> = { orbit: 'overview', walk: 'entrance', plan: 'plan', dollhouse: 'dollhouse' };

export function Ui() {
  useShortcuts();
  return (
    <>
      <Toolbar />
      <SidePanel />
      <Inspector />
      <WalkHud />
      <Joystick />
      <Toast />
      <FpsBadge />
      <HelpOverlay />
    </>
  );
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const s = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { s.undo(); e.preventDefault(); }
        else if ((k === 'z' && e.shiftKey) || k === 'y') { s.redo(); e.preventDefault(); }
        else if (k === 'd' && s.selected) { s.duplicateSelected(); e.preventDefault(); }
        return;
      }
      if (e.altKey) return;
      const editing = s.selected && s.cameraMode !== 'walk';
      if (editing) {
        if (e.key === 'Delete' || e.key === 'Backspace') { s.deleteSelected(); e.preventDefault(); return; }
        if (e.key === '[') { s.rotateSelected(-1); return; }
        if (e.key === ']') { s.rotateSelected(1); return; }
        const nudge: Record<string, [number, number]> = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] };
        if (nudge[e.key]) {
          const item = s.layout.items.find((i) => i.id === s.selected);
          if (item) s.moveItem(item.id, Math.round((item.x + nudge[e.key][0]) * 1000) / 1000, Math.round((item.y + nudge[e.key][1]) * 1000) / 1000);
          e.preventDefault();
          return;
        }
      }
      const mode = MODES.find((m) => m.shortcut === e.key);
      if (mode) s.setCameraMode(mode.id);
      else if (e.key === 'r' || e.key === 'R') s.applyPreset(PRESET_FOR_MODE[s.cameraMode]);
      else if (e.key === 'h' || e.key === 'H' || e.key === '?') s.set({ helpOpen: !s.helpOpen });
      else if (e.key === 'Escape') s.set({ helpOpen: false, selected: null });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function Toolbar() {
  const t = useT();
  const mode = useStore((s) => s.cameraMode);
  const layout = useStore((s) => s.layout);
  const lang = useStore((s) => s.lang);
  const quality = useStore((s) => s.quality);
  const req = useStore((s) => s.cameraRequest);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const { set, setCameraMode, applyPreset, undo, redo } = useStore.getState();
  const presets = useMemo(() => cameraPresets(layout), [layout]);
  const conflicts = useMemo(() => findConflicts(layout).count, [layout]);
  return (
    <header className="toolbar" role="toolbar">
      <div className="brand">
        <strong>{t('appTitle')}</strong>
        <span className="badge">{t('phaseBadge')}</span>
      </div>
      <div className="seg" role="group" aria-label="Camera mode">
        {MODES.map((m) => (
          <button key={m.id} data-mode={m.id} className={mode === m.id ? 'on' : ''} aria-pressed={mode === m.id}
            onClick={(e) => { setCameraMode(m.id); e.currentTarget.blur(); }} title={`${t(m.key)} (${m.shortcut})`}>
            {t(m.key)}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{t('views')}</span>
        <select id="preset" data-testid="preset" value={req?.preset.id ?? ''} onChange={(e) => { applyPreset(e.target.value); e.target.blur(); }}>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{t(`preset.${p.id}` as TKey)}</option>
          ))}
        </select>
      </label>
      <button onClick={() => applyPreset(PRESET_FOR_MODE[mode])} title={`${t('resetCamera')} (R)`}>{t('resetCamera')}</button>
      <div className="seg">
        <button data-testid="undo" onClick={(e) => { undo(); e.currentTarget.blur(); }} disabled={!canUndo} title={`${t('undo')} (Ctrl+Z)`} aria-label={t('undo')}>↶</button>
        <button data-testid="redo" onClick={(e) => { redo(); e.currentTarget.blur(); }} disabled={!canRedo} title={`${t('redo')} (Ctrl+Y)`} aria-label={t('redo')}>↷</button>
      </div>
      <button
        data-testid="checks-badge"
        className={conflicts ? 'warn-badge' : 'ok-badge'}
        onClick={() => set({ panelOpen: true, panelTab: 'room' })}
        title={t('checks')}
      >
        {conflicts ? `⚠ ${conflicts}` : '✓'} {t('checks')}
      </button>
      <div className="spacer" />
      <label className="field">
        <span>{t('quality')}</span>
        <select id="quality" value={quality} onChange={(e) => set({ quality: e.target.value as Quality })}>
          <option value="low">{t('low')}</option>
          <option value="balanced">{t('balanced')}</option>
          <option value="high">{t('high')}</option>
        </select>
      </label>
      <label className="field">
        <span>{t('language')}</span>
        <select id="lang" value={lang} onChange={(e) => set({ lang: e.target.value as Lang })} data-testid="lang">
          <option value="en">English</option>
          <option value="uz">Oʻzbekcha</option>
          <option value="ru">Русский</option>
        </select>
      </label>
      <button onClick={() => set({ helpOpen: true })} title={`${t('help')} (H)`}>?</button>
    </header>
  );
}

const TABS: { id: PanelTab; key: TKey }[] = [
  { id: 'design', key: 'tabDesign' },
  { id: 'room', key: 'tabRoom' },
  { id: 'brand', key: 'tabBrand' },
  { id: 'budget', key: 'tabBudget' },
  { id: 'project', key: 'tabProject' },
  { id: 'settings', key: 'tabSettings' },
];

function SidePanel() {
  const t = useT();
  const open = useStore((s) => s.panelOpen);
  const tab = useStore((s) => s.panelTab);
  const set = useStore((s) => s.set);
  if (!open) {
    return <button className="panel-toggle closed" onClick={() => set({ panelOpen: true })}>☰ {t('panel')}</button>;
  }
  return (
    <aside className={`panel ${tab === 'budget' ? 'wide' : ''}`} aria-label={t('panel')}>
      <div className="tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" data-tab={x.id} aria-selected={tab === x.id} className={tab === x.id ? 'on' : ''} onClick={() => set({ panelTab: x.id })}>
            {t(x.key)}
          </button>
        ))}
        <button className="tab-close" onClick={() => set({ panelOpen: false })} aria-label={t('close')}>×</button>
      </div>
      <div className="panel-body">
        {tab === 'design' && <DesignTab />}
        {tab === 'room' && <RoomTab />}
        {tab === 'brand' && <BrandTab />}
        {tab === 'budget' && <BudgetTab />}
        {tab === 'project' && <ProjectTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </aside>
  );
}

function RoomTab() {
  const t = useT();
  const s = useStore();
  const outside = useMemo(() => itemsOutsideRoom(s.layout), [s.layout]);
  const { width, depth, ceilingHeight } = s.layout.room;
  return (
    <>
      <section>
        <h3>{t('room')}</h3>
        <NumberField testId="room-width" label={t('width')} value={width} {...ROOM_LIMITS.width} onChange={(v) => s.setRoomSize({ width: v })} />
        <NumberField testId="room-depth" label={t('depth')} value={depth} {...ROOM_LIMITS.depth} onChange={(v) => s.setRoomSize({ depth: v })} />
        <NumberField testId="room-height" label={t('height')} value={ceilingHeight} {...ROOM_LIMITS.height} onChange={(v) => s.setRoomSize({ height: v })} />
        <p className="meta">{t('area')}: <strong>{(width * depth).toFixed(1)} m²</strong></p>
        <p className="note">{t('assumed')}</p>
        {outside.length > 0 && <p className="warn" data-testid="outside-warning">⚠ {outside.length} {t('itemsOutside')}</p>}
        <button onClick={s.resetRoom}>{t('resetRoom')}</button>
      </section>
      <ChecksSection />
      <section>
        <h3>{t('layers')}</h3>
        <label className="row">
          <span>{t('walls')}</span>
          <select id="wall-mode" value={s.wallMode} onChange={(e) => s.set({ wallMode: e.target.value as WallMode })}>
            {(['cutaway', 'solid', 'transparent', 'hidden'] as const).map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </select>
        </label>
        <label className="row">
          <span>{t('ceiling')}</span>
          <select id="ceiling-mode" value={s.ceilingMode} onChange={(e) => s.set({ ceilingMode: e.target.value as CeilingMode })}>
            {(['auto', 'on', 'off'] as const).map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </select>
        </label>
        <Check label={t('furniture')} checked={s.showFurniture} onChange={(v) => s.set({ showFurniture: v })} />
        <Check label={t('wallItems')} checked={s.showWallItems} onChange={(v) => s.set({ showWallItems: v })} />
        <Check label={t('zones')} checked={s.showZones} onChange={(v) => s.set({ showZones: v })} />
        <Check label={t('grid')} checked={s.showGrid} onChange={(v) => s.set({ showGrid: v })} />
        <Check label={t('door')} checked={s.doorOpen} onChange={(v) => s.set({ doorOpen: v })} testId="door-open" />
      </section>
    </>
  );
}

function BrandTab() {
  const t = useT();
  const s = useStore();
  return (
    <section>
      <h3>{t('brand')}</h3>
      <label className="row" htmlFor="brand-name">
        <span>{t('brandName')}</span>
        <input id="brand-name" data-testid="brand-name" className="text" type="text" maxLength={40} value={s.brandName} onChange={(e) => s.set({ brandName: e.target.value })} />
      </label>
      <label className="row" htmlFor="brand-tagline">
        <span>{t('brandTagline')}</span>
        <input id="brand-tagline" className="text" type="text" maxLength={60} value={s.brandTagline} onChange={(e) => s.set({ brandTagline: e.target.value })} />
      </label>
      <div className="row">
        <span>{t('destinationsLabel')}</span>
        {s.destinations.map((d, k) => (
          <input key={k} id={`destination-${k}`} aria-label={`${t('destinationsLabel')} ${k + 1}`} className="text" type="text" maxLength={24} value={d}
            onChange={(e) => s.set({ destinations: s.destinations.map((v, j) => (j === k ? e.target.value : v)) })} />
        ))}
      </div>
      <p className="note">{t('brandNote')}</p>
    </section>
  );
}

function SettingsTab() {
  const t = useT();
  const s = useStore();
  return (
    <>
      <section>
        <h3>{t('walking')}</h3>
        <label className="row">
          <span>{t('eyeHeight')} <em>{s.eyeHeight.toFixed(2)} m</em></span>
          <input id="eye-height" type="range" min={1.0} max={2.0} step={0.05} value={s.eyeHeight} onChange={(e) => s.set({ eyeHeight: +e.target.value })} />
        </label>
        <label className="row">
          <span>{t('speed')} <em>{s.walkSpeed.toFixed(1)} m/s</em></span>
          <input id="walk-speed" type="range" min={0.5} max={4} step={0.1} value={s.walkSpeed} onChange={(e) => s.set({ walkSpeed: +e.target.value })} />
        </label>
        <Check label={t('collision')} checked={s.collision} onChange={(v) => s.set({ collision: v })} />
        <label className="row">
          <span>{t('joystick')}</span>
          <select id="joystick" value={s.joystick} onChange={(e) => s.set({ joystick: e.target.value as 'auto' | 'on' | 'off' })}>
            <option value="auto">{t('auto')}</option>
            <option value="on">{t('on')}</option>
            <option value="off">{t('off')}</option>
          </select>
        </label>
      </section>
      <section>
        <h3>{t('quality')}</h3>
        <Check label={t('autoQuality')} checked={s.autoQuality} onChange={(v) => s.set({ autoQuality: v })} />
        <Check label={t('showFps')} checked={s.showFps} onChange={(v) => s.set({ showFps: v })} />
      </section>
    </>
  );
}

function WalkHud() {
  const t = useT();
  const mode = useStore((s) => s.cameraMode);
  const locked = useStore((s) => s.pointerLocked);
  if (mode !== 'walk') return null;
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return (
    <>
      <div className="crosshair" aria-hidden />
      {!locked && <div className="hint">{touch ? t('dragToLook') : t('clickToLook')}</div>}
    </>
  );
}

function Toast() {
  const t = useT();
  const quality = useStore((s) => s.qualityNotice);
  const notice = useStore((s) => s.notice);
  useEffect(() => {
    if (!quality && !notice) return;
    const id = setTimeout(() => useStore.getState().set({ qualityNotice: null, notice: null }), 4000);
    return () => clearTimeout(id);
  }, [quality, notice]);
  const text = notice ?? (quality ? t(quality as TKey) : null);
  if (!text) return null;
  return <div className="toast" role="status" data-testid="toast">{text}</div>;
}

function FpsBadge() {
  const show = useStore((s) => s.showFps);
  const fps = useStore((s) => s.fps);
  const quality = useStore((s) => s.quality);
  if (!show) return null;
  return <div className="fps">{fps} FPS · {quality}</div>;
}

function HelpOverlay() {
  const t = useT();
  const open = useStore((s) => s.helpOpen);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => useStore.getState().set({ helpOpen: false })}>
      <div className="modal" role="dialog" aria-label={t('helpTitle')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('helpTitle')}</h2>
        <ul>
          <li>{t('helpOrbit')}</li>
          <li>{t('helpWalk')}</li>
          <li>{t('helpPlan')}</li>
          <li>{t('helpEdit')}</li>
          <li>{t('helpKeys')}</li>
        </ul>
        <p className="note">{t('helpNote')}</p>
        <button onClick={() => useStore.getState().set({ helpOpen: false })}>{t('close')}</button>
      </div>
    </div>
  );
}

