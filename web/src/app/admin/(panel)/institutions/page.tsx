import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";

export default function AdminInstitutionsPage(): React.ReactElement {
  return (
    <AdminShell
      title="Учебные заведения и рейтинги"
      description="Справочник вузов, колледжей и школа рейтингов"
    >
      <div className={`max-w-[760px] space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <h2 className={adminPanelSectionTitleClass}>Справочник в разработке</h2>
        <p className={adminPanelMutedTextClass}>
          Здесь будет полный список учебных заведений с градацией: профильные / непрофильные,
          уровень и рейтинг. Данные будут использоваться в отчётах «ПРОФ ОБРАЗОВАНИЕ».
        </p>
        <ul className={`list-disc space-y-2 pl-5 ${adminPanelMutedTextClass}`}>
          <li>Импорт и редактирование списка вузов, колледжей, школ</li>
          <li>Рейтинги и категории для автоматической интерпретации образования</li>
          <li>Связь с папкой сотрудника в разделе результатов</li>
        </ul>
      </div>
    </AdminShell>
  );
}
