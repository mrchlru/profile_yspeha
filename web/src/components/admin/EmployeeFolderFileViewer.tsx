"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DocumentViewerActionBar } from "@/components/admin/DocumentViewerActionBar";
import type { EmployeeFolderDetail } from "@/lib/admin/employeeFolderTypes";
import {
  downloadFileFromUrl,
  printHtmlFragment,
  printIframeContent,
} from "@/lib/admin/documentViewerActions";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
} from "@/lib/admin/adminPanelTheme";

/**
 * Просмотр загруженного файла в папке сотрудника.
 */
export function EmployeeFolderFileViewer(): React.ReactElement {
  const params = useParams();
  const folderKey = decodeURIComponent(String(params.employeeKey ?? ""));
  const fileId = decodeURIComponent(String(params.fileId ?? ""));
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [fileMeta, setFileMeta] = useState<EmployeeFolderDetail["uploadedFiles"][number] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = useMemo(() => {
    if (!folderKey || !fileId) {
      return null;
    }
    const query = new URLSearchParams({ folderKey });
    return `/api/admin/folder-files/${encodeURIComponent(fileId)}?${query.toString()}`;
  }, [fileId, folderKey]);

  const downloadUrl = useMemo(() => {
    if (!fileUrl) {
      return null;
    }
    return `${fileUrl}&download=1`;
  }, [fileUrl]);

  const loadFile = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/results?folderKey=${encodeURIComponent(folderKey)}`,
        { cache: "no-store" }
      );
      const body = (await res.json()) as { folder?: EmployeeFolderDetail; error?: string };
      if (!res.ok || !body.folder) {
        setError(body.error ?? "Папка не найдена.");
        setFileMeta(null);
        return;
      }
      const found = body.folder.uploadedFiles.find((item) => item.id === fileId) ?? null;
      if (!found) {
        setError("Файл не найден в папке.");
        setFileMeta(null);
        return;
      }
      setFileMeta(found);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setFileMeta(null);
    } finally {
      setLoading(false);
    }
  }, [fileId, folderKey]);

  useEffect(() => {
    if (folderKey && fileId) {
      void loadFile();
    }
  }, [fileId, folderKey, loadFile]);

  function handlePrint(): void {
    if (fileMeta?.category === "image" && fileUrl) {
      printHtmlFragment(
        fileMeta.fileName,
        `<img src="${fileUrl}" alt="${fileMeta.fileName}" style="max-width:100%;" />`
      );
      return;
    }
    printIframeContent(iframeRef.current);
  }

  function handleDownload(): void {
    if (!downloadUrl || !fileMeta) {
      return;
    }
    downloadFileFromUrl(downloadUrl, fileMeta.fileName);
  }

  if (loading) {
    return <p className={adminPanelMutedTextClass}>Загрузка файла…</p>;
  }

  if (error || !fileMeta || !fileUrl) {
    return (
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <p className="text-sm font-medium text-red-700/90">{error ?? "Файл не найден."}</p>
        <Link
          href={`/admin/results/${encodeURIComponent(folderKey)}`}
          className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
        >
          ← К папке
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#8C8C8C]">
            Просмотр файла
          </p>
          <h2 className="text-[24px] font-extrabold text-[#5F5E5E]">{fileMeta.fileName}</h2>
          <p className={`mt-1 ${adminPanelMutedTextClass}`}>{fileMeta.categoryLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DocumentViewerActionBar onPrint={handlePrint} onDownload={handleDownload} />
          <Link
            href={`/admin/results/${encodeURIComponent(folderKey)}`}
            className="rounded-full bg-[#DDDDDD] px-4 py-2 text-[14px] font-bold text-[#5F5E5E]"
          >
            ← К папке
          </Link>
        </div>
      </div>

      <div className={`overflow-hidden ${adminPanelCardClass}`}>
        <FilePreview
          category={fileMeta.category}
          fileUrl={fileUrl}
          fileName={fileMeta.fileName}
          iframeRef={iframeRef}
        />
      </div>
    </div>
  );
}

type FilePreviewProps = {
  category: string;
  fileUrl: string;
  fileName: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
};

function FilePreview({
  category,
  fileUrl,
  fileName,
  iframeRef,
}: FilePreviewProps): React.ReactElement {
  if (category === "image") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl} alt={fileName} className="max-h-[75vh] max-w-full object-contain" />
      </div>
    );
  }

  if (category === "video") {
    return (
      <div className="bg-black p-4">
        <video
          src={fileUrl}
          controls
          className="mx-auto max-h-[75vh] w-full"
          aria-label={fileName}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title={fileName}
      src={fileUrl}
      className="h-[80vh] w-full border-0 bg-white"
    />
  );
}
