// Local-only storage: IndexedDB for tracks + audio blobs. Nothing leaves the device.
export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string | undefined;
  duration?: number | undefined;
  cover?: Blob | undefined;
  addedAt: number;
  mime: string;
};

const DB = "neon-player";
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("tracks", { keyPath: "id" });
      r.result.createObjectStore("files");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return open().then(
    (db) =>
      new Promise<T>((res, rej) => {
        const req = fn(db.transaction(store, mode).objectStore(store));
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      }),
  );
}

export const db = {
  allTracks: () => tx<Track[]>("tracks", "readonly", (s) => s.getAll() as IDBRequest<Track[]>),
  putTrack: (t: Track) => tx("tracks", "readwrite", (s) => s.put(t)),
  putFile: (id: string, b: Blob) => tx("files", "readwrite", (s) => s.put(b, id)),
  getFile: (id: string) => tx<Blob | undefined>("files", "readonly", (s) => s.get(id)),
  remove: async (id: string) => {
    await tx("tracks", "readwrite", (s) => s.delete(id));
    await tx("files", "readwrite", (s) => s.delete(id));
  },
};