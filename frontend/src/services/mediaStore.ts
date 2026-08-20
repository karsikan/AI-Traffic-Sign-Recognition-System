/**
 * Photos and voice notes from the incident recorder, kept on this device.
 *
 * localStorage is the wrong place for these — it holds about 5 MB and only strings, and
 * a single phone photo would fill a good part of that. IndexedDB stores blobs directly
 * and its quota is measured in hundreds of megabytes, so that is what this uses.
 *
 * Nothing is uploaded. That matters more here than anywhere else in the app: these files
 * are photographs of a crash scene, of the other driver's licence, and recordings of a
 * conversation with a police officer. They belong to the person who took them.
 *
 * Because browser storage can be cleared, the incident page also offers a download —
 * evidence that may end up in a claim or a complaint should exist as real files too.
 */

const DB_NAME = "roadsafety-media";
const DB_VERSION = 1;
const STORE = "incident_media";

export interface MediaRecord {
  id: string;
  incident_id: number;
  media_type: "photo" | "audio" | "video";
  blob: Blob;
  original_name: string;
  size_bytes: number;
  created_at: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        // Everything is read per incident, so that is the index worth having
        store.createIndex("incident_id", "incident_id", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      })
  );
}

export const mediaStore = {
  async available(): Promise<boolean> {
    try {
      const db = await open();
      db.close();
      return true;
    } catch {
      return false;
    }
  },

  async add(incidentId: number, type: MediaRecord["media_type"], blob: Blob,
            name?: string): Promise<MediaRecord> {
    const record: MediaRecord = {
      id: `${incidentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      incident_id: incidentId,
      media_type: type,
      blob,
      original_name: name || (type === "photo" ? "photo.jpg" : "voice-note.webm"),
      size_bytes: blob.size,
      created_at: new Date().toISOString(),
    };
    await tx("readwrite", (store) => store.put(record));
    return record;
  },

  async listFor(incidentId: number): Promise<MediaRecord[]> {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const index = transaction.objectStore(STORE).index("incident_id");
      const request = index.getAll(incidentId);
      request.onsuccess = () => resolve(request.result as MediaRecord[]);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  },

  async removeFor(incidentId: number): Promise<void> {
    const rows = await this.listFor(incidentId);
    for (const row of rows) {
      await tx("readwrite", (store) => store.delete(row.id));
    }
  },

  async remove(id: string): Promise<void> {
    await tx("readwrite", (store) => store.delete(id));
  },

  /** Roughly how much has been stored, for a page that wants to say so. */
  async totalBytes(): Promise<number> {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).getAll();
      request.onsuccess = () =>
        resolve((request.result as MediaRecord[]).reduce((sum, r) => sum + (r.size_bytes || 0), 0));
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  },
};

/** An object URL for showing a stored blob. Revoke it when the view goes away. */
export function blobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Save one stored file to the device's downloads, so it survives a cleared browser. */
export function downloadMedia(record: MediaRecord): void {
  const url = URL.createObjectURL(record.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `incident-${record.incident_id}-${record.original_name}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a moment to start before the URL is invalidated
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
