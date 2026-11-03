import { Manrope } from "next/font/google";
import React from "react";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * Область конструктора опросов: шрифт и фон как в макете.
 */
export default function SurveysAdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <div className={`survey-constructor-scope ${manrope.className}`}>{children}</div>;
}
