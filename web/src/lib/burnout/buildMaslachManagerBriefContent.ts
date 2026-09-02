import type {
  MaslachBurnoutInterpretation,
  MaslachEeDpLevel,
  MaslachPaLevel,
} from "@/lib/burnout/maslachBurnoutInterpretation";

/** Заголовок нарративной секции (полный отчёт HrD). */
export const MASLACH_MANAGER_SECTION_TITLE = "Тест на выгорание (Маслач)";

/** Заголовок пункта в блоке «Отчёт для руководителя». */
export const MASLACH_MANAGER_BRIEF_LINE_TITLE = "Выгорание";

export type MaslachManagerTrafficLight = "green" | "yellow" | "orange" | "red";

export type MaslachManagerScaleBrief = {
  scaleTitle: string;
  whatItMeasures: string;
  statusLabel: string;
  managerMeaning: string;
  trafficLight: MaslachManagerTrafficLight;
};

export type MaslachManagerBriefContent = {
  overallTitle: string;
  overallText: string;
  overallTrafficLight: MaslachManagerTrafficLight;
  scales: ReadonlyArray<MaslachManagerScaleBrief>;
};

/**
 * Собирает развёрнутую выжимку опросника Маслач для блока «Отчёт для руководителя»
 * (без числовых баллов, язык для неспециалиста).
 */
export function buildMaslachManagerBriefContent(
  interpretation: MaslachBurnoutInterpretation
): MaslachManagerBriefContent {
  const ee = _scaleBriefEe(interpretation.ee.level);
  const dp = _scaleBriefDp(interpretation.dp.level);
  const pa = _scaleBriefPa(interpretation.pa.level);

  const overallTrafficLight = _worstTrafficLight([
    ee.trafficLight,
    dp.trafficLight,
    pa.trafficLight,
  ]);

  return {
    overallTitle: interpretation.verdictTitle,
    overallText: _overallManagerText(interpretation),
    overallTrafficLight,
    scales: [ee, dp, pa],
  };
}

function _overallManagerText(interpretation: MaslachBurnoutInterpretation): string {
  if (interpretation.classicBurnout) {
    return (
      "По совокупности ответов видна классическая картина профессионального выгорания: " +
      "сотрудник эмоционально истощён, отстраняется от людей и задач и не чувствует " +
      "результата в работе. Это не «лень» и не слабый характер — сигнал перегрузки и " +
      "истощения ресурсов. Нужны разговор один на один, пересмотр нагрузки и опора HR."
    );
  }
  if (
    interpretation.ee.unfavorable ||
    interpretation.dp.unfavorable ||
    interpretation.pa.unfavorable
  ) {
    return (
      "Полной картины выгорания нет, но отдельные стороны состояния выходят за комфортную " +
      "норму. Имеет смысл обсудить с сотрудником условия работы, поддержку и нагрузку " +
      "до того, как симптомы усилятся."
    );
  }
  return (
    "Признаков выраженного выгорания по опроснику не видно. Сотрудник, судя по ответам, " +
    "сохраняет рабочий запас и отношение к делу. Поддерживайте текущий баланс нагрузки " +
    "и периодически сверяйтесь при изменении обстановки."
  );
}

function _scaleBriefEe(level: MaslachEeDpLevel): MaslachManagerScaleBrief {
  const base = {
    scaleTitle: "Эмоциональное истощение",
    whatItMeasures:
      "Насколько человек чувствует опустошённость, усталость от работы, «нет сил» " +
      "общаться и включаться в задачи.",
  };
  if (level === "low") {
    return {
      ...base,
      statusLabel: "Низкое — ресурс сохранён",
      managerMeaning:
        "Сотрудник не выглядит эмоционально «выжатым». Обычно это хороший знак для " +
        "стабильной работы и контакта с командой.",
      trafficLight: "green",
    };
  }
  if (level === "medium") {
    return {
      ...base,
      statusLabel: "Среднее — накопилась усталость",
      managerMeaning:
        "Появляются признаки накопленной усталости: человек может чаще уставать, " +
        "раздражаться или «отключаться». Это зона внимания — стоит проверить нагрузку, " +
        "режим и поддержку, не дожидаясь обострения.",
      trafficLight: "yellow",
    };
  }
  return {
    ...base,
    statusLabel: "Высокое — сильное истощение",
    managerMeaning:
      "Сотрудник, вероятно, на пределе эмоциональных сил: риск срывов, конфликтов, " +
      "пропусков и резкого падения качества. Нужны снижение перегрузки, восстановление " +
      "и участие HR.",
    trafficLight: "red",
  };
}

function _scaleBriefDp(level: MaslachEeDpLevel): MaslachManagerScaleBrief {
  const base = {
    scaleTitle: "Деперсонализация (отчуждение, цинизм)",
    whatItMeasures:
      "Насколько человек эмоционально отстраняется от коллег, клиентов или задач, " +
      "проявляет холодность, раздражение, «обесценивание» людей и работы.",
  };
  if (level === "low") {
    return {
      ...base,
      statusLabel: "Низкое — контакт сохранён",
      managerMeaning:
        "Сотрудник, как правило, остаётся вовлечённым в общение и не «закрывается» " +
        "от команды — это благоприятно для совместной работы.",
      trafficLight: "green",
    };
  }
  if (level === "medium") {
    return {
      ...base,
      statusLabel: "Среднее — растёт отстранённость",
      managerMeaning:
        "Могут проявляться раздражение, усталость от людей, формальное отношение к задачам. " +
        "Стоит разобрать конфликты, перегруз и качество рабочей атмосферы.",
      trafficLight: "orange",
    };
  }
  return {
    ...base,
    statusLabel: "Высокое — выраженный цинизм и отчуждение",
    managerMeaning:
      "Высок риск токсичного фона в коллективе и обесценивания работы. Важны беседа без " +
      "обвинений, пересмотр роли и нагрузки, при необходимости — помощь специалиста.",
    trafficLight: "red",
  };
}

function _scaleBriefPa(level: MaslachPaLevel): MaslachManagerScaleBrief {
  const base = {
    scaleTitle: "Профессиональные достижения (ощущение компетентности)",
    whatItMeasures:
      "Насколько человек чувствует, что справляется, приносит пользу и видит смысл " +
      "в своей работе (высокие значения — благоприятный признак).",
  };
  if (level === "high") {
    return {
      ...base,
      statusLabel: "Высокое — уверенность в своей работе",
      managerMeaning:
        "Сотрудник, как правило, ощущает результат и компетентность. Это опора для " +
        "мотивации и устойчивости к стрессу.",
      trafficLight: "green",
    };
  }
  if (level === "medium") {
    return {
      ...base,
      statusLabel: "Среднее — устойчивый, но не максимальный запас",
      managerMeaning:
        "Человек в целом держится, но может не чувствовать яркого успеха. Помогают " +
        "ясные цели, обратная связь и признание вклада.",
      trafficLight: "yellow",
    };
  }
  return {
    ...base,
    statusLabel: "Низкое — снижена самооценка в работе",
    managerMeaning:
      "Сотрудник может воспринимать себя как «не справляющегося», терять интерес и " +
      "уверенность. Нужны реалистичные цели, поддержка, обучение и исключение " +
      "постоянного давления без ресурсов.",
    trafficLight: "red",
  };
}

function _worstTrafficLight(
  lights: ReadonlyArray<MaslachManagerTrafficLight>
): MaslachManagerTrafficLight {
  const rank: Record<MaslachManagerTrafficLight, number> = {
    green: 0,
    yellow: 1,
    orange: 2,
    red: 3,
  };
  let worst: MaslachManagerTrafficLight = "green";
  for (const light of lights) {
    if (rank[light] > rank[worst]) {
      worst = light;
    }
  }
  return worst;
}
