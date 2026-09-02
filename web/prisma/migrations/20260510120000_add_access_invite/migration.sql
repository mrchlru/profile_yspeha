-- CreateTable
CREATE TABLE IF NOT EXISTS "access_invite" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "test_kind" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "access_invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "access_invite_code_key" ON "access_invite"("code");
