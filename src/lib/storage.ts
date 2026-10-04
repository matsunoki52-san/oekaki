/**
 * 塗りかけの絵を IndexedDB に自動保存（台紙IDごとに PNG Blob を1枚）
 */
const DB = 'nurie';
const STORE = 'paintings';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const loadPainting = (id: string) =>
  tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>).catch(() => undefined);

export const savePainting = (id: string, blob: Blob) =>
  tx('readwrite', (s) => s.put(blob, id)).catch(() => undefined);

export const deletePainting = (id: string) => tx('readwrite', (s) => s.delete(id)).catch(() => undefined);

export const listPaintingIds = () =>
  tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
    .then((k) => k.map(String))
    .catch(() => [] as string[]);
