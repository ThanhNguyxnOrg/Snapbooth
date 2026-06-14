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
  stickers: any[];
  created: number;
  image: string; // rendered PNG dataUrl
  captionFont?: string;
  grain?: number;
  vignette?: number;
}

const DB_NAME = "snapbooth-db";
const STORE_NAME = "rolls";

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
