/** Small shared form controls for the side panel and inspector. */

export function NumberField({ label, value, min, max, step, onChange, testId, unit = 'm', slider = true }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; testId: string; unit?: string; slider?: boolean;
}) {
  return (
    <div className="num">
      <label htmlFor={testId}>{label}</label>
      <div className="num-row">
        {slider && <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />}
        <input
          id={testId}
          data-testid={testId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(3))}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
        />
        <span className="unit">{unit}</span>
      </div>
    </div>
  );
}

export function Check({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      <span>{label}</span>
    </label>
  );
}

/** Concept palette swatches plus a free colour picker. */
export const SWATCHES = ['#f4eee4', '#e2cdae', '#d8c3a2', '#b5603f', '#d99b3a', '#2d548f', '#2a8c8c', '#6e7b4e', '#7a5233', '#3b3836'];

export function ColorField({ id, label, value, onChange, onReset, resetLabel }: {
  id: string; label: string; value: string | undefined; onChange: (c: string) => void; onReset?: () => void; resetLabel?: string;
}) {
  return (
    <div className="row">
      <span>{label}</span>
      <div className="swatches">
        {SWATCHES.map((c) => (
          <button key={c} className={`swatch ${value?.toLowerCase() === c ? 'on' : ''}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} title={c} />
        ))}
        <input id={id} type="color" value={value ?? '#cccccc'} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: custom`} />
        {onReset && <button className="small" onClick={onReset}>{resetLabel}</button>}
      </div>
    </div>
  );
}
