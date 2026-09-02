import type { ReactElement, ReactNode } from "react";

/**
 * Маршруты теста на выгорание (Маслач).
 */
export default function BurnoutRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return <>{children}</>;
}
