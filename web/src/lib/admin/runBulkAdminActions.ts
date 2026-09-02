export type BulkAdminActionResult = {
  succeeded: number;
  failed: number;
  lastError: string | null;
};

/**
 * Выполняет одно действие для каждого id; продолжает при ошибках отдельных элементов.
 */
export async function runBulkAdminActions(
  ids: ReadonlyArray<string>,
  handler: (id: string) => Promise<void>
): Promise<BulkAdminActionResult> {
  let succeeded = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (const id of ids) {
    try {
      await handler(id);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      lastError = error instanceof Error ? error.message : "Не удалось выполнить действие.";
    }
  }

  return { succeeded, failed, lastError };
}
