import { useMemo } from 'react';
import { computeBudget, type ExtraLine } from '../core/budget';
import { useStore } from '../state/store';
import { useT } from './i18n';

const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const uzs = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} UZS`;

/** Budget tab: furniture counted from the design plus editable other costs, in USD and UZS. */
export function BudgetTab() {
  const t = useT();
  const layout = useStore((s) => s.layout);
  const budget = useStore((s) => s.budget);
  const set = useStore((s) => s.set);
  const result = useMemo(() => computeBudget(layout, budget), [layout, budget]);
  const setPrice = (id: string, patch: { usd?: number; verified?: boolean }) => {
    const cur = budget.prices[id] ?? { usd: result.lines.find((l) => l.catalogId === id)?.unitUsd ?? 0, verified: false };
    set({ budget: { ...budget, prices: { ...budget.prices, [id]: { ...cur, ...patch } } } });
  };
  const setExtra = (id: string, patch: Partial<ExtraLine>) =>
    set({ budget: { ...budget, extras: budget.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) } });
  const diff = result.totalUsd - budget.targetUsd;
  const groups = [...new Set(result.lines.map((l) => l.group))];
  return (
    <>
      <section>
        <h3>{t('budgetTitle')}</h3>
        <div className="totals" data-testid="budget-total">
          <div><span>{t('subtotal')}</span><strong>{usd(result.subtotalUsd)}</strong></div>
          <div><span>{t('contingency')} {budget.contingencyPct}%</span><strong>{usd(result.contingencyUsd)}</strong></div>
          <div className="big"><span>{t('grandTotal')}</span><strong>{usd(result.totalUsd)}</strong><small>{uzs(result.totalUsd * budget.rate)}</small></div>
          <div className={diff > 0 ? 'over' : 'under'}>
            <span>{t('target')} {usd(budget.targetUsd)}</span>
            <strong>{usd(Math.abs(diff))} {diff > 0 ? t('overBy') : t('underBy')}</strong>
          </div>
          <div><span>{Math.round(result.verifiedShare * 100)}% {t('verifiedShare')}</span></div>
        </div>
        <div className="grid3">
          <label className="num"><span>{t('target')} $</span>
            <input id="budget-target" type="number" min={0} step={100} value={budget.targetUsd} onChange={(e) => set({ budget: { ...budget, targetUsd: Math.max(0, +e.target.value || 0) } })} />
          </label>
          <label className="num"><span>{t('contingency')} %</span>
            <input id="budget-contingency" type="number" min={0} max={50} step={1} value={budget.contingencyPct} onChange={(e) => set({ budget: { ...budget, contingencyPct: Math.min(50, Math.max(0, +e.target.value || 0)) } })} />
          </label>
          <label className="num"><span>{t('rate')}</span>
            <input id="budget-rate" type="number" min={1} step={10} value={budget.rate} onChange={(e) => set({ budget: { ...budget, rate: Math.max(1, +e.target.value || 1) } })} />
          </label>
        </div>
        <p className="note">{t('budgetNote')}</p>
      </section>
      {groups.map((g) => (
        <section key={g}>
          <h3>{g === 'Furniture' ? t('furnitureFromLayout') : g}</h3>
          <div className="table-wrap">
            <table className="budget">
              <thead>
                <tr><th>{t('name')}</th><th>{t('qty')}</th><th>{t('unit')}</th><th>{t('total')}</th><th title={t('verified')}>✓</th></tr>
              </thead>
              <tbody>
                {result.lines.filter((l) => l.group === g).map((l) => {
                  const extraId = l.key.startsWith('x:') ? l.key.slice(2) : null;
                  return (
                    <tr key={l.key} className={l.verified ? 'ok' : ''}>
                      <td>{l.label}</td>
                      <td>
                        {extraId
                          ? <input aria-label={`${l.label} ${t('qty')}`} type="number" min={0} step={1} value={l.qty} onChange={(e) => setExtra(extraId, { qty: Math.max(0, +e.target.value || 0) })} />
                          : l.qty}
                      </td>
                      <td>
                        <input aria-label={`${l.label} ${t('unit')}`} type="number" min={0} step={5} value={l.unitUsd}
                          onChange={(e) => (extraId ? setExtra(extraId, { unitUsd: Math.max(0, +e.target.value || 0) }) : setPrice(l.catalogId!, { usd: Math.max(0, +e.target.value || 0) }))} />
                      </td>
                      <td className="num-cell">{usd(l.totalUsd)}</td>
                      <td>
                        <input aria-label={`${l.label} ${t('verified')}`} type="checkbox" checked={l.verified}
                          onChange={(e) => (extraId ? setExtra(extraId, { verified: e.target.checked }) : setPrice(l.catalogId!, { verified: e.target.checked }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
