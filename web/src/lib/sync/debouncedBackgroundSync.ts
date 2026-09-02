const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Откладывает фоновый sync, чтобы не слать запрос на каждый символ/клик.
 */
export function debouncedBackgroundSync(
  key: string,
  fn: () => void,
  delayMs: number = 2000
): void {
  const existing = timers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
  }
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      fn();
    }, delayMs)
  );
}

/**
 * Немедленный sync (например, при завершении шага).
 */
export function flushBackgroundSync(key: string): void {
  const existing = timers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
    timers.delete(key);
  }
}
