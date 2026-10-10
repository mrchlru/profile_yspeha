"use client";

import React, { useState } from "react";

import { Button } from "@/components/Button";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { stripManagerActionsHeading } from "@/lib/ai/clampAiPlainText";

type AdminReportAiConclusionSectionProps = {
  conclusionText: string | null;
  managerActions: string | null;
  conclusionGeneratedAt: string | null;
  folderKey: string;
  sessionId: string;
  generateApiPath: string;
  onRegenerated: () => void | Promise<void>;
};

/**
 * Блок заключения ИИ в админ-отчёте с кнопкой перегенерации.
 */
export function AdminReportAiConclusionSection({
  conclusionText,
  managerActions,
  conclusionGeneratedAt,
  folderKey,
  sessionId,
  generateApiPath,
  onRegenerated,
}: AdminReportAiConclusionSectionProps): React.ReactElement {
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasConclusion =
    (conclusionText !== null && conclusionText.trim().length > 0) ||
    (managerActions !== null && managerActions.trim().length > 0);

  async function handleGenerate(): Promise<void> {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(generateApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderKey, sessionId }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setMessage(body.error ?? "Не удалось сгенерировать заключение.");
        return;
      }
      setMessage("Заключение обновлено.");
      await onRegenerated();
    } catch {
      setMessage("Сеть недоступна.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className={`space-y-4 px-6 py-5 sm:px-8 ${adminPanelCardClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={adminPanelSectionTitleClass}>Заключение ИИ</h3>
          {conclusionGeneratedAt ? (
            <p className={`mt-1 ${adminPanelMutedTextClass}`}>
              Сформировано: {conclusionGeneratedAt}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" disabled={generating} onClick={() => void handleGenerate()}>
          {generating ? "Генерация…" : hasConclusion ? "Перегенерировать" : "Сгенерировать заключение"}
        </Button>
      </div>

      {hasConclusion ? (
        <div className="space-y-4 rounded-2xl border border-[#007A68]/20 bg-gradient-to-br from-[#F0FAF7] to-white/90 px-5 py-5">
          {conclusionText ? (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#3D3D3D]">
              {conclusionText}
            </p>
          ) : null}
          {managerActions ? (
            <div className="rounded-xl border border-black/8 bg-white/80 px-4 py-3">
              <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#007A68]">
                Кратко для руководителя
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#5F5E5E]">
                {stripManagerActionsHeading(managerActions)}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={`${adminPanelMutedTextClass}`}>Заключение ИИ ещё не сформировано.</p>
      )}

      {message ? (
        <p className="text-[13px] font-medium text-[#5F5E5E]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
