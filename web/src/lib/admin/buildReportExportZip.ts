import { zipSync } from "fflate";

export type ReportExportZipEntry = {
  fileName: string;
  data: Buffer;
};

/**
 * Упаковывает отчёты в ZIP (сжатие DEFLATE).
 */
export function buildReportExportZip(entries: ReadonlyArray<ReportExportZipEntry>): Buffer {
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    files[entry.fileName] = new Uint8Array(entry.data);
  }
  const zipped = zipSync(files, { level: 6 });
  return Buffer.from(zipped);
}
