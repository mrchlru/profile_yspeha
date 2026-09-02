import {
  PROCTOR_EVENT_IDENTITY_CHECK_FAILED,
  PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT,
  PROCTOR_EVENT_KIND_LABELS,
  identityCheckFieldLabelFromMetadata,
  type ProctorEventKind,
} from "@/lib/proctor/proctorEventKinds";

/**
 * Формирует подпись нарушения проверки личности для отчёта HR.
 */
export function formatIdentityCheckEventLabel(
  kind: ProctorEventKind,
  metadata: unknown
): string {
  const fieldLabel = identityCheckFieldLabelFromMetadata(metadata);
  const base = PROCTOR_EVENT_KIND_LABELS[kind] ?? kind;
  if (fieldLabel === null) {
    return base;
  }
  if (kind === PROCTOR_EVENT_IDENTITY_CHECK_FAILED) {
    return `${base}: ${fieldLabel}`;
  }
  if (kind === PROCTOR_EVENT_IDENTITY_CHECK_TIMEOUT) {
    return `${base}: ${fieldLabel}`;
  }
  return base;
}
