import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { CreateTestPanel } from "@/components/admin/CreateTestPanel";

export default function AdminCreateTestPage(): React.ReactElement {
  return (
    <AdminShell title="Создать тестирование">
      <CreateTestPanel />
    </AdminShell>
  );
}
