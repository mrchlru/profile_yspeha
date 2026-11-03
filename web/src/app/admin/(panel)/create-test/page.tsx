import React, { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { CreateTestPanel } from "@/components/admin/CreateTestPanel";

export default function AdminCreateTestPage(): React.ReactElement {
  return (
    <AdminShell title="Создать тестирование">
      <Suspense fallback={<p className="text-[#5F5E5E]">Загрузка…</p>}>
        <CreateTestPanel />
      </Suspense>
    </AdminShell>
  );
}
