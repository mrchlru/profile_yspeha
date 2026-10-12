import type { RosenzweigCodingSummary } from "@/lib/attestation/rosenzweigCoding";

const DIRECTION_PLAIN: Record<string, { short: string; workMeaning: string }> = {
  E: {
    short: "вовне",
    workMeaning:
      "при сбоях и претензиях человек чаще смотрит на внешнюю причину: коллег, систему, обстоятельства. " +
      "Это может звучать как «виноваты другие» — важно отличать конструктивную постановку проблемы от перекладывания ответственности.",
  },
  I: {
    short: "на себя",
    workMeaning:
      "при препятствиях человек чаще берёт ситуацию на себя: винит себя, ищет, что мог сделать иначе. " +
      "Это усиливает ответственность, но при перегрузе повышает риск самобичевания, выгорания и затягивания решений.",
  },
  M: {
    short: "безлично",
    workMeaning:
      "человек чаще сглаживает ситуацию: «так вышло», «пройдёт само», без жёсткого обвинения себя или других. " +
      "Это снижает конфликтность, но иногда маскирует проблему и откладывает нужные действия.",
  },
};

const REACTION_PLAIN: Record<string, { short: string; workMeaning: string }> = {
  OD: {
    short: "фиксация на препятствии",
    workMeaning:
      "внимание застревает на самой помехе («всё из‑за этого»). Полезно для диагностики сбоя, но без следующего шага человек может крутиться вокруг проблемы, а не решения.",
  },
  ED: {
    short: "самозащита",
    workMeaning:
      "в приоритете защита «я»: оправдание, отрицание вины или, наоборот, принятие вины. Важно смотреть, не уходит ли энергия в оправдания вместо действий.",
  },
  NP: {
    short: "ориентация на решение",
    workMeaning:
      "человек быстрее переходит к «что делать»: просит помощь, берёт обязательство или ждёт, что обстоятельства позволят закрыть задачу. Это рабочий профиль для операционки — если подкреплён реальными действиями.",
  },
};

/**
 * Краткий понятный текст профиля по сводке кодирования Розенцвейга для HRD.
 */
export function buildRosenzweigProfileBlurb(
  summary: RosenzweigCodingSummary | null | undefined
): string | null {
  if (!summary || summary.codedCount === 0) {
    return null;
  }

  const topDirection = _topCategory(summary.directions);
  const topReaction = _topCategory(summary.reactions);
  if (!topDirection || !topReaction) {
    return null;
  }

  const dir = DIRECTION_PLAIN[topDirection.key];
  const react = REACTION_PLAIN[topReaction.key];
  if (!dir || !react) {
    return null;
  }

  const dirShare = Math.round(topDirection.share * 100);
  const reactShare = Math.round(topReaction.share * 100);
  const coverage = `${String(summary.codedCount)} из ${String(summary.totalSituations)}`;

  return (
    `Как человек обычно ведёт себя, когда возникает препятствие (по ${coverage} ситуациям). ` +
    `Чаще направление реакции — ${dir.short} (${String(dirShare)}%): ${dir.workMeaning} ` +
    `Тип реакции чаще — ${react.short} (${String(reactShare)}%): ${react.workMeaning} ` +
    `Для руководителя это ответ на вопросы: кого человек винит при сбое, как защищает себя и насколько быстро переходит к решению. ` +
    `Сверьте отдельные ситуации при сомнениях.`
  );
}

/**
 * Подсказки простым языком для LLM по доминирующему профилю Розенцвейга.
 */
export function buildRosenzweigManagerHints(
  summary: RosenzweigCodingSummary | null | undefined
): {
  dominantDirectionPlain: string | null;
  dominantReactionPlain: string | null;
  managerQuestions: ReadonlyArray<string>;
} {
  if (!summary || summary.codedCount === 0) {
    return {
      dominantDirectionPlain: null,
      dominantReactionPlain: null,
      managerQuestions: [
        "Как сотрудник реагирует на сбой: винит себя, других или «сглаживает»?",
        "Быстро ли переходит к решению или застревает на помехе / оправданиях?",
      ],
    };
  }

  const topDirection = _topCategory(summary.directions);
  const topReaction = _topCategory(summary.reactions);
  const dir = topDirection ? DIRECTION_PLAIN[topDirection.key] : undefined;
  const react = topReaction ? REACTION_PLAIN[topReaction.key] : undefined;

  return {
    dominantDirectionPlain: dir
      ? `${dir.short}: ${dir.workMeaning}`
      : null,
    dominantReactionPlain: react
      ? `${react.short}: ${react.workMeaning}`
      : null,
    managerQuestions: [
      "Кого человек винит при сбое — себя, других или «обстоятельства»?",
      "Это помогает доводить задачи или уводит в самобичевание / оправдания / ожидание «само рассосётся»?",
      "Можно ли опираться на него в пиковых сбоях или нужна поддержка и чёткие правила эскалации?",
    ],
  };
}

function _topCategory(
  rows: RosenzweigCodingSummary["directions"]
): { key: string; share: number } | null {
  let best: { key: string; share: number } | null = null;
  for (const row of rows) {
    if (!best || row.share > best.share) {
      best = { key: row.key, share: row.share };
    }
  }
  return best;
}
