/**
 * Registry for in-memory state that has not been written yet (debounced
 * autosave). Route loaders call `flushPendingWrites()` before reading storage
 * so they never observe stale data during navigation.
 */
const pendingFlushes = new Set<() => void>();

export function registerPendingWrite(flush: () => void): () => void {
  pendingFlushes.add(flush);
  return () => pendingFlushes.delete(flush);
}

export function flushPendingWrites(): void {
  for (const flush of pendingFlushes) flush();
}
