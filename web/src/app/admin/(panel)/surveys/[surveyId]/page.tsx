import React from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { SurveyEditorPageClient } from "@/components/admin/surveys/SurveyEditorPageClient";

type PageProps = {
  params: Promise<{ surveyId: string }>;
};

export default async function AdminSurveyEditorPage(props: PageProps): Promise<React.ReactElement> {
  const { surveyId } = await props.params;
  return (
    <AdminShell title="">
      <SurveyEditorPageClient surveyId={surveyId} />
    </AdminShell>
  );
}
