-- Отключение камеры/микрофона прокторинга на приглашении (остаётся контроль экрана/вкладки).
ALTER TABLE "access_invite" ADD COLUMN "av_proctor_disabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "proctor_session" ADD COLUMN "av_proctor_disabled" BOOLEAN NOT NULL DEFAULT false;
