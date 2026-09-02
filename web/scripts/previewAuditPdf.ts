/**
 * Локальная проверка PDF-шаблона аудита: npx tsx scripts/previewAuditPdf.ts
 */
import { writeFileSync } from "fs";
import path from "path";

import { buildAuditReportJson } from "../src/lib/audit/report/buildAuditReportData";
import { buildAuditManagerBrief } from "../src/lib/audit/report/buildAuditManagerBrief";
import { generateAuditPdfBuffer } from "../src/lib/report/generateAuditPdf";
import { buildAnswersForAllSteps, makeRng } from "./autoFillAudit";

async function main(): Promise<void> {
  const previewAnswers = buildAnswersForAllSteps(makeRng(42)).answers;

  const testBlocks = buildAuditReportJson({
    answers: previewAnswers,
    previous: null,
    aiDraft: {
      conclusion: null,
      yearOverYearDynamics: null,
      generatedAt: null,
      structured: null,
    },
    deliveryDraft: { emailSent: false, pdfGenerated: true },
  }).testBlocks;

  const report = buildAuditReportJson({
    answers: previewAnswers,
    previous: null,
    aiDraft: {
      conclusion:
        "Участник демонстрирует умеренный уровень эмоционального истощения. " +
        "Рекомендуется мониторинг нагрузки и поддержка восстановительных практик. " +
        "По остальным блокам профиль сбалансирован; отдельное внимание — динамике MBI.",
      yearOverYearDynamics: "Снижение эмоционального истощения на 2 пункта.",
      generatedAt: new Date().toISOString(),
      structured: null,
    },
    deliveryDraft: { emailSent: false, pdfGenerated: true },
  });
  report.managerBrief = buildAuditManagerBrief(
    testBlocks,
    report.narrativeSections,
    "Сейчас преобладает рациональный стиль решений при умеренном риске выгорания. " +
      "Мотивация стабильна, лояльность организации средняя. " +
      "Рекомендуется ежегодный контроль динамики IQ и показателей выгорания."
  );

  const buf = await generateAuditPdfBuffer({
    fullName: "Автотестов Иван",
    sessionId: "preview-session-id",
    report,
  });

  const out = path.resolve(process.cwd(), "audit-preview.pdf");
  writeFileSync(out, buf);
  console.log(
    `[previewAuditPdf] ${String(report.narrativeSections.length)} секций, ${String(buf.length)} bytes → ${out}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
