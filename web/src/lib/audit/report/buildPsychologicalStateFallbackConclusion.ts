import type {
  PsychologicalStateIndicatorSignal,
  PsychologicalStateSignals,
} from "@/lib/audit/report/buildPsychologicalStateSignals";
import type { PsychStateIndicatorKey } from "@/lib/audit/report/odReserveManagerBriefInterpretations";

const INSUFFICIENT = "Недостаточно данных для краткого вывода.";

/**
 * Запасной синтез психологического состояния без ИИ: один связный абзац, без склейки противоречий.
 */
export function buildPsychologicalStateFallbackConclusion(
  signals: PsychologicalStateSignals
): string {
  if (signals.indicators.length === 0) {
    return INSUFFICIENT;
  }

  const problems = signals.indicators.filter((item) => _isFallbackConcern(item));
  const strengths = signals.indicators.filter(
    (item) => item.severity === "favorable" && !_isFallbackConcern(item)
  );

  if (problems.length === 0) {
    return _renderMostlyStableProfile(signals.indicators, strengths);
  }

  return _renderProblemProfile(signals.indicators, problems, strengths);
}

function _renderMostlyStableProfile(
  indicators: ReadonlyArray<PsychologicalStateIndicatorSignal>,
  strengths: ReadonlyArray<PsychologicalStateIndicatorSignal>
): string {
  const load = indicators.find((item) => item.key === "load");
  const lead =
    strengths.length > 0
      ? _shortenPhrase(strengths[0]?.referencePhrase ?? "")
      : "Существенных признаков эмоционального истощения и отчуждения не видно.";

  const parts = [lead];
  if (load !== undefined && load.docBand === "low") {
    parts.push("Рабочая нагрузка занижена — запас ресурса есть, но вовлечённость стоит контролировать.");
  } else if (load !== undefined && load.docBand === "normal") {
    parts.push("Нагрузка в комфортном диапазоне.");
  }
  return parts.join(" ");
}

function _renderProblemProfile(
  indicators: ReadonlyArray<PsychologicalStateIndicatorSignal>,
  problems: ReadonlyArray<PsychologicalStateIndicatorSignal>,
  strengths: ReadonlyArray<PsychologicalStateIndicatorSignal>
): string {
  const sentences: string[] = [];
  const critical = problems.filter((item) => item.severity === "critical");
  const core = critical.length > 0 ? critical : problems;

  const primary = _pickPrimaryProblem(core);
  if (primary !== null) {
    sentences.push(_shortenPhrase(primary.referencePhrase));
  }

  const secondary = core
    .filter((item) => item.key !== primary?.key)
    .slice(0, 2)
    .map((item) => _shortenPhrase(item.referencePhrase));
  if (secondary.length > 0) {
    sentences.push(secondary.join(" "));
  }

  const contrast = _buildContrastSentence(strengths, problems);
  if (contrast !== null) {
    sentences.push(contrast);
  }

  const load = indicators.find((item) => item.key === "load");
  if (load !== undefined) {
    if (load.docBand === "low" && problems.some((item) => item.key !== "load")) {
      sentences.push("При этом рабочая нагрузка низкая — проблема не в перегрузе, а в включённости и состоянии.");
    } else if (load.docBand === "high" || load.docBand === "critical") {
      sentences.push(_shortenPhrase(load.referencePhrase));
    }
  }

  if (critical.length > 0) {
    sentences.push("Необходима консультация с HrD.");
  }

  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function _pickPrimaryProblem(
  problems: ReadonlyArray<PsychologicalStateIndicatorSignal>
): PsychologicalStateIndicatorSignal | null {
  const priority: ReadonlyArray<PsychStateIndicatorKey> = ["ipv", "pi", "lo", "pm", "load"];
  for (const key of priority) {
    const match = problems.find((item) => item.key === key);
    if (match !== undefined) {
      return match;
    }
  }
  return problems[0] ?? null;
}

function _buildContrastSentence(
  strengths: ReadonlyArray<PsychologicalStateIndicatorSignal>,
  problems: ReadonlyArray<PsychologicalStateIndicatorSignal>
): string | null {
  if (strengths.length === 0) {
    return null;
  }
  const strength = strengths[0];
  if (strength === undefined) {
    return null;
  }
  const problemKeys = new Set(problems.map((item) => item.key));
  if (strength.key === "pm" && (problemKeys.has("lo") || problemKeys.has("pi") || problemKeys.has("ipv"))) {
    return (
      "Формальная удовлетворённость работой не компенсирует проблемы во взаимодействии и эмоциональном состоянии."
    );
  }
  if (strength.key === "pi" && problemKeys.has("lo")) {
    return "Эмоциональный ресурс сохранён, но в команде человек не удерживается.";
  }
  return null;
}

function _shortenPhrase(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Средние band по ЛО и ИПВ — управленчески значимые, не «стабильная норма». */
function _isFallbackConcern(item: PsychologicalStateIndicatorSignal): boolean {
  if (item.severity === "unfavorable" || item.severity === "critical") {
    return true;
  }
  if (item.severity !== "neutral") {
    return false;
  }
  if (item.key === "lo" && item.docBand === "mid") {
    return true;
  }
  if (item.key === "ipv" && item.docBand === "mid") {
    return true;
  }
  return false;
}
