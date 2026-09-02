import { writeFileSync } from "fs";

import { packReportExportDocx, reportDocxParagraph } from "@/lib/admin/reportExportDocxShell";

async function main(): Promise<void> {
  const buf = await packReportExportDocx("Тест", [reportDocxParagraph("Абзац")]);
  writeFileSync("test-export.docx", buf);
  console.log("written", buf.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
