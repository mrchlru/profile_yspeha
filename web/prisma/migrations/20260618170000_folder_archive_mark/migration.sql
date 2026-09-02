CREATE TABLE IF NOT EXISTS "folder_archive_mark" (
  "folder_key" TEXT NOT NULL,
  "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "folder_archive_mark_pkey" PRIMARY KEY ("folder_key")
);
