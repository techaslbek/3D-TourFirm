import { CATALOG, CATEGORIES, catalogFor } from '../core/catalog';
import { modelKind } from '../core/furniture';
import { DEFAULT_FINISHES, DEFAULT_LIGHTING, type FloorFinish } from '../core/types';
import { FLOOR_FINISHES } from '../scene/materials';
import { useStore } from '../state/store';
import { Check, ColorField, NumberField } from './controls';
import { useT, type TKey } from './i18n';

/** Design tab: furniture catalogue, room finishes, lighting and snapping. */
export function DesignTab() {
  const t = useT();
  const s = useStore();
  const finishes = s.layout.finishes ?? DEFAULT_FINISHES;
  const lighting = s.layout.lighting ?? DEFAULT_LIGHTING;
  return (
    <>
      <section>
        <h3>{t('addFurniture')}</h3>
        <p className="note">{t('addHint')}</p>
        {CATEGORIES.map((c) => {
          const entries = CATALOG.filter((e) => e.cat === c.id);
          if (!entries.length) return null;
          return (
            <details key={c.id} className="cat">
              <summary>{c.label} <span className="count">{entries.length}</span></summary>
              <ul className="catalog">
                {entries.map((e) => (
                  <li key={e.id}>
                    <button data-catalog={e.id} onClick={() => s.addItem(e.id)} title={e.note}>
                      <span>{e.label}</span>
                      <small>{Math.round(e.W * 100)}×{Math.round(e.D * 100)} cm · ${e.priceUsd}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>
      <section>
        <h3>{t('finishes')}</h3>
        <label className="row">
          <span>{t('floorFinish')}</span>
          <select id="floor-finish" value={finishes.floor} onChange={(e) => s.setFinishes({ floor: e.target.value as FloorFinish })}>
            {FLOOR_FINISHES.map((f) => <option key={f} value={f}>{t(`floor.${f}` as TKey)}</option>)}
          </select>
        </label>
        <ColorField id="wall-color" label={t('wallColor')} value={finishes.wall} onChange={(c) => s.setFinishes({ wall: c })} />
        <ColorField id="feature-color" label={t('featureColor')} value={finishes.feature} onChange={(c) => s.setFinishes({ feature: c })} />
        <ColorField id="ceiling-color" label={t('ceilingColor')} value={finishes.ceiling} onChange={(c) => s.setFinishes({ ceiling: c })} />
      </section>
      <section>
        <h3>{t('lightingTitle')}</h3>
        <NumberField testId="light-warmth" label={t('warmth')} value={lighting.warmth} min={2200} max={5000} step={100} unit="K" onChange={(v) => s.setLighting({ warmth: v })} />
        <NumberField testId="light-brightness" label={t('brightness')} value={lighting.brightness} min={0.4} max={1.6} step={0.05} unit="×" onChange={(v) => s.setLighting({ brightness: v })} />
      </section>
      <section>
        <h3>{t('snapping')}</h3>
        <label className="row">
          <span>{t('gridStep')}</span>
          <select id="grid-step" value={s.grid} onChange={(e) => s.set({ grid: +e.target.value })}>
            <option value={0}>{t('gridOff')}</option>
            <option value={0.01}>1 cm</option>
            <option value={0.05}>5 cm</option>
            <option value={0.1}>10 cm</option>
            <option value={0.25}>25 cm</option>
          </select>
        </label>
        <Check label={t('snapWalls')} checked={s.snapWalls} onChange={(v) => s.set({ snapWalls: v })} />
      </section>
    </>
  );
}

/** Floating inspector for the selected item. */
export function Inspector() {
  const t = useT();
  const s = useStore();
  const item = s.layout.items.find((i) => i.id === s.selected);
  if (!item || s.cameraMode === 'walk') return null;
  const entry = catalogFor(item, modelKind(item));
  const options = CATALOG.filter((c) => c.cat === item.cat || c.kind === entry?.kind);
  const price = entry ? s.budget.prices[entry.id]?.usd ?? entry.priceUsd : undefined;
  const cm = (m: number) => Math.round(m * 100);
  return (
    <div className="inspector" role="dialog" aria-label={item.label} data-testid="inspector">
      <div className="insp-head">
        <input id="item-name" className="text title" value={item.label} maxLength={60} aria-label={t('name')}
          onChange={(e) => s.patchItem(item.id, { label: e.target.value }, `label:${item.id}`)} />
        <button className="x" onClick={() => s.set({ selected: null })} aria-label={t('close')}>×</button>
      </div>
      <p className="note">{t('dragHint')}</p>
      {options.length > 1 && entry && (
        <label className="row">
          <span>{t('model')}</span>
          <select id="item-model" value={entry.id} onChange={(e) => s.swapSelected(e.target.value)}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label} ({cm(o.W)}×{cm(o.D)})</option>)}
          </select>
        </label>
      )}
      <div className="grid2">
        <NumberField testId="item-x" label={`${t('position')} X`} value={item.x} min={-5} max={25} step={0.05} slider={false} onChange={(v) => s.moveItem(item.id, v, item.y)} />
        <NumberField testId="item-y" label={`${t('position')} Y`} value={item.y} min={-5} max={25} step={0.05} slider={false} onChange={(v) => s.moveItem(item.id, item.x, v)} />
      </div>
      <div className="grid3">
        <NumberField testId="item-w" label="W" value={item.w} min={0.05} max={6} step={0.05} slider={false} onChange={(v) => s.resizeSelected({ w: v })} />
        <NumberField testId="item-d" label="D" value={item.d} min={0.05} max={6} step={0.05} slider={false} onChange={(v) => s.resizeSelected({ d: v })} />
        <NumberField testId="item-h" label="H" value={item.h} min={0.01} max={3} step={0.05} slider={false} onChange={(v) => s.resizeSelected({ h: v })} />
      </div>
      <div className="btn-row">
        <span className="lbl">{t('rotate')}</span>
        <button data-testid="rotate-left" onClick={() => s.rotateSelected(-1)} title="[">⟲ 90°</button>
        <button data-testid="rotate-right" onClick={() => s.rotateSelected(1)} title="]">⟳ 90°</button>
      </div>
      <ColorField id="item-color" label={t('colour')} value={item.color} onChange={(c) => s.patchItem(item.id, { color: c }, `color:${item.id}`)}
        onReset={item.color ? () => s.patchItem(item.id, { color: undefined }) : undefined} resetLabel={t('resetColour')} />
      <div className="btn-row">
        <button data-testid="duplicate" onClick={s.duplicateSelected} title="Ctrl+D">{t('duplicate')}</button>
        <button data-testid="toggle-hide" onClick={() => s.patchItem(item.id, { hidden: !item.hidden })}>{item.hidden ? t('showItem') : t('hideItem')}</button>
        <button data-testid="delete" className="danger" onClick={s.deleteSelected} title="Delete">{t('remove')}</button>
      </div>
      {entry && (
        <p className="note">
          {t('pricePlaceholder')}: <strong>${price}</strong>{entry.note ? ` · ${entry.note}` : ''}
        </p>
      )}
    </div>
  );
}
