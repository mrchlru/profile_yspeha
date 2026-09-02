-- CreateTable
CREATE TABLE "proctor_session_audio" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "proctor_session_id" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "is_final" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "proctor_session_audio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proctor_session_audio_proctor_session_id_key" ON "proctor_session_audio"("proctor_session_id");

-- AddForeignKey
ALTER TABLE "proctor_session_audio" ADD CONSTRAINT "proctor_session_audio_proctor_session_id_fkey" FOREIGN KEY ("proctor_session_id") REFERENCES "proctor_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
