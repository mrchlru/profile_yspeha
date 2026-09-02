import type { Step4Data } from "@/lib/step4/step4Types";

/**
 * Подставляет имя и фамилию из старта аудита, если в анкете они ещё пустые.
 */
export function prefillStep4PersonalFromAuditNames(
  step4: Step4Data,
  firstName: string,
  lastName: string
): Step4Data {
  const nextFirst = step4.personal.firstName.trim().length > 0
    ? step4.personal.firstName
    : firstName.trim();
  const nextLast = step4.personal.lastName.trim().length > 0
    ? step4.personal.lastName
    : lastName.trim();
  if (
    nextFirst === step4.personal.firstName &&
    nextLast === step4.personal.lastName
  ) {
    return step4;
  }
  return {
    ...step4,
    personal: {
      ...step4.personal,
      firstName: nextFirst,
      lastName: nextLast,
    },
  };
}
