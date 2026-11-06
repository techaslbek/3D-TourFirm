import { useEffect, useMemo, useRef, useState } from 'react';
import { parseProject } from '../core/project';
import { checkAccess, findConflicts, type AccessResult } from '../core/validate';
import { deleteVersion, listVersions, loadVersion, saveVersion, type VersionRecord } from '../state/persist';
import { useStore } from '../state/store';
import { useT } from './i18n';

/** Project tab: named versions (browser storage), JSON export/import, start again. */
export function ProjectTab() {
  const t = useT();
  const name = useStore((s) => s.projectName);
  const set = useStore((s) => s.set);
  const [versions, setVersions] = useState<VersionRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const refresh = () => listVersions().then(setVersions).catch(() => setVersions([]));
  useEffect(() => { refresh(); }, []);
  const toast = (notice: string) => set({ notice });

  const save = async () => {
    setError(null);
    try {
      const s = useStore.getState();
      await saveVersion(s.projectName || 'Untitled', s.toProject(s.projectName || 'Untitled'));
      toast(`${t('saved')}: ${s.projectName}`);
      refresh();
    } catch {
      setError(t('storageError'));
    }
  };
  const load = async (id: string) => {
    const rec = await loadVersion(id).catch(() => undefined);
    if (!rec) return;
    try {
      useStore.getState().loadProject(parseProject(rec.data));
      toast(`${t('loaded')}: ${rec.name}`);
    } catch (e) {
      setError(`${t('importError')}: ${(e as Error).message}`);
    }
  };
  const remove = async (id: string) => {
    if (confirm !== id) { setConfirm(id); return; }
    setConfirm(null);
    await deleteVersion(id).catch(() => undefined);
    refresh();
  };
  const json = () => JSON.stringify(useStore.getState().toProject(), null, 2);
  const download = () => {
    const blob = new Blob([json()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(name || 'office-design').replace(/[^\w\- ]+/g, '').trim() || 'office-design'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const copy = async () => {
    const text = json();
    try {
      await navigator.clipboard.writeText(text);
      toast(t('copied'));
      setExportText(null);
    } catch {
      setExportText(text);
      setError(t('copyFailed'));
    }
  };
  const importText = (text: string) => {
    setError(null);
    try {
      const data = parseProject(JSON.parse(text));
      useStore.getState().loadProject(data);
      toast(`${t('loaded')}: ${data.name}`);
      setPaste('');
    } catch (e) {
      setError(`${t('importError')}: ${e instanceof SyntaxError ? 'the text is not valid JSON.' : (e as Error).message}`);
    }
  };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => importText(String(r.result));
    r.readAsText(f);
  };

  return (
    <>
      <section>
        <h3>{t('projectTitle')}</h3>
        <label className="row" htmlFor="project-name">
          <span>{t('projectName')}</span>
          <input id="project-name" data-testid="project-name" className="text" maxLength={80} value={name} onChange={(e) => set({ projectName: e.target.value })} />
        </label>
        <button data-testid="save-version" className="primary" onClick={save}>{t('saveVersion')}</button>
        <p className="note">{t('autosaveNote')}</p>
        {error && <p className="warn" role="alert">{error}</p>}
      </section>
      <section>
        <h3>{t('savedVersions')}</h3>
        {versions === null ? <p className="note">…</p> : versions.length === 0 ? <p className="note">{t('noVersions')}</p> : (
          <ul className="versions" data-testid="versions">
            {versions.map((v) => (
              <li key={v.id}>
                <div>
                  <strong>{v.name}</strong>
                  <small>{new Date(v.savedAt).toLocaleString()} · {v.data.layout.items.length} items</small>
                </div>
                <button onClick={() => load(v.id)}>{t('load')}</button>
                <button className="danger" onClick={() => remove(v.id)}>{confirm === v.id ? t('confirmReset') : t('deleteVersion')}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3>JSON</h3>
        <div className="btn-row">
          <button onClick={download}>{t('exportJson')}</button>
          <button data-testid="copy-json" onClick={copy}>{t('copyJson')}</button>
          <button onClick={() => file.current?.click()}>{t('importJson')}</button>
          <input ref={file} id="import-file" type="file" accept="application/json,.json" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <p className="note">{t('exportNote')}</p>
        {exportText && <textarea readOnly className="json" value={exportText} onFocus={(e) => e.target.select()} aria-label="JSON" />}
        <label className="row" htmlFor="paste-json">
          <span>{t('pasteJson')}</span>
          <textarea id="paste-json" data-testid="paste-json" className="json" value={paste} onChange={(e) => setPaste(e.target.value)} />
        </label>
        <button data-testid="import-pasted" disabled={!paste.trim()} onClick={() => importText(paste)}>{t('importPasted')}</button>
      </section>
      <section>
        <button className="danger" data-testid="reset-design" onClick={() => {
          if (confirm !== '__reset__') { setConfirm('__reset__'); return; }
          setConfirm(null);
          useStore.getState().resetDesign();
        }}>{confirm === '__reset__' ? t('confirmReset') : t('resetDesign')}</button>
      </section>
    </>
  );
}

/** Live collision list plus an on-demand access check. */
export function ChecksSection() {
  const t = useT();
  const layout = useStore((s) => s.layout);
  const doorOpen = useStore((s) => s.doorOpen);
  const set = useStore((s) => s.set);
  const c = useMemo(() => findConflicts(layout), [layout]);
  const [access, setAccess] = useState<AccessResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setAccess(null), [layout]);
  const label = (id: string) => layout.items.find((i) => i.id === id)?.label ?? id;
  const pick = (id: string) => set({ selected: id });
  const Item = ({ id }: { id: string }) => <button className="link" onClick={() => pick(id)}>{label(id)}</button>;
  const run = () => {
    setBusy(true);
    setTimeout(() => { setAccess(checkAccess(layout, doorOpen)); setBusy(false); }, 30);
  };
  const tight = access?.filter((a) => a.tight && !a.comfortable) ?? [];
  const blocked = access?.filter((a) => !a.tight) ?? [];
  return (
    <section data-testid="checks">
      <h3>{t('checks')}</h3>
      {c.count === 0 ? <p className="ok">✓ {t('noConflicts')}</p> : (
        <ul className="issues">
          {c.overlaps.map(([a, b]) => <li key={`${a}-${b}`}><Item id={a} /> {t('conflictOverlap')} <Item id={b} /></li>)}
          {c.outside.map((id) => <li key={`o-${id}`}><Item id={id} /> {t('conflictOutside')}</li>)}
          {c.partition.map((id) => <li key={`p-${id}`}><Item id={id} /> {t('conflictPartition')}</li>)}
          {c.doorSwing.map((id) => <li key={`d-${id}`}><Item id={id} /> {t('conflictDoor')}</li>)}
          {c.entrance.map((id) => <li key={`e-${id}`}><Item id={id} /> {t('conflictEntrance')}</li>)}
        </ul>
      )}
      <button data-testid="access-check" onClick={run} disabled={busy}>{busy ? '…' : t('accessCheck')}</button>
      {access && (
        <div className="access" data-testid="access-result">
          {blocked.length === 0 && tight.length === 0 && <p className="ok">✓ {t('accessAllOk')}</p>}
          {blocked.length > 0 && (<><p className="warn">{t('accessBlocked')}</p><ul className="issues">{blocked.map((a) => <li key={a.id}><Item id={a.id} /></li>)}</ul></>)}
          {tight.length > 0 && (<><p className="amber">{t('accessTight')}</p><ul className="issues">{tight.map((a) => <li key={a.id}><Item id={a.id} /></li>)}</ul></>)}
        </div>
      )}
      <p className="note">{t('checksNote')}</p>
    </section>
  );
}
