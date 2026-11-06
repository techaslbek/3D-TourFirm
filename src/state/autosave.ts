import { parseProject } from '../core/project';
import { AUTOSAVE_ID, loadVersion, saveVersion } from './persist';
import { debug } from '../debug';
import { useStore } from './store';

/**
 * Restores the last working design on start-up and saves it again (debounced) after changes,
 * so a refresh or closed tab never loses work. Add ?fresh=1 to the URL to start from Concept A.
 */
export async function startAutosave() {
  let fresh = false;
  try { fresh = new URLSearchParams(location.search).get('fresh') === '1'; } catch { /* no location */ }
  if (!fresh) {
    try {
      const rec = await loadVersion(AUTOSAVE_ID);
      if (rec) {
        const data = parseProject(rec.data);
        useStore.getState().loadProject(data);
      }
    } catch { /* nothing saved yet, or storage blocked */ }
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  const flush = () => {
    clearTimeout(timer);
    pending = false;
    return saveVersion('Autosave', useStore.getState().toProject(), AUTOSAVE_ID).then(() => undefined).catch(() => undefined);
  };
  debug.flushAutosave = flush;
  // Save straight away when the tab is hidden or closed, so a quick close never loses the last edit.
  const onHide = () => { if (pending) void flush(); };
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onHide(); });
  useStore.subscribe((s, prev) => {
    if (s.layout === prev.layout && s.budget === prev.budget && s.brandName === prev.brandName
      && s.brandTagline === prev.brandTagline && s.destinations === prev.destinations && s.projectName === prev.projectName) return;
    clearTimeout(timer);
    pending = true;
    timer = setTimeout(() => { void flush(); }, 800);
  });
}
