import { prisma } from "@/lib/prisma";

/**
 * Помечает произвольную папку (например, аудит) как архивную.
 */
export async function markFolderArchived(folderKey: string): Promise<void> {
  await prisma.folderArchiveMark.upsert({
    where: { folderKey },
    create: { folderKey },
    update: {},
  });
}

/**
 * Снимает пометку архива с папки.
 */
export async function unmarkFolderArchived(folderKey: string): Promise<void> {
  await prisma.folderArchiveMark.deleteMany({
    where: { folderKey },
  });
}

/**
 * Возвращает множество ключей папок в архиве (не кандидаты).
 */
export async function loadFolderArchiveMarkSet(
  folderKeys: ReadonlyArray<string>
): Promise<Set<string>> {
  if (folderKeys.length === 0) {
    return new Set();
  }
  const rows = await prisma.folderArchiveMark.findMany({
    where: { folderKey: { in: [...folderKeys] } },
    select: { folderKey: true },
  });
  return new Set(rows.map((row) => row.folderKey));
}

export async function isFolderArchiveMarked(folderKey: string): Promise<boolean> {
  const row = await prisma.folderArchiveMark.findUnique({
    where: { folderKey },
    select: { folderKey: true },
  });
  return Boolean(row);
}
