import type { ProjectData } from '../core/project';

/*
 * Local persistence in the browser's IndexedDB (no server, no account). Named design versions
 * plus one autosave slot. Every call fails soft: in a private window or where storage is
 * blocked, saving reports an error message instead of crashing, and JSON export still works.
 */

const DB = 'tourfirm-office-sandbox';
const STORE = 'versions';
export const AUTOSAVE_ID = '__autosave__';

export interface VersionRecord { id: string; name: string; savedAt: string; data: ProjectData }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Could not open browser storage'));
    } catch (e) {
      reject(e instanceof Error ? e : new Error('Browser storage is not available'));
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Storage request failed'));
    t.oncomplete = () => db.close();
  });
}

export async function saveVersion(name: string, data: ProjectData, id?: string): Promise<VersionRecord> {
  const rec: VersionRecord = { id: id ?? `v-${Date.now().toString(36)}`, name, savedAt: data.savedAt, data };
  await tx('readwrite', (s) => s.put(rec));
  return rec;
}

export async function listVersions(): Promise<VersionRecord[]> {
  const all = await tx<VersionRecord[]>('readonly', (s) => s.getAll() as IDBRequest<VersionRecord[]>);
  return all.filter((v) => v.id !== AUTOSAVE_ID).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function loadVersion(id: string): Promise<VersionRecord | undefined> {
  return tx<VersionRecord | undefined>('readonly', (s) => s.get(id) as IDBRequest<VersionRecord | undefined>);
}

export async function deleteVersion(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}
