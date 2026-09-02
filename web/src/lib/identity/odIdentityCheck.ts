import { formatCandidateBirthDateRu } from "@/lib/admin/buildCandidateFolderKey";
import { parseCandidateBirthDate } from "@/lib/admin/buildCandidateFolderKey";
import type {
  OdIdentityChallenge,
  OdIdentityFieldId,
  OdIdentityQuestionnaire,
} from "@/lib/identity/odIdentityTypes";

const TEXT_FIELD_IDS: ReadonlyArray<OdIdentityFieldId> = [
  "lastName",
  "firstName",
  "middleName",
  "fatherName",
];

const FIELD_LABELS: Record<OdIdentityFieldId, string> = {
  lastName: "Фамилия",
  firstName: "Имя",
  middleName: "Отчество",
  fatherName: "Имя отца",
  respondentBirthDate: "Дата рождения",
  childBirthDate: "Дата рождения ребёнка",
};

/**
 * Нормализует текст для сравнения ответов проверки личности.
 */
export function normalizeOdIdentityText(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/**
 * Проверяет, заполнена ли анкета идентичности полностью.
 */
export function isOdIdentityQuestionnaireComplete(
  questionnaire: OdIdentityQuestionnaire | null | undefined
): questionnaire is OdIdentityQuestionnaire {
  if (questionnaire === null || questionnaire === undefined) {
    return false;
  }
  if (
    questionnaire.lastName.trim().length === 0 ||
    questionnaire.firstName.trim().length === 0 ||
    questionnaire.middleName.trim().length === 0 ||
    questionnaire.fatherName.trim().length === 0 ||
    questionnaire.respondentBirthDate.length === 0
  ) {
    return false;
  }
  if (!parseCandidateBirthDate(questionnaire.respondentBirthDate)) {
    return false;
  }
  if (!questionnaire.hasChildren) {
    return true;
  }
  if (questionnaire.childrenCount < 1) {
    return false;
  }
  if (questionnaire.childrenBirthDates.length !== questionnaire.childrenCount) {
    return false;
  }
  return questionnaire.childrenBirthDates.every(
    (date) => parseCandidateBirthDate(date) !== null
  );
}

/**
 * Возвращает список полей, доступных для проверочных вопросов.
 */
export function listOdIdentityCheckFields(
  questionnaire: OdIdentityQuestionnaire
): ReadonlyArray<{ fieldId: OdIdentityFieldId; childIndex?: number }> {
  const fields: { fieldId: OdIdentityFieldId; childIndex?: number }[] = [
    { fieldId: "lastName" },
    { fieldId: "firstName" },
    { fieldId: "middleName" },
    { fieldId: "fatherName" },
    { fieldId: "respondentBirthDate" },
  ];
  if (questionnaire.hasChildren) {
    for (let index = 0; index < questionnaire.childrenCount; index += 1) {
      fields.push({ fieldId: "childBirthDate", childIndex: index });
    }
  }
  return fields;
}

/**
 * Случайно выбирает поле для проверки личности на текущем шаге теста.
 */
export function pickRandomOdIdentityField(
  questionnaire: OdIdentityQuestionnaire
): { fieldId: OdIdentityFieldId; childIndex?: number } {
  const fields = listOdIdentityCheckFields(questionnaire);
  const index = Math.floor(Math.random() * fields.length);
  return fields[index] ?? { fieldId: "lastName" };
}

/**
 * Собирает задание проверки личности по выбранному полю анкеты.
 */
export function buildOdIdentityChallenge(
  questionnaire: OdIdentityQuestionnaire,
  field: { fieldId: OdIdentityFieldId; childIndex?: number }
): OdIdentityChallenge {
  const fieldId = field.fieldId;
  const fieldLabel =
    fieldId === "childBirthDate" && field.childIndex !== undefined
      ? `${FIELD_LABELS.childBirthDate} (${String(field.childIndex + 1)})`
      : FIELD_LABELS[fieldId];

  if (TEXT_FIELD_IDS.includes(fieldId)) {
    const expectedAnswer = _textValueForField(questionnaire, fieldId);
    return {
      fieldId,
      fieldLabel,
      mode: "text",
      prompt: `Введите ${fieldLabel.toLowerCase()}, указанную в анкете`,
      expectedAnswer,
    };
  }

  const expectedIso = _dateValueForField(questionnaire, fieldId, field.childIndex);
  const birthDate = parseCandidateBirthDate(expectedIso);
  const correctLabel = birthDate ? formatCandidateBirthDateRu(birthDate) : expectedIso;

  return {
    fieldId,
    fieldLabel,
    mode: "choice",
    prompt: `Выберите ${fieldLabel.toLowerCase()}, указанную в анкете`,
    expectedAnswer: expectedIso,
    childIndex: field.childIndex,
    options: _buildDateOptions(expectedIso, correctLabel),
  };
}

/**
 * Сверяет ответ пользователя с эталоном из анкеты.
 */
export function evaluateOdIdentityAnswer(
  challenge: OdIdentityChallenge,
  rawAnswer: string
): boolean {
  const trimmed = rawAnswer.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (challenge.mode === "text") {
    return (
      normalizeOdIdentityText(trimmed) ===
      normalizeOdIdentityText(challenge.expectedAnswer)
    );
  }
  return trimmed === challenge.expectedAnswer;
}

function _textValueForField(
  questionnaire: OdIdentityQuestionnaire,
  fieldId: OdIdentityFieldId
): string {
  switch (fieldId) {
    case "lastName":
      return questionnaire.lastName.trim();
    case "firstName":
      return questionnaire.firstName.trim();
    case "middleName":
      return questionnaire.middleName.trim();
    case "fatherName":
      return questionnaire.fatherName.trim();
    default:
      return "";
  }
}

function _dateValueForField(
  questionnaire: OdIdentityQuestionnaire,
  fieldId: OdIdentityFieldId,
  childIndex?: number
): string {
  if (fieldId === "respondentBirthDate") {
    return questionnaire.respondentBirthDate;
  }
  if (fieldId === "childBirthDate" && childIndex !== undefined) {
    return questionnaire.childrenBirthDates[childIndex] ?? "";
  }
  return "";
}

function _buildDateOptions(
  correctIso: string,
  correctLabel: string
): ReadonlyArray<{ id: string; label: string }> {
  const correct = parseCandidateBirthDate(correctIso);
  const distractors = new Set<string>();
  if (correct !== null) {
    const offsets = [-120, -37, 45, 90, 180, 365, -730];
    for (const days of offsets) {
      const shifted = new Date(correct.getTime());
      shifted.setUTCDate(shifted.getUTCDate() + days);
      const iso = shifted.toISOString().slice(0, 10);
      if (iso !== correctIso) {
        distractors.add(iso);
      }
    }
  }
  while (distractors.size < 3) {
    const year = 1970 + Math.floor(Math.random() * 35);
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    const iso = `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso !== correctIso) {
      distractors.add(iso);
    }
  }
  const options = [
    { id: correctIso, label: correctLabel },
    ...[...distractors].slice(0, 3).map((iso) => {
      const date = parseCandidateBirthDate(iso);
      return {
        id: iso,
        label: date ? formatCandidateBirthDateRu(date) : iso,
      };
    }),
  ];
  return _shuffleOptions(options);
}

function _shuffleOptions<T>(items: ReadonlyArray<T>): ReadonlyArray<T> {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j] as T;
    copy[j] = tmp as T;
  }
  return copy;
}
