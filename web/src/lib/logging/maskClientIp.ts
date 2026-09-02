/**
 * Маскирует IP для логов (последний октет IPv4 скрыт; IPv6 — усечённо).
 */
export function maskClientIp(ip: string): string {
  const t = ip.trim();
  if (t.includes(".")) {
    const parts = t.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    }
  }
  if (t.includes(":")) {
    const head = t.split(":").slice(0, 3).join(":");
    return `${head}:…`;
  }
  return t.length > 8 ? `${t.slice(0, 8)}…` : t;
}
