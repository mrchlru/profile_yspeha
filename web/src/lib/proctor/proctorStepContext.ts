import { TEST_KIND_LABELS } from "@/lib/access/testKinds";
import { getAuditStepBySlug, getAuditStepByIndex } from "@/lib/audit/auditSteps";
import { getAuditStepDevTitle } from "@/lib/audit/auditStepDevTitles";
import { getAuditBatteryById } from "@/lib/audit/auditBatteries";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useFormStore } from "@/store/useFormStore";

export type ProctorStepContext = {
  stepLabel: string;
  routePath: string;
};

const SCREENING_STEP_LABELS: Readonly<Record<number, string>> = {
  1: "КОТ (50 заданий)",
  2: "Мотивация и ценности",
  3: "Личностный опросник",
  4: "ПРОФ СБ + образование",
};

/**
 * Определяет подпись текущего шага/теста для метаданных прокторинга (только в браузере).
 */
export function readProctorStepContext(): ProctorStepContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const path = window.location.pathname;
  const activeTestKind = useFormStore.getState().activeTestKind;
  const testPrefix =
    activeTestKind !== null ? (TEST_KIND_LABELS[activeTestKind] ?? activeTestKind) : null;

  const auditSlugMatch = path.match(/^\/audit\/([^/]+)$/);
  if (auditSlugMatch) {
    const slug = auditSlugMatch[1]!;
    if (slug === "intro" || slug === "finish") {
      return null;
    }
    const step = getAuditStepBySlug(slug);
    if (step !== null) {
      const title = getAuditStepDevTitle(step.internalKey);
      const prefix = testPrefix ?? "Аудит";
      return {
        stepLabel: `${prefix} · шаг ${step.stepIndex}: ${title}`,
        routePath: path,
      };
    }
  }

  const screeningMatch = path.match(/^\/step-(\d+)$/);
  if (screeningMatch) {
    const stepNum = Number.parseInt(screeningMatch[1]!, 10);
    const stepTitle = SCREENING_STEP_LABELS[stepNum] ?? `шаг ${stepNum}`;
    const prefix = testPrefix ?? "Скрининг";
    return {
      stepLabel: `${prefix} · ${stepTitle}`,
      routePath: path,
    };
  }

  if (path.startsWith("/burnout/test")) {
    return {
      stepLabel: `${testPrefix ?? "Выгорание"} · опросник MBI`,
      routePath: path,
    };
  }

  if (path.startsWith("/prof-sb-education/test")) {
    return {
      stepLabel: `${testPrefix ?? "ПРОФ СБ"} · анкета`,
      routePath: path,
    };
  }

  const auditState = useAuditFormStore.getState();
  if (auditState.batteryId !== null && auditState.currentStep > 0) {
    const battery = getAuditBatteryById(auditState.batteryId);
    const step = getAuditStepByIndex(auditState.currentStep);
    if (battery !== null && step !== null) {
      const title = getAuditStepDevTitle(step.internalKey);
      const prefix = testPrefix ?? battery.id;
      return {
        stepLabel: `${prefix} · шаг ${step.stepIndex}: ${title}`,
        routePath: path,
      };
    }
  }

  if (testPrefix !== null) {
    return { stepLabel: testPrefix, routePath: path };
  }

  return null;
}

/**
 * Метаданные шага для события прокторинга.
 */
export function proctorStepMetadata(): Record<string, string> | undefined {
  const ctx = readProctorStepContext();
  if (ctx === null) {
    return undefined;
  }
  return {
    stepLabel: ctx.stepLabel,
    routePath: ctx.routePath,
  };
}

/**
 * Читает подпись шага из JSON metadata события.
 */
export function proctorStepLabelFromMetadata(metadata: unknown): string | null {
  if (metadata === null || typeof metadata !== "object") {
    return null;
  }
  const stepLabel = (metadata as Record<string, unknown>).stepLabel;
  if (typeof stepLabel !== "string") {
    return null;
  }
  const trimmed = stepLabel.trim();
  return trimmed.length > 0 ? trimmed : null;
}
