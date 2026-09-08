import { formatSectarianismPercent } from "@/lib/audit/report/computeSectarianismScores";

/**
 * Краткая подпись значения для тултипа сектантства (клиентский дашборд).
 */
export function formatDashboardSectarianPercent(value: number): string {
  return `${formatSectarianismPercent(value)}%`;
}
