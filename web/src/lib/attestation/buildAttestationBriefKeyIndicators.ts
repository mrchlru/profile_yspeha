import {
  MANAGEMENT_POTENTIAL_SCALE_LABELS,
  MINI_IPIP_FACTOR_LABELS,
  scoreBandLabel,
} from "@/lib/attestation/attestationLabels";
import type { AttestationBriefKeyIndicatorRow } from "@/lib/attestation/attestationBriefReportTypes";
import type { AttestationComputedScores } from "@/lib/attestation/computeAttestationScores";

/**
 * Таблица «Ключевые показатели» — детерминированно, в формате эталона HRD.
 */
export function buildAttestationBriefKeyIndicators(
  scores: AttestationComputedScores
): AttestationBriefKeyIndicatorRow[] {
  const rows: AttestationBriefKeyIndicatorRow[] = [];

  const conscientiousness = scores.miniIpip.Conscientiousness;
  rows.push({
    indicator: MINI_IPIP_FACTOR_LABELS.Conscientiousness,
    result: _miniIpipResult(conscientiousness),
    meaning: _conscientiousnessMeaning(conscientiousness),
  });

  const extraversion = scores.miniIpip.Extraversion;
  rows.push({
    indicator: MINI_IPIP_FACTOR_LABELS.Extraversion,
    result: _miniIpipResult(extraversion),
    meaning: _extraversionMeaning(extraversion),
  });

  const agreeableness = scores.miniIpip.Agreeableness;
  rows.push({
    indicator: MINI_IPIP_FACTOR_LABELS.Agreeableness,
    result: _miniIpipResult(agreeableness),
    meaning: _agreeablenessMeaning(agreeableness),
  });

  const decision = _managementScore(scores, "decision_making");
  if (decision) {
    rows.push({
      indicator: MANAGEMENT_POTENTIAL_SCALE_LABELS.decision_making,
      result: _managementResult(decision.sum, decision.band),
      meaning: _decisionMeaning(decision.band),
    });
  }

  const delegation = _managementScore(scores, "delegation");
  const leadership = _managementScore(scores, "team_leadership");
  if (delegation && leadership) {
    const same = delegation.sum === leadership.sum && delegation.band === leadership.band;
    rows.push({
      indicator: "Лидерство и делегирование",
      result: same
        ? _managementResult(delegation.sum, delegation.band)
        : `${MANAGEMENT_POTENTIAL_SCALE_LABELS.delegation} ${_managementShort(delegation.sum)}, ${MANAGEMENT_POTENTIAL_SCALE_LABELS.team_leadership.toLowerCase()} ${_managementShort(leadership.sum)}`,
      meaning:
        delegation.band === "high" || leadership.band === "high"
          ? "Лидерский ресурс в текущей роли, вероятно, не полностью используется"
          : "Ограниченный запас на распределение задач и ведение команды",
    });
  }

  const neuroticism = scores.miniIpip.Neuroticism;
  const traitAnxiety = scores.spielberger.find((row) => row.scale === "trait");
  rows.push({
    indicator: "Нейротизм / личностная тревожность",
    result: traitAnxiety
      ? `${_miniIpipShort(neuroticism)} / ${String(traitAnxiety.total)} — ${scoreBandLabel(traitAnxiety.band).toLowerCase()}`
      : _miniIpipResult(neuroticism),
    meaning: "Внешне ровная, внутри — фон переживаний об ошибках и оценке",
  });

  const personalCbi = scores.cbi.find((row) => row.scale === "personal");
  const workCbi = scores.cbi.find((row) => row.scale === "work");
  if (personalCbi && workCbi) {
    rows.push({
      indicator: "Выгорание (CBI)",
      result: `${Number(personalCbi.mean.toFixed(0))} и ${workCbi.mean.toFixed(1).replace(".", ",")} — ${scoreBandLabel(personalCbi.band).toLowerCase()}`,
      meaning:
        personalCbi.band === "low"
          ? "По самоотчёту не выгорела"
          : "Есть признаки истощения — проверить нагрузку и восстановление",
    });
  }

  const signCount = scores.klimovDdo.human_sign_system ?? 0;
  rows.push({
    indicator: "Интерес к знаковым системам (ДДО)",
    result: `${String(signCount)} из 8 — ${signCount <= 2 ? "низкий" : signCount <= 5 ? "средний" : "высокий"}`,
    meaning:
      signCount <= 2
        ? "Цифры и документы — наименее интересная для неё сфера"
        : "Формальная отчётность и таблицы воспринимаются нейтрально или позитивно",
  });

  if (scores.luscher) {
    rows.push({
      indicator: "Люшер, вегетативный коэффициент",
      result: scores.luscher.vk.toFixed(2).replace(".", ","),
      meaning:
        scores.luscher.vk >= 0.75
          ? "Компенсированная усталость (слабый сигнал)"
          : "Без выраженного сигнала скрытого истощения",
    });
  }

  return rows;
}

function _managementScore(
  scores: AttestationComputedScores,
  scale: "decision_making" | "delegation" | "team_leadership"
) {
  return scores.managementPotential.find((row) => row.scale === scale);
}

function _miniIpipShort(score: number): string {
  return `${String(score)} из 20`;
}

function _miniIpipResult(score: number): string {
  const band =
    score <= 10 ? "низкий" : score <= 14 ? "средний" : "высокий";
  return `${_miniIpipShort(score)} — ${band}`;
}

function _managementShort(sum: number): string {
  return `${String(sum)}/25`;
}

function _managementResult(sum: number, band: "low" | "mid" | "high"): string {
  const edge = sum === 11 ? " (на границе)" : "";
  return `${String(sum)} из 25 — ${scoreBandLabel(band).toLowerCase()}${edge}`;
}

function _conscientiousnessMeaning(score: number): string {
  if (score >= 15) {
    return "Порядок, точность, сроки — главная опора";
  }
  if (score >= 11) {
    return "Достаточная дисциплина при контрольных точках";
  }
  return "Риск срыва сроков и неточностей без внешней структуры";
}

function _extraversionMeaning(score: number): string {
  if (score >= 15) {
    return "Нужен живой контакт; одиночная работа с таблицами «разряжает»";
  }
  if (score >= 11) {
    return "Комфорт и в команде, и в самостоятельной работе";
  }
  return "Лучше работает в спокойном режиме, без постоянного общения";
}

function _agreeablenessMeaning(score: number): string {
  if (score >= 15) {
    return "Кооперативна, но мягкость избирательная";
  }
  if (score >= 11) {
    return "Умеренная готовность к сотрудничеству";
  }
  return "Может спорить и отстаивать жёсткую позицию";
}

function _decisionMeaning(band: "low" | "mid" | "high"): string {
  if (band === "low") {
    return "В неясных ситуациях ищет подтверждение";
  }
  if (band === "high") {
    return "Может принимать решения самостоятельно в знакомых рамках";
  }
  return "Решает, когда правила понятны; в серой зоне — согласует";
}
