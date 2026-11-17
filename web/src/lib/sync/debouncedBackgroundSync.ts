const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingFns = new Map<string, () => void>();

/**
 * Откладывает фоновый sync, чтобы не слать запрос на каждый символ/клик.
 */
export function debouncedBackgroundSync(
  key: string,
  fn: () => void,
  delayMs: number = 2000
): void {
  pendingFns.set(key, fn);
  const existing = timers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
  }
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      const run = pendingFns.get(key);
      pendingFns.delete(key);
      run?.();
    }, delayMs)
  );
}

/**
 * Снимает отложенный sync без выполнения.
 */
export function flushBackgroundSync(key: string): void {
  const existing = timers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
    timers.delete(key);
  }
  pendingFns.delete(key);
}

/**
 * Немедленно выполняет отложенный sync (например, перед переходом на следующий шаг).
 */
export function runPendingBackgroundSync(key: string): void {
  const existing = timers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
    timers.delete(key);
  }
  const run = pendingFns.get(key);
  pendingFns.delete(key);
  run?.();
}