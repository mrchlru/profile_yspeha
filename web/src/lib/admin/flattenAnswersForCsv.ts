/** Разворачивает вложенный JSON в плоские строковые колонки для CSV. */
export function flattenAnswersForCsv(value: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  _flatten(value, prefix, out);
  return out;
}

function _flatten(value: unknown, prefix: string, out: Record<string, string>): void {
  if (value === null || value === undefined) {
    if (prefix.length > 0) {
      out[prefix] = "";
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      _flatten(item, prefix ? `${prefix}[${String(index)}]` : `[${String(index)}]`, out);
    });
    if (value.length === 0 && prefix.length > 0) {
      out[prefix] = "";
    }
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      _flatten(nested, nextPrefix, out);
    }
    return;
  }
  if (prefix.length > 0) {
    out[prefix] = String(value);
  }
}

/** Экранирует значение для CSV (RFC 4180). */
export function csvEscapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
