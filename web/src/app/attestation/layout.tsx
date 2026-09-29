import type { ReactElement, ReactNode } from "react";

/**
 * Маршруты аттестации управляющих / шеф-поваров.
 */
export default function AttestationRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return <>{children}</>;
}
