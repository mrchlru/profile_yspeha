import {
  AUDIT_REPORT_VERSION,
  type AuditReportMetrics,
} from "@/lib/audit/report/auditReportTypes";

/**
 * Достаёт плоские метрики из уже сохранённого JSON отчёта (для YoY / дашборда).
 * Вынесено из buildAuditReportData, чтобы клиентский UI не тянул OpenAI-цепочку.
 */
export function extractMetricsFromStoredAuditReport(
  json: unknown
): AuditReportMetrics | null {
  if (json === null || typeof json !== "object") {
    return null;
  }
  const rec = json as { version?: unknown; metrics?: unknown };
  if (rec.version !== AUDIT_REPORT_VERSION) {
    return null;
  }
  if (rec.metrics === null || typeof rec.metrics !== "object") {
    return null;
  }
  return rec.metrics as AuditReportMetrics;
}
