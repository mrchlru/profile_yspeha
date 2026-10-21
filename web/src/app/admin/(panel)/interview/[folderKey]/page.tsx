import { redirect } from "next/navigation";
import React from "react";

type AdminInterviewFolderPageProps = {
  params: { folderKey: string };
};

/** Прямые ссылки на папку ведут на единый экран «Собеседование». */
export default function AdminInterviewFolderPage({
  params,
}: AdminInterviewFolderPageProps): React.ReactElement {
  const folderKey = decodeURIComponent(params.folderKey);
  redirect(`/admin/interview?folder=${encodeURIComponent(folderKey)}`);
}
