CREATE TABLE IF NOT EXISTS "employee_folder_file" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "folder_key" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "uploaded_by" TEXT NOT NULL,
  CONSTRAINT "employee_folder_file_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_folder_file_folder_idx"
  ON "employee_folder_file" ("folder_key", "created_at" DESC);
