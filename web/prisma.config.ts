import { defineConfig } from "prisma/config";

/**
 * Конфиг Prisma для CLI (migrate/generate).
 * DATABASE_URL берётся из окружения (Docker/Timeweb/Next) — без обязательного dotenv,
 * чтобы slim-образ не падал на `Cannot find module 'dotenv/config'`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
