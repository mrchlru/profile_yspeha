export type FolderFileCategory =
  | "word"
  | "excel"
  | "powerpoint"
  | "pdf"
  | "image"
  | "video";

export type FolderFilePolicyEntry = {
  category: FolderFileCategory;
  extensions: ReadonlyArray<string>;
  mimeTypes: ReadonlyArray<string>;
  maxBytes: number;
};

export const FOLDER_FILE_POLICIES: ReadonlyArray<FolderFilePolicyEntry> = [
  {
    category: "word",
    extensions: [".doc", ".docx"],
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxBytes: 25 * 1024 * 1024,
  },
  {
    category: "excel",
    extensions: [".xls", ".xlsx"],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    maxBytes: 25 * 1024 * 1024,
  },
  {
    category: "powerpoint",
    extensions: [".ppt", ".pptx"],
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maxBytes: 25 * 1024 * 1024,
  },
  {
    category: "pdf",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    maxBytes: 25 * 1024 * 1024,
  },
  {
    category: "image",
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    maxBytes: 15 * 1024 * 1024,
  },
  {
    category: "video",
    extensions: [".mp4", ".webm", ".mov"],
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 100 * 1024 * 1024,
  },
];

export type FolderFileValidationResult =
  | {
      ok: true;
      category: FolderFileCategory;
      mimeType: string;
      extension: string;
    }
  | { ok: false; error: string };

/**
 * Проверяет имя, MIME-тип и размер загружаемого файла.
 */
export function validateFolderUploadFile(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): FolderFileValidationResult {
  const normalizedName = fileName.trim();
  if (!normalizedName) {
    return { ok: false, error: "Укажите имя файла" };
  }

  const dot = normalizedName.lastIndexOf(".");
  if (dot <= 0) {
    return { ok: false, error: "Файл должен иметь расширение" };
  }

  const extension = normalizedName.slice(dot).toLowerCase();
  const policy = FOLDER_FILE_POLICIES.find((entry) => entry.extensions.includes(extension));
  if (!policy) {
    return {
      ok: false,
      error:
        "Допустимы: Word, Excel, PowerPoint, PDF, изображения (JPG, PNG, GIF, WebP), видео (MP4, WebM, MOV)",
    };
  }

  const normalizedMime = mimeType.trim().toLowerCase() || "application/octet-stream";
  if (
    normalizedMime !== "application/octet-stream" &&
    !policy.mimeTypes.includes(normalizedMime)
  ) {
    return { ok: false, error: "MIME-тип файла не соответствует расширению" };
  }

  if (sizeBytes <= 0) {
    return { ok: false, error: "Файл пустой" };
  }

  if (sizeBytes > policy.maxBytes) {
    const limitMb = Math.round(policy.maxBytes / (1024 * 1024));
    return { ok: false, error: `Файл слишком большой (максимум ${String(limitMb)} МБ)` };
  }

  return {
    ok: true,
    category: policy.category,
    mimeType: policy.mimeTypes.includes(normalizedMime)
      ? normalizedMime
      : (policy.mimeTypes[0] ?? normalizedMime),
    extension,
  };
}

/**
 * Возвращает подпись категории файла для UI.
 */
export function folderFileCategoryLabel(category: FolderFileCategory): string {
  switch (category) {
    case "word":
      return "Word";
    case "excel":
      return "Excel";
    case "powerpoint":
      return "PowerPoint";
    case "pdf":
      return "PDF";
    case "image":
      return "Изображение";
    case "video":
      return "Видео";
  }
}
