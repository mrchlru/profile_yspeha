CREATE TABLE IF NOT EXISTS "admin_app_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "updated_at" TIMESTAMP(3) NOT NULL,
  "pi_exhaustion_notify_admin" BOOLEAN NOT NULL DEFAULT true,
  "pi_exhaustion_notify_hrd" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "admin_app_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "admin_app_settings" ("id", "updated_at", "pi_exhaustion_notify_admin", "pi_exhaustion_notify_hrd")
VALUES ('default', CURRENT_TIMESTAMP, true, true)
ON CONFLICT ("id") DO NOTHING;
