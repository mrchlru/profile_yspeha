import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { SurveysBrowser } from "@/components/admin/surveys/SurveysBrowser";

export default function AdminSurveysPage(): React.ReactElement {
  return (
    <AdminShell title="">
      <SurveysBrowser />
    </AdminShell>
  );
}
