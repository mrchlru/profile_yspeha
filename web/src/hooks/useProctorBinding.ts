"use client";

import {
  isAuditAccessTestKind,
  isBurnoutTestKind,
  isAttestationTestKind,
  isProfSbEducationTestKind,
  isSpecialistScreeningTestKind,
} from "@/lib/access/testKinds";
import { useAuditFormStore } from "@/store/useAuditFormStore";
import { useBurnoutFormStore } from "@/store/useBurnoutFormStore";
import { useFormStore } from "@/store/useFormStore";
import { useProfSbEducationFormStore } from "@/store/useProfSbEducationFormStore";
import { useAttestationFormStore } from "@/store/useAttestationFormStore";
import { useSpecialistScreeningFormStore } from "@/store/useSpecialistScreeningFormStore";

export type ProctorBinding = {
  sessionId: string | null;
  accessCode: string | null;
  started: boolean;
};

/**
 * Возвращает sessionId, код доступа и признак «тест уже начат» для активной батареи.
 */
export function useProctorBinding(): ProctorBinding {
  const testKind = useFormStore((s) => s.activeTestKind);

  const auditSessionId = useAuditFormStore((s) => s.sessionId);
  const auditAccessCode = useAuditFormStore((s) => s.accessCodeSnapshot);
  const maxUnlockedStep = useAuditFormStore((s) => s.maxUnlockedStep);
  const batterySequenceUnlockedThrough = useAuditFormStore(
    (s) => s.batterySequenceUnlockedThrough
  );
  const auditCurrentStep = useAuditFormStore((s) => s.currentStep);
  const auditConsent = useAuditFormStore((s) => s.personalDataConsent);

  const burnoutSessionId = useBurnoutFormStore((s) => s.sessionId);
  const burnoutAccessCode = useBurnoutFormStore((s) => s.accessCodeSnapshot);
  const burnoutConsent = useBurnoutFormStore((s) => s.personalDataConsent);

  const profSessionId = useProfSbEducationFormStore((s) => s.sessionId);
  const profAccessCode = useProfSbEducationFormStore((s) => s.accessCodeSnapshot);
  const profConsent = useProfSbEducationFormStore((s) => s.personalDataConsent);

  const specialistSessionId = useSpecialistScreeningFormStore((s) => s.sessionId);
  const specialistAccessCode = useSpecialistScreeningFormStore((s) => s.accessCodeSnapshot);
  const specialistConsent = useSpecialistScreeningFormStore((s) => s.personalDataConsent);

  const attestationSessionId = useAttestationFormStore((s) => s.sessionId);
  const attestationAccessCode = useAttestationFormStore((s) => s.accessCodeSnapshot);
  const attestationConsent = useAttestationFormStore((s) => s.personalDataConsent);

  const legacySessionId = useFormStore((s) => s.sessionId);
  const legacyAccessCode = useFormStore((s) => s.validatedAccessCode);
  const legacyConsent = useFormStore((s) => s.personalDataConsent);

  if (isAuditAccessTestKind(testKind)) {
    return {
      sessionId: auditSessionId,
      accessCode: auditAccessCode,
      started:
        auditConsent &&
        (maxUnlockedStep > 0 ||
          batterySequenceUnlockedThrough > 0 ||
          auditCurrentStep > 0),
    };
  }

  if (isBurnoutTestKind(testKind)) {
    return {
      sessionId: burnoutSessionId,
      accessCode: burnoutAccessCode,
      started: burnoutConsent && burnoutSessionId !== null,
    };
  }

  if (isProfSbEducationTestKind(testKind)) {
    return {
      sessionId: profSessionId,
      accessCode: profAccessCode,
      started: profConsent && profSessionId !== null,
    };
  }

  if (isSpecialistScreeningTestKind(testKind)) {
    return {
      sessionId: specialistSessionId,
      accessCode: specialistAccessCode,
      started: specialistConsent && specialistSessionId !== null,
    };
  }

  if (isAttestationTestKind(testKind)) {
    return {
      sessionId: attestationSessionId,
      accessCode: attestationAccessCode,
      started: attestationConsent && attestationSessionId !== null,
    };
  }

  return {
    sessionId: legacySessionId,
    accessCode: legacyAccessCode,
    started: legacyConsent && legacySessionId !== null,
  };
}
