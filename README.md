# Профиль Успеха

Веб-приложение для скрининга, аудита состояния, анкет ПРОФ СБ и отчётности HR.

## Timeweb App Platform (Docker)

| Параметр | Значение |
|----------|----------|
| **Корневая директория** | `web` |
| **Dockerfile** | `Dockerfile` (внутри `web/`) |
| **Порт контейнера** | `3000` (или переменная `PORT`, которую задаёт платформа) |
| **Команда старта** | уже в Dockerfile: `npm run db:setup && next start` |

### Обязательные переменные окружения

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | PostgreSQL (Managed DB Timeweb или внешний) |
| `APP_URL` | Публичный URL приложения, напр. `https://ваш-домен.timeweb.cloud` |
| `ADMIN_PANEL_EMAIL` | Email входа в админку |
| `ADMIN_PANEL_PASSWORD` | Пароль админки |
| `ADMIN_SESSION_SECRET` | Секрет сессии (длинная случайная строка) |
| `OPENAI_API_KEY` | Ключ OpenAI для заключений и отчётов |

### Рекомендуемые

| Переменная | Назначение |
|------------|------------|
| `OPENAI_MODEL` | Модель Chat Completions (по умолчанию `gpt-5.5`) |
| `SMTP_*` | Отправка PDF на почту (хост Timeweb: `smtp.timeweb.ru`) |
| `GOOGLE_SHEETS_*` | Выгрузка ответов в Google Sheets |

При первом деплое контейнер сам применит миграции Prisma (`npm run db:setup`).

Подробнее: [`web/SECURITY.md`](web/SECURITY.md).

## Локальная разработка

```bash
cd web
npm ci
cp .env.example .env   # если есть; заполнить DATABASE_URL и ключи
npm run db:setup
npm run dev
```
