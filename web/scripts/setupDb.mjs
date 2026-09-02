/**
 * Синхронизация схемы БД перед стартом приложения (Railway, Docker, локально).
 *
 * Порядок:
 * 1) create_tables.sql — идемпотентный bootstrap для legacy и первого подъёма без истории Prisma.
 * 2) baseline — если таблицы уже есть, а `_prisma_migrations`
 *    отсутствует или пуста, помечаем все миграции из `prisma/migrations` как уже применённые
 *    (иначе `migrate deploy` падает с P3005: «database schema is not empty»).
 * 3) prisma migrate deploy — дальнейшие миграции применяются штатно.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

/** Среда для CLI Prisma/npm — меньше «ложных» ошибок в stderr на Railway. */
function toolEnv() {
  return {
    ...process.env,
    PRISMA_HIDE_UPDATE_MESSAGE: "1",
    NPM_CONFIG_UPDATE_NOTIFIER: "false",
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("[db:setup] bootstrap SQL (scripts/create_tables.sql)…");
  await runBootstrapSql(databaseUrl);

  await baselinePrismaMigrationsIfNeeded(databaseUrl);

  await resolveFailedPrismaMigrations(databaseUrl);

  await reconcileBootstrapAlreadyAppliedMigrations(databaseUrl);

  runPrismaMigrateDeploy();

  console.log("[db:setup] done.");
}

/**
 * Выполняет идемпотентный SQL: создание таблицы при отсутствии и доведение legacy-строк
 * до ограничений NOT NULL / уникального session_id.
 */
async function runBootstrapSql(databaseUrl) {
  const filePath = path.join(process.cwd(), "scripts", "create_tables.sql");
  const sql = fs.readFileSync(filePath, "utf8");
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(sql);
  } finally {
    await client.end();
  }
}

/**
 * Список имён папок миграций в хронологическом порядке (префикс YYYYMMDD…).
 */
function listSortedMigrationNames() {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) =>
      fs.existsSync(path.join(migrationsDir, name, "migration.sql"))
    )
    .sort();
}

/**
 * Проверяет, что в образе есть хотя бы одна миграция.
 */
function hasPrismaMigrationFiles() {
  return listSortedMigrationNames().length > 0;
}

/**
 * Помечает все локальные миграции применёнными — только когда БД уже не пуста, но нет записей в
 * `_prisma_migrations` (типичный Railway после create_tables.sql без migrate).
 */
async function baselinePrismaMigrationsIfNeeded(databaseUrl) {
  if (!hasPrismaMigrationFiles()) {
    console.log("[db:setup] baseline: пропуск — нет папок с migration.sql в prisma/migrations.");
    return;
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const screening = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'screening_submission'
      ) AS ok
    `);
    if (!screening.rows[0].ok) {
      console.log(
        "[db:setup] baseline: пропуск — нет screening_submission (чистая БД; дальше только migrate deploy)."
      );
      return;
    }

    const pm = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) AS ok
    `);
    if (pm.rows[0].ok) {
      const cnt = await client.query(
        `SELECT COUNT(*)::int AS c FROM public._prisma_migrations`
      );
      if (cnt.rows[0].c > 0) {
        console.log(
          `[db:setup] baseline: пропуск — история Prisma не пуста (${String(cnt.rows[0].c)} записей).`
        );
        return;
      }
    }

    const names = listSortedMigrationNames();
    console.log(
      `[db:setup] baseline: пустая _prisma_migrations при существующих таблицах — resolve --applied (${String(names.length)} миграций)…`
    );
    for (const name of names) {
      console.log(`[db:setup] baseline: resolve --applied «${name}»`);
      execSync(`npx prisma migrate resolve --applied "${name}"`, {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      });
    }
    console.log("[db:setup] baseline: готово.");
  } finally {
    await client.end();
  }
}

/**
 * Снимает «зависшие» failed-миграции (P3009), чтобы deploy мог повторить их.
 */
async function resolveFailedPrismaMigrations(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const pm = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) AS ok
    `);
    if (!pm.rows[0].ok) {
      return;
    }

    const failed = await client.query(`
      SELECT migration_name
      FROM public._prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `);
    if (failed.rows.length === 0) {
      return;
    }

    for (const row of failed.rows) {
      const name = row.migration_name;
      console.log(`[db:setup] failed migration: resolve --rolled-back «${name}»`);
      execSync(`npx prisma migrate resolve --rolled-back "${name}"`, {
        cwd: process.cwd(),
        env: toolEnv(),
        stdio: "inherit",
      });
    }
  } finally {
    await client.end();
  }
}

/**
 * Bootstrap SQL (create_tables.sql) иногда опережает Prisma migrate deploy.
 * Если колонка/таблица уже есть, помечаем соответствующую мigration как applied,
 * иначе deploy падает с duplicate column (42701) и контейнер не доходит до next start.
 */
async function reconcileBootstrapAlreadyAppliedMigrations(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const pm = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) AS ok
    `);
    if (!pm.rows[0].ok) {
      return;
    }

    const checks = [
      {
        migration: "20260511100000_access_invite_expires_at",
        probe: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'access_invite'
              AND column_name = 'expires_at'
          ) AS ok
        `,
      },
    ];

    for (const check of checks) {
      const probe = await client.query(check.probe);
      if (!probe.rows[0]?.ok) {
        continue;
      }

      const row = await client.query(
        `
          SELECT finished_at
          FROM public._prisma_migrations
          WHERE migration_name = $1
          LIMIT 1
        `,
        [check.migration]
      );

      if (row.rows.length > 0 && row.rows[0].finished_at !== null) {
        continue;
      }

      console.log(
        `[db:setup] reconcile: «${check.migration}» уже в схеме — resolve --applied`
      );
      execSync(`npx prisma migrate resolve --applied "${check.migration}"`, {
        cwd: process.cwd(),
        env: toolEnv(),
        stdio: "inherit",
      });
    }
  } finally {
    await client.end();
  }
}

/**
 * Применяет миграции; после baseline первый deploy обычно «No pending migrations».
 */
function runPrismaMigrateDeploy() {
  if (!hasPrismaMigrationFiles()) {
    console.warn(
      "[db:setup] в prisma/migrations нет migration.sql — пропускаем prisma migrate deploy (только create_tables.sql)."
    );
    return;
  }
  console.log("[db:setup] prisma migrate deploy…");
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: toolEnv(),
    stdio: "inherit",
  });
  console.log("[db:setup] prisma migrate deploy: успех.");
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
