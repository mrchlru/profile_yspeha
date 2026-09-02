import type { AuditReportManagerTrafficLight } from "@/lib/audit/report/auditReportTypes";

export type MaslachTrafficLightStyle = {
  text: string;
  bg: string;
  ring: string;
};

/**
 * Классы Tailwind для цветовой индикации уровня по шкале Маслач (блок для руководителя).
 */
export function maslachManagerTrafficLightStyle(
  light: AuditReportManagerTrafficLight
): MaslachTrafficLightStyle {
  switch (light) {
    case "green":
      return {
        text: "text-emerald-800",
        bg: "bg-emerald-50",
        ring: "ring-emerald-200",
      };
    case "yellow":
      return {
        text: "text-yellow-900",
        bg: "bg-yellow-50",
        ring: "ring-yellow-200",
      };
    case "orange":
      return {
        text: "text-orange-900",
        bg: "bg-orange-50",
        ring: "ring-orange-200",
      };
    case "red":
      return {
        text: "text-red-800",
        bg: "bg-red-50",
        ring: "ring-red-200",
      };
    default:
      return {
        text: "text-[#5F5E5E]",
        bg: "bg-white/70",
        ring: "ring-black/5",
      };
  }
}
