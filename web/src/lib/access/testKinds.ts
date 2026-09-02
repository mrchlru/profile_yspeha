export const TEST_KIND_SCREENING = "screening" as const;
export const TEST_KIND_STATE_AUDIT = "state_audit" as const;
/** То же прохождение, что и «аудит состояния», плюс панель шагов; код не помечается использованным при отправке. */
export const TEST_KIND_STATE_AUDIT_DEV = "state_audit_dev" as const;
export const TEST_KIND_AUDIT_SENIOR = "audit_senior" as const;
export const TEST_KIND_AUDIT_MIDDLE = "audit_middle" as const;
export const TEST_KIND_BURNOUT = "burnout" as const;
/** ПРОФ СБ + ПРОФ образование — комплексная анкета (две части). */
export const TEST_KIND_PROF_SB_EDUCATION = "prof_sb_education" as const;

export type TestKind =
  | typeof TEST_KIND_SCREENING
  | typeof TEST_KIND_STATE_AUDIT
  | typeof TEST_KIND_STATE_AUDIT_DEV
  | typeof TEST_KIND_AUDIT_SENIOR
  | typeof TEST_KIND_AUDIT_MIDDLE
  | typeof TEST_KIND_BURNOUT
  | typeof TEST_KIND_PROF_SB_EDUCATION;

export const TEST_KIND_LABELS: Record<TestKind, string> = {
  screening: "Скрининг кандидата",
  state_audit: "Техтест (legacy, не для приглашений)",
  state_audit_dev: "Техтест / dev (legacy)",
  audit_senior: "ТУ, шефы и управляющие",
  audit_middle: "ОД и кадровый резерв",
  burnout: "Тест на выгорание",
  prof_sb_education: "ПРОФ СБ + ПРОФ образование",
};

/** Подпись типа прохождения в админке (таблица audit_submission, не отдельный продукт «аудит»). */
export const ADMIN_EMPLOYEE_ASSESSMENT_LABEL = "ОД, ТУ и кадровый резерв";

const ALL_TEST_KINDS: ReadonlyArray<TestKind> = [
  TEST_KIND_SCREENING,
  TEST_KIND_STATE_AUDIT,
  TEST_KIND_STATE_AUDIT_DEV,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_BURNOUT,
  TEST_KIND_PROF_SB_EDUCATION,
];

export function isTestKind(value: string): value is TestKind {
  return (ALL_TEST_KINDS as ReadonlyArray<string>).includes(value);
}

/** Тесты, для которых при создании приглашения нужны данные сотрудника. */
export const INVITE_CANDIDATE_TEST_KINDS: ReadonlyArray<TestKind> = [
  TEST_KIND_SCREENING,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_BURNOUT,
  TEST_KIND_PROF_SB_EDUCATION,
];

/**
 * Тесты с выбором сотрудника из архива скрининга или созданием нового.
 */
export const INVITE_EMPLOYEE_PICK_TEST_KINDS: ReadonlyArray<TestKind> = [
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_BURNOUT,
  TEST_KIND_PROF_SB_EDUCATION,
];

export function testKindRequiresInviteCandidate(testKind: string): boolean {
  return (INVITE_CANDIDATE_TEST_KINDS as ReadonlyArray<string>).includes(testKind);
}

export function testKindSupportsEmployeePick(testKind: string): boolean {
  return (INVITE_EMPLOYEE_PICK_TEST_KINDS as ReadonlyArray<string>).includes(testKind);
}

/** Имя и фамилия берутся из приглашения, а не вводятся на экране intro. */
export function testKindUsesInviteAssesseeName(testKind: string): boolean {
  return testKindRequiresInviteCandidate(testKind);
}

/** Доступ к маршрутам `/audit/*` и отправка ответов аудита. */
export function isAuditAccessTestKind(kind: TestKind | null | undefined): boolean {
  return (
    kind === TEST_KIND_SCREENING ||
    kind === TEST_KIND_STATE_AUDIT ||
    kind === TEST_KIND_STATE_AUDIT_DEV ||
    kind === TEST_KIND_AUDIT_SENIOR ||
    kind === TEST_KIND_AUDIT_MIDDLE
  );
}

export function isBurnoutTestKind(kind: TestKind | null | undefined): boolean {
  return kind === TEST_KIND_BURNOUT;
}

/** Доступ к маршрутам `/prof-sb-education/*` и отправка ответов анкеты. */
export function isProfSbEducationTestKind(kind: TestKind | null | undefined): boolean {
  return kind === TEST_KIND_PROF_SB_EDUCATION;
}

/** Батареи с камерой, микрофоном и отчётом по нарушениям. */
export const PROCTOR_TEST_KINDS: ReadonlyArray<TestKind> = [
  TEST_KIND_SCREENING,
  TEST_KIND_AUDIT_SENIOR,
  TEST_KIND_AUDIT_MIDDLE,
  TEST_KIND_BURNOUT,
  TEST_KIND_PROF_SB_EDUCATION,
];

/** Нужен ли прокторинг (камера/микрофон) для типа приглашения. */
export function isProctorTestKind(kind: TestKind | null | undefined): boolean {
  return kind !== null && kind !== undefined && (PROCTOR_TEST_KINDS as ReadonlyArray<string>).includes(kind);
}

/** Техническое приглашение: панель шагов и dev-отправка. */
export function isAuditDevInvite(
  testKind: TestKind | null | undefined,
  devMode: boolean
): boolean {
  return testKind === TEST_KIND_STATE_AUDIT_DEV || devMode;
}

/**
 * После успешного `/api/audit/submit` код приглашения помечается использованным
 * для всех типов аудита, кроме техтеста `state_audit_dev`.
 */
export function shouldMarkAccessInviteUsedAfterAuditSubmit(
  testKind: TestKind
): boolean {
  return isAuditAccessTestKind(testKind) && testKind !== TEST_KIND_STATE_AUDIT_DEV;
}
