"use client";

import type { ReactElement, ReactNode } from "react";
import { AuditDevStepNavLayer } from "@/components/audit/AuditDevStepNavLayer";
import { useAuditDevNavEnabled } from "@/hooks/useAuditDevNavEnabled";

export default function AuditRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  const devNav = useAuditDevNavEnabled();

  return (
    <div className={devNav ? "pb-[120px] sm:pb-28" : undefined}>
      {children}
      <AuditDevStepNavLayer />
    </div>
  );
}
