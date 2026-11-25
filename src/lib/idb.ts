// Tiny IndexedDB blob store for voice recordings (too large for localStorage).
const DB = 'kindred-media', STORE = 'blobs';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function putBlob(key: string, blob: Blob) {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(blob, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function getBlob(key: string): Promise<Blob | undefined> {
  try {
    const db = await open();
    return await new Promise((res, rej) => { const r = db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => res(r.result as Blob | undefined); r.onerror = () => rej(r.error); });
  } catch { return undefined; }
}
export async function deleteBlob(key: string) {
  try { const db = await open(); db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key); } catch { /* ignore */ }
}
