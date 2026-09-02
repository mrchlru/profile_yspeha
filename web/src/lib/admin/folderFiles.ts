import {
  folderFileCategoryLabel,
  validateFolderUploadFile,
  type FolderFileCategory,
} from "@/lib/admin/folderFilePolicy";
import { parseEmployeeFolderKey } from "@/lib/admin/employeeFolderKey";
import { getEmployeeFolderSummaryByKey } from "@/lib/admin/buildEmployeeFolders";
import { prisma } from "@/lib/prisma";

export type EmployeeFolderFileSummary = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: FolderFileCategory;
  categoryLabel: string;
  createdAt: string;
  uploadedBy: string;
};

/**
 * Проверяет, что папка существует в системе.
 */
export async function assertEmployeeFolderExists(folderKey: string): Promise<boolean> {
  const parsed = parseEmployeeFolderKey(folderKey);
  if (!parsed) {
    return false;
  }
  const summary = await getEmployeeFolderSummaryByKey(folderKey);
  return summary !== null;
}

/**
 * Список загруженных файлов папки (без бинарных данных).
 */
export async function listEmployeeFolderFiles(
  folderKey: string
): Promise<EmployeeFolderFileSummary[]> {
  const rows = await prisma.employeeFolderFile.findMany({
    where: { folderKey },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: true,
    },
  });

  return rows.map((row) => {
    const validation = validateFolderUploadFile(row.fileName, row.mimeType, row.sizeBytes);
    const category = validation.ok ? validation.category : "pdf";
    return {
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      category,
      categoryLabel: folderFileCategoryLabel(category),
      createdAt: row.createdAt.toISOString(),
      uploadedBy: row.uploadedBy,
    };
  });
}

/**
 * Сохраняет файл в папку сотрудника.
 */
export async function saveEmployeeFolderFile(
  folderKey: string,
  fileName: string,
  mimeType: string,
  data: Buffer,
  uploadedBy: string
): Promise<EmployeeFolderFileSummary> {
  const exists = await assertEmployeeFolderExists(folderKey);
  if (!exists) {
    throw new Error("Папка не найдена");
  }

  const validation = validateFolderUploadFile(fileName, mimeType, data.length);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const row = await prisma.employeeFolderFile.create({
    data: {
      folderKey,
      fileName: fileName.trim(),
      mimeType: validation.mimeType,
      sizeBytes: data.length,
      data: Uint8Array.from(data),
      uploadedBy,
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: true,
    },
  });

  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    category: validation.category,
    categoryLabel: folderFileCategoryLabel(validation.category),
    createdAt: row.createdAt.toISOString(),
    uploadedBy: row.uploadedBy,
  };
}

/**
 * Возвращает бинарные данные файла, если он принадлежит папке.
 */
export async function getEmployeeFolderFileContent(
  fileId: string,
  folderKey: string
): Promise<{ fileName: string; mimeType: string; data: Buffer } | null> {
  const row = await prisma.employeeFolderFile.findFirst({
    where: { id: fileId, folderKey },
    select: {
      fileName: true,
      mimeType: true,
      data: true,
    },
  });

  if (!row) {
    return null;
  }

  return {
    fileName: row.fileName,
    mimeType: row.mimeType,
    data: Buffer.from(row.data),
  };
}

/**
 * Удаляет файл из папки.
 */
export async function deleteEmployeeFolderFile(
  fileId: string,
  folderKey: string
): Promise<boolean> {
  const result = await prisma.employeeFolderFile.deleteMany({
    where: { id: fileId, folderKey },
  });
  return result.count > 0;
}

/**
 * Удаляет все загруженные файлы папки.
 */
export async function deleteAllEmployeeFolderFiles(folderKey: string): Promise<number> {
  const result = await prisma.employeeFolderFile.deleteMany({
    where: { folderKey },
  });
  return result.count;
}
