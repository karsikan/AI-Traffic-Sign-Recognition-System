/**
 * Personal records, kept on this device.
 *
 * Fines, documents, demerit points and incidents never leave the browser. There is no
 * account and no server copy, which is the whole point: without accounts a shared
 * database would mean every driver could read every other driver's licence and NIC
 * numbers off their saved records.
 *
 * The derived values — countdowns, expiry bands, the demerit balance — still come from
 * the backend, but as a calculation over whatever the page posts. Nothing is written
 * there. See backend/app/api/routes/compute.py.
 *
 * Trade-off worth knowing: clearing browser data loses these records, and they do not
 * follow the driver to another device. The export helper below is the answer to that.
 */

const PREFIX = "roadsafety";
const VERSION = 1;

export type Collection = "fines" | "documents" | "demerit" | "incidents";

const KEYS: Record<Collection, string> = {
  fines: `${PREFIX}.fines`,
  documents: `${PREFIX}.documents`,
  demerit: `${PREFIX}.demerit`,
  incidents: `${PREFIX}.incidents`,
};

const VERSION_KEY = `${PREFIX}.version`;

export interface StoredRecord {
  id: number;
  created_at: string;
  [key: string]: any;
}

/** Whether records will actually survive a reload on this browser. */
export function isAvailable(): boolean {
  try {
    const probe = `${PREFIX}.probe`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    storageBroken = true;
    return false;
  }
}

/**
 * Private browsing, strict cookie settings and sandboxed frames all make localStorage
 * throw on access rather than simply return null. When that happens the app falls back
 * to memory: the pages still work for the session, the records just do not survive a
 * reload. Losing persistence is bad; a blank page is worse.
 */
const memory = new Map<string, string>();
let storageBroken = false;

function getItem(key: string): string | null {
  if (storageBroken) return memory.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    storageBroken = true;
    return memory.get(key) ?? null;
  }
}

function setItem(key: string, value: string): void {
  memory.set(key, value);
  if (storageBroken) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or access denied — keep going from memory
    storageBroken = true;
  }
}

/** True when records are only being held for this session, not saved. */
export function isMemoryOnly(): boolean {
  return storageBroken;
}

function read(collection: Collection): StoredRecord[] {
  try {
    const raw = getItem(KEYS[collection]);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt or unreadable — better an empty list than a page that will not render
    return [];
  }
}

function write(collection: Collection, rows: StoredRecord[]): void {
  setItem(VERSION_KEY, String(VERSION));
  setItem(KEYS[collection], JSON.stringify(rows));
  // Other tabs get a storage event for free; this one needs telling
  window.dispatchEvent(new CustomEvent("localstore:changed", { detail: { collection } }));
}

/** Ids only need to be unique within one device, so the largest so far plus one. */
function nextId(rows: StoredRecord[]): number {
  return rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
}

export const localStore = {
  list(collection: Collection): StoredRecord[] {
    return read(collection);
  },

  get(collection: Collection, id: number): StoredRecord | undefined {
    return read(collection).find((r) => r.id === id);
  },

  create(collection: Collection, payload: Record<string, any>): StoredRecord {
    const rows = read(collection);
    // Drop empty strings so the backend sees absent rather than "", which its date
    // parsing would reject.
    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== "" && v !== undefined)
    );
    const record: StoredRecord = {
      ...cleaned,
      id: nextId(rows),
      created_at: new Date().toISOString(),
    };
    write(collection, [record, ...rows]);
    return record;
  },

  update(collection: Collection, id: number, changes: Record<string, any>): StoredRecord | undefined {
    const rows = read(collection);
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    const cleaned = Object.fromEntries(
      Object.entries(changes).filter(([, v]) => v !== "" && v !== undefined)
    );
    rows[index] = { ...rows[index], ...cleaned };
    write(collection, rows);
    return rows[index];
  },

  remove(collection: Collection, id: number): boolean {
    const rows = read(collection);
    const kept = rows.filter((r) => r.id !== id);
    if (kept.length === rows.length) return false;
    write(collection, kept);
    return true;
  },

  clear(collection: Collection): void {
    write(collection, []);
  },

  clearAll(): void {
    (Object.keys(KEYS) as Collection[]).forEach((c) => write(c, []));
  },

  count(collection: Collection): number {
    return read(collection).length;
  },

  /** Everything, as a file the driver can keep or move to another device. */
  exportAll(): string {
    return JSON.stringify(
      {
        app: "RoadSafety AI",
        version: VERSION,
        exported_at: new Date().toISOString(),
        data: Object.fromEntries(
          (Object.keys(KEYS) as Collection[]).map((c) => [c, read(c)])
        ),
      },
      null,
      2
    );
  },

  /** Replaces what is stored. Returns how many records came in, or throws if unreadable. */
  importAll(json: string): Record<Collection, number> {
    const parsed = JSON.parse(json);
    const data = parsed?.data;
    if (!data || typeof data !== "object") {
      throw new Error("That file does not look like a RoadSafety export.");
    }
    const counts = {} as Record<Collection, number>;
    (Object.keys(KEYS) as Collection[]).forEach((c) => {
      const rows = Array.isArray(data[c]) ? data[c] : [];
      write(c, rows);
      counts[c] = rows.length;
    });
    return counts;
  },
};

/** Re-render when another tab, or another part of this one, changes a collection. */
export function onStoreChange(handler: () => void): () => void {
  const local = () => handler();
  const cross = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(PREFIX)) handler();
  };
  window.addEventListener("localstore:changed", local);
  window.addEventListener("storage", cross);
  return () => {
    window.removeEventListener("localstore:changed", local);
    window.removeEventListener("storage", cross);
  };
}
