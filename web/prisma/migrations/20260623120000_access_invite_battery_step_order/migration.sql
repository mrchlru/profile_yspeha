-- Порядок прохождения блоков батареи ОД (фиксируется при создании кода доступа).
ALTER TABLE "access_invite" ADD COLUMN "audit_battery_step_order" JSONB;
