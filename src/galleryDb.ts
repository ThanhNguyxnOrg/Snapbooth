export interface StickerData {
  id: string;
  type: "svg" | "text";
  value: string;
  color?: string;
  fontSize?: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  font?: string;
}

export interface SavedRoll {
  id: string;
  layout: string;
  frame: string;
  filter: string;
  photos: string[];
  caption: string;
  note: string;
  textScale: number;
  timestamp: string;
  stickers: StickerData[];
  created: number;
  image: string; // rendered PNG dataUrl
  captionFont?: string;
  grain?: number;
  vignette?: number;
}

const DB_NAME = "snapbooth-db";
const STORE_NAME = "rolls";

// Keep at most this many developed rolls; the oldest are pruned on save so
// the store (and the base64 images inside) cannot grow without bound.
export const MAX_ROLLS = 12;

// Reuse one connection instead of opening a new one per call.
let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  // A future schema change elsewhere invalidates this connection.
  dbPromise.then((db) => {
    db.onversionchange = () => {
      db.close();
      dbPromise = null;
    };
  }).catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

export async function saveRoll(roll: SavedRoll): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(roll);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllRolls(): Promise<SavedRoll[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result as SavedRoll[];
      // Sort by created descending (newest first)
      results.sort((a, b) => b.created - a.created);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRoll(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Delete oldest rolls beyond `max` so storage stays bounded.
export async function pruneRolls(max: number = MAX_ROLLS): Promise<void> {
  const db = await getDb();
  // Cheap count check first — avoid deserializing every roll's base64
  // images unless the store is actually over the cap.
  const count = await new Promise<number>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (count <= max) return;
  const rolls = await getAllRolls();
  const excess = rolls.slice(max); // rolls are sorted newest-first
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    excess.forEach((roll) => store.delete(roll.id));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
