"use client";

import { useParams } from "next/navigation";
import React from "react";

import { InterviewFolderDetailPanel } from "@/components/admin/InterviewFolderDetailPanel";

/**
 * Страница папки вакансии (узкий экран / прямой URL).
 */
export function InterviewFolderDetailView(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.folderKey ?? ""));

  return <InterviewFolderDetailPanel folderKey={folderKey} />;
}
