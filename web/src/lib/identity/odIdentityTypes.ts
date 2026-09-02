/** Поля анкеты идентичности для батареи ОД / кадрового резерва. */
export type OdIdentityFieldId =
  | "lastName"
  | "firstName"
  | "middleName"
  | "fatherName"
  | "respondentBirthDate"
  | "childBirthDate";

/** Анкета идентичности перед тестированием (только ОД / кадровый резерва). */
export type OdIdentityQuestionnaire = {
  lastName: string;
  firstName: string;
  middleName: string;
  fatherName: string;
  respondentBirthDate: string;
  hasChildren: boolean;
  childrenCount: number;
  childrenBirthDates: ReadonlyArray<string>;
  completedAt: string;
};

export type OdIdentityChallengeMode = "text" | "choice";

/** Задание проверки личности при переходе к вопросам теста. */
export type OdIdentityChallenge = {
  fieldId: OdIdentityFieldId;
  fieldLabel: string;
  mode: OdIdentityChallengeMode;
  prompt: string;
  /** Для mode=choice — варианты (один верный). */
  options?: ReadonlyArray<{ id: string; label: string }>;
  /** ISO YYYY-MM-DD или нормализованный текст для сверки на клиенте. */
  expectedAnswer: string;
  childIndex?: number;
};

export type OdIdentityCheckOutcome = "passed" | "wrong" | "timeout" | "empty";
