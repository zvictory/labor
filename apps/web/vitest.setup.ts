// Vitest's jsdom environment ships a no-op `localStorage` stub here (it logs
// `--localstorage-file was provided without a valid path` and exposes an object
// with no .clear/.setItem). The UTM util's whole job is persistence, so we give
// it a real, in-memory Storage — deterministic and independent of the jsdom
// build's storage quirks. Reset per-test via localStorage.clear() in beforeEach.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const storage = new MemoryStorage();

// Point both the bare global (used by tests) and window.localStorage (used by
// the util through `window.localStorage`) at the same instance.
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
