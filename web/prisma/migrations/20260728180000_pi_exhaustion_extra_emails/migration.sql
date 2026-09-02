-- Дополнительные получатели алертов о критическом ПИ (как HrD).
ALTER TABLE "admin_app_settings"
ADD COLUMN IF NOT EXISTS "pi_exhaustion_notify_extra_emails" TEXT NOT NULL DEFAULT '';
