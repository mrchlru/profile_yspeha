import React from "react";

import { CommissionEvalForm } from "@/components/commission/CommissionEvalForm";

type PageProps = {
  params: Promise<{ token: string }>;
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

/**
 * Публичная страница оценочного листа комиссии.
 */
export default async function CommissionEvalPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { token } = await params;
  return <CommissionEvalForm accessToken={decodeURIComponent(token)} />;
}
