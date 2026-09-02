import React, { Suspense } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { EmployeeFolderFileViewer } from "@/components/admin/EmployeeFolderFileViewer";

export default function AdminEmployeeFolderFilePage(): React.ReactElement {
  return (
    <AdminShell title="Просмотр файла" description="Файл в папке сотрудника">
      <Suspense fallback={<p className="text-[#8C8C8C]">Загрузка файла…</p>}>
        <EmployeeFolderFileViewer />
      </Suspense>
    </AdminShell>
  );
}
