import { sanitizeForAiInput } from "@/lib/ai/sanitizeForAi";
import { ROSENZWEIG_SITUATIONS } from "@/lib/attestation/attestationQuestions";
import type { AttestationAnswers } from "@/lib/attestation/attestationQuestions";

/**
 * Собирает контекст ситуаций и ответов Розенцвейга для LLM-кодирования.
 */
export function buildRosenzweigCodingContext(input: {
  personName: string;
  answers: AttestationAnswers;
}): string {
  const safeName = sanitizeForAiInput(input.personName, 120);
  const situations = ROSENZWEIG_SITUATIONS.map((situation) => {
    const raw = input.answers[situation.id];
    const answerText =
      typeof raw === "string" ? sanitizeForAiInput(raw.trim(), 800) : "";
    return {
      id: situation.id,
      situationKind: situation.situationKind,
      situationText: situation.text,
      answerText: answerText.length > 0 ? answerText : "(пустой ответ)",
    };
  });

  return JSON.stringify(
    {
      participantName: safeName,
      method: "Rosenzweig frustration (organizational adaptation)",
      codingScheme: "direction E|I|M × reaction OD|ED|NP",
      situations,
    },
    null,
    2
  );
}
