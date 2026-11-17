"use client";

import type { ReactElement, ReactNode } from "react";
import { AuditDevStepNavLayer } from "@/components/audit/AuditDevStepNavLayer";
import { TestSessionUiChrome } from "@/components/TestSessionUiChrome";
import { useAuditDevNavEnabled } from "@/hooks/useAuditDevNavEnabled";

export default function AuditRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  const devNav = useAuditDevNavEnabled();

  return (
    <div className={devNav ? "pb-[120px] sm:pb-28" : undefined}>
      <TestSessionUiChrome />
      {children}
      <AuditDevStepNavLayer />
    </div>
  );
}
