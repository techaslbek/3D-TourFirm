import { useEffect, useMemo } from 'react';
import { itemsOutsideRoom, ROOM_LIMITS } from '../core/layout';
import { cameraPresets, type CameraMode } from '../core/presets';
import { useStore, type CeilingMode, type Quality, type WallMode } from '../state/store';
import { useT, type Lang, type TKey } from './i18n';
import { isTypingTarget } from './keys';

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
      <InfoCard />
      <WalkHud />
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
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = useStore.getState();
      const mode = MODES.find((m) => m.shortcut === e.key);
      if (mode) s.setCameraMode(mode.id);
      else if (e.key === 'r' || e.key === 'R') s.applyPreset(PRESET_FOR_MODE[s.cameraMode]);
      else if (e.key === 'h' || e.key === 'H' || e.key === '?') s.set({ helpOpen: !s.helpOpen });
      else if (e.key === 'Escape') s.set({ helpOpen: false, inspected: null });
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
  const { set, setCameraMode, applyPreset } = useStore.getState();
  const presets = useMemo(() => cameraPresets(layout), [layout]);
  return (
    <header className="toolbar" role="toolbar">
      <div className="brand">
        <strong>{t('appTitle')}</strong>
        <span className="badge">{t('phaseBadge')}</span>
      </div>
      <div className="seg" role="group" aria-label="Camera mode">
        {MODES.map((m) => (
          <button key={m.id} data-mode={m.id} className={mode === m.id ? 'on' : ''} aria-pressed={mode === m.id} onClick={(e) => { setCameraMode(m.id); e.currentTarget.blur(); }} title={`${t(m.key)} (${m.shortcut})`}>
            {t(m.key)}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{t('views')}</span>
        <select data-testid="preset" value={req?.preset.id ?? ''} onChange={(e) => { applyPreset(e.target.value); e.target.blur(); }}>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{t(`preset.${p.id}` as TKey)}</option>
          ))}
        </select>
      </label>
      <button onClick={() => applyPreset(PRESET_FOR_MODE[mode])} title={`${t('resetCamera')} (R)`}>{t('resetCamera')}</button>
      <div className="spacer" />
      <label className="field">
        <span>{t('quality')}</span>
        <select value={quality} onChange={(e) => set({ quality: e.target.value as Quality })}>
          <option value="low">{t('low')}</option>
          <option value="balanced">{t('balanced')}</option>
          <option value="high">{t('high')}</option>
        </select>
      </label>
      <label className="field">
        <span>{t('language')}</span>
        <select value={lang} onChange={(e) => set({ lang: e.target.value as Lang })} data-testid="lang">
          <option value="en">English</option>
          <option value="uz">Oʻzbekcha</option>
          <option value="ru">Русский</option>
        </select>
      </label>
      <button onClick={() => set({ helpOpen: true })} title={`${t('help')} (H)`}>?</button>
    </header>
  );
}

function NumberField({ label, value, min, max, step, onChange, testId }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; testId: string;
}) {
  return (
    <div className="num">
      <label htmlFor={testId}>{label}</label>
      <div className="num-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
        <input
          id={testId}
          data-testid={testId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
        />
        <span className="unit">m</span>
      </div>
    </div>
  );
}

function SidePanel() {
  const t = useT();
  const s = useStore();
  const outside = useMemo(() => itemsOutsideRoom(s.layout), [s.layout]);
  const { width, depth, ceilingHeight } = s.layout.room;
  if (!s.panelOpen) {
    return <button className="panel-toggle closed" onClick={() => s.set({ panelOpen: true })}>☰ {t('panel')}</button>;
  }
  return (
    <aside className="panel" aria-label={t('panel')}>
      <button className="panel-toggle" onClick={() => s.set({ panelOpen: false })} aria-label={t('close')}>×</button>
      <section>
        <h3>{t('room')}</h3>
        <NumberField testId="room-width" label={t('width')} value={width} {...ROOM_LIMITS.width} onChange={(v) => s.setRoomSize({ width: v })} />
        <NumberField testId="room-depth" label={t('depth')} value={depth} {...ROOM_LIMITS.depth} onChange={(v) => s.setRoomSize({ depth: v })} />
        <NumberField testId="room-height" label={t('height')} value={ceilingHeight} {...ROOM_LIMITS.height} onChange={(v) => s.setRoomSize({ height: v })} />
        <p className="meta">{t('area')}: <strong>{(width * depth).toFixed(1)} m²</strong></p>
        <p className="note">{t('assumed')}</p>
        {outside.length > 0 && (
          <p className="warn" data-testid="outside-warning">⚠ {outside.length} {t('itemsOutside')}</p>
        )}
        <button onClick={s.resetRoom}>{t('resetRoom')}</button>
      </section>
      <section>
        <h3>{t('layers')}</h3>
        <label className="row">
          <span>{t('walls')}</span>
          <select value={s.wallMode} onChange={(e) => s.set({ wallMode: e.target.value as WallMode })}>
            {(['cutaway', 'solid', 'transparent', 'hidden'] as const).map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </select>
        </label>
        <label className="row">
          <span>{t('ceiling')}</span>
          <select value={s.ceilingMode} onChange={(e) => s.set({ ceilingMode: e.target.value as CeilingMode })}>
            {(['auto', 'on', 'off'] as const).map((m) => <option key={m} value={m}>{t(m)}</option>)}
          </select>
        </label>
        <Check label={t('furniture')} checked={s.showFurniture} onChange={(v) => s.set({ showFurniture: v })} />
        <Check label={t('wallItems')} checked={s.showWallItems} onChange={(v) => s.set({ showWallItems: v })} />
        <Check label={t('zones')} checked={s.showZones} onChange={(v) => s.set({ showZones: v })} />
        <Check label={t('grid')} checked={s.showGrid} onChange={(v) => s.set({ showGrid: v })} />
        <Check label={t('door')} checked={s.doorOpen} onChange={(v) => s.set({ doorOpen: v })} testId="door-open" />
      </section>
      <section>
        <h3>{t('walking')}</h3>
        <label className="row">
          <span>{t('eyeHeight')} <em>{s.eyeHeight.toFixed(2)} m</em></span>
          <input type="range" min={1.0} max={2.0} step={0.05} value={s.eyeHeight} onChange={(e) => s.set({ eyeHeight: +e.target.value })} />
        </label>
        <label className="row">
          <span>{t('speed')} <em>{s.walkSpeed.toFixed(1)} m/s</em></span>
          <input type="range" min={0.5} max={4} step={0.1} value={s.walkSpeed} onChange={(e) => s.set({ walkSpeed: +e.target.value })} />
        </label>
        <Check label={t('collision')} checked={s.collision} onChange={(v) => s.set({ collision: v })} />
      </section>
      <section>
        <Check label={t('autoQuality')} checked={s.autoQuality} onChange={(v) => s.set({ autoQuality: v })} />
        <Check label={t('showFps')} checked={s.showFps} onChange={(v) => s.set({ showFps: v })} />
      </section>
    </aside>
  );
}

function Check({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      <span>{label}</span>
    </label>
  );
}

function InfoCard() {
  const t = useT();
  const id = useStore((s) => s.inspected);
  const layout = useStore((s) => s.layout);
  const item = layout.items.find((i) => i.id === id);
  if (!item) return null;
  const cm = (m: number) => Math.round(m * 100);
  return (
    <div className="info-card" role="dialog" aria-label={item.label}>
      <button className="x" onClick={() => useStore.getState().set({ inspected: null })} aria-label={t('close')}>×</button>
      <h4>{item.label}</h4>
      <p>{t('size')}: {cm(item.w)} × {cm(item.d)} × {cm(item.h)} cm</p>
      <p>{t('category')}: {item.cat}</p>
      <p className="note">{t('editingLater')}</p>
    </div>
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
  const notice = useStore((s) => s.qualityNotice);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => useStore.getState().set({ qualityNotice: null }), 4000);
    return () => clearTimeout(id);
  }, [notice]);
  if (!notice) return null;
  return <div className="toast" role="status">{t(notice as TKey)}</div>;
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
          <li>{t('helpKeys')}</li>
        </ul>
        <p className="note">{t('helpNote')}</p>
        <button onClick={() => useStore.getState().set({ helpOpen: false })}>{t('close')}</button>
      </div>
    </div>
  );
}
