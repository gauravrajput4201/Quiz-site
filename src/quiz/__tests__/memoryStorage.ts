import type { StorageBackend } from '../services/quizStorage';

export class MemoryBackend implements StorageBackend {
  readonly store = new Map<string, string>();
  writes = 0;
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.writes += 1;
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}
