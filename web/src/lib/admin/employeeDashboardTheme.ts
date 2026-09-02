/** Палитра дашборда — в тон зелёного бренда приложения (#00B596). */
export const DASHBOARD_CHART_COLORS = {
  brand: "#00B596",
  brandDark: "#007A68",
  brandLight: "#B8F0E6",
  blue: "#4A90D9",
  amber: "#E9A319",
  coral: "#E07A5F",
  slate: "#8C8C8C",
  danger: "#C71F1F",
  dangerSoft: "#FDE8E8",
  warningSoft: "#FEF3C7",
  text: "#5F5E5E",
  textMuted: "#8C8C8C",
  grid: "#E5E5E5",
  card: "rgba(255,255,255,0.85)",
  /** Текущий (свежий) период — синий акцент макета. */
  current: "#4A90D9",
  /** Предыдущий период — красный акцент макета. */
  previous: "#C71F1F",
} as const;

/** Циклические цвета серий для круговых и столбчатых диаграмм. */
export const DASHBOARD_SERIES_COLORS: ReadonlyArray<string> = [
  DASHBOARD_CHART_COLORS.brand,
  DASHBOARD_CHART_COLORS.brandDark,
  DASHBOARD_CHART_COLORS.blue,
  DASHBOARD_CHART_COLORS.amber,
  DASHBOARD_CHART_COLORS.coral,
  DASHBOARD_CHART_COLORS.slate,
];

/** Возвращает цвет серии по индексу. */
export function dashboardSeriesColor(index: number): string {
  return DASHBOARD_SERIES_COLORS[index % DASHBOARD_SERIES_COLORS.length] ?? DASHBOARD_CHART_COLORS.brand;
}

/** Цвет уровня по нормализованной шкале 0..100. */
export function dashboardLevelColor(percent: number): string {
  if (percent < 30) {
    return DASHBOARD_CHART_COLORS.danger;
  }
  if (percent < 50) {
    return DASHBOARD_CHART_COLORS.amber;
  }
  if (percent < 70) {
    return DASHBOARD_CHART_COLORS.blue;
  }
  return DASHBOARD_CHART_COLORS.brand;
}
