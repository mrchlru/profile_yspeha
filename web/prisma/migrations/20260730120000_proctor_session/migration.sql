-- CreateTable
CREATE TABLE "proctor_session" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "session_id" TEXT NOT NULL,
    "access_code" TEXT NOT NULL,
    "candidate_folder_key" TEXT,
    "test_kind" TEXT NOT NULL,
    "report_json" JSONB,

    CONSTRAINT "proctor_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proctor_event" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "proctor_session_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "client_face_count" INTEGER,
    "server_face_count" INTEGER,
    "server_verified" BOOLEAN,
    "metadata" JSONB,

    CONSTRAINT "proctor_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proctor_snapshot" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "proctor_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proctor_session_session_id_key" ON "proctor_session"("session_id");

-- CreateIndex
CREATE INDEX "proctor_session_folder_idx" ON "proctor_session"("candidate_folder_key", "created_at");

-- CreateIndex
CREATE INDEX "proctor_event_session_time_idx" ON "proctor_event"("proctor_session_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "proctor_snapshot_event_id_key" ON "proctor_snapshot"("event_id");

-- AddForeignKey
ALTER TABLE "proctor_event" ADD CONSTRAINT "proctor_event_proctor_session_id_fkey" FOREIGN KEY ("proctor_session_id") REFERENCES "proctor_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proctor_snapshot" ADD CONSTRAINT "proctor_snapshot_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "proctor_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
