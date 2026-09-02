-- DEV-режим приглашения: панель шагов и текстовый отчёт без пометки кода использованным.
ALTER TABLE "access_invite" ADD COLUMN "dev_mode" BOOLEAN NOT NULL DEFAULT false;
