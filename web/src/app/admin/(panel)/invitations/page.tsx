import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { InvitationsTable } from "@/components/admin/InvitationsTable";

export default function AdminInvitationsPage(): React.ReactElement {
  return (
    <AdminShell
      title="Приглашения"
      description="Коды доступа и их текущее состояние"
    >
      <InvitationsTable />
    </AdminShell>
  );
}
