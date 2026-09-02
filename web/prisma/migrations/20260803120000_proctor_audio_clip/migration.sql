-- CreateTable
CREATE TABLE "proctor_audio_clip" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "proctor_audio_clip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proctor_audio_clip_event_id_key" ON "proctor_audio_clip"("event_id");

-- AddForeignKey
ALTER TABLE "proctor_audio_clip" ADD CONSTRAINT "proctor_audio_clip_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "proctor_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
