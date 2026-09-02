# Защита приложения «Профиль Успеха»: соответствие требованиям

Краткая привязка мер к пунктам чек-листа безопасности.

## 1. API и валидация (Next.js backend)

| Требование | Реализация |
|------------|------------|
| Строгая схема `step1Data`…`step4Data` | `src/lib/validation/submitPayloadSchema.ts` (Zod, `.strict()`), разбор в `POST /api/submit` |
| Только `POST` для `/api/submit` | `GET` / `PUT` / `DELETE` / `PATCH` → **405** в `src/app/api/submit/route.ts` |
| Rate limiting (3 успешные отправки с IP за час) | `src/lib/api/submitRateLimit.ts` (in-memory; для нескольких инстансов — Upstash Redis) |
| Ошибки БД без утечки деталей | `catch` → `{ error: "Internal Server Error" }`, статус **500** |
| Не логировать тело анкеты | В роуте нет `console.log` с данными кандидата |

## 2. Интеграция с AI (OpenAI)

| Требование | Реализация |
|------------|------------|
| Ключ только на сервере | Использовать `process.env.OPENAI_API_KEY` без префикса `NEXT_PUBLIC_` при подключении API |
| Prompt injection | Текст системной политики: `src/lib/ai/openaiPromptPolicy.ts` (`OPENAI_SYSTEM_PROMPT_SCREENING`) |
| Санитизация полей шага 4 перед LLM | `src/lib/ai/sanitizeForAi.ts` (`sanitizeForAiInput`, до 200 символов, `\p{L}\p{N}`) |
| JSON-ответ | Константа `OPENAI_JSON_RESPONSE_FORMAT` для `response_format: { type: "json_object" }` при вызове API |

Генерация PDF и вызов OpenAI в коде пока не подключены (см. TODO в `route.ts`); утилиты и политика готовы к встраиванию.

## 3. Клиент (React / Next.js)

| Требование | Реализация |
|------------|------------|
| Запрет прямого доступа к шагам 2–4 | `src/middleware.ts` + cookie `sr_max_step` (`src/lib/screeningProgressCookie.ts`), выставление на шагах 1–4 |
| Очистка чувствительных данных | `clearSensitiveFormData()` в `useFormStore` после успешной отправки |
| Валидация перед `fetch` | `isFullScreeningPayloadComplete` в `useFormStore.submitData` |
| Чувствительные экраны без утечки в статический HTML | Страницы шагов и анкеты — `'use client'` |

## 4. PDF и внешние ресурсы

| Требование | Реализация |
|------------|------------|
| XSS в PDF/HTML | `src/lib/pdf/escapeHtml.ts` — `escapeHtmlForPdf` для будущих шаблонов |
| SSRF / внешние URL в headless | При появлении Puppeteer: отключить сеть или `requestInterception` для не-локальных URL |
| Временные файлы | При появлении записи PDF на диск: `fs.unlink` в `finally` |

## 5. Инфраструктура Next.js

| Требование | Реализация |
|------------|------------|
| Security headers | `next.config.js`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| Source maps в проде | `productionBrowserSourceMaps: false` в `next.config.js` |

## Переменные окружения (рекомендуемые)

- `APP_URL` — публичный URL сайта для ссылок в письмах (оценочные листы комиссии и др.), например `https://ваш-домен.up.railway.app`. На Railway при отсутствии переменной используется `RAILWAY_PUBLIC_DOMAIN`.
- `OPENAI_API_KEY` — только на сервере, без `NEXT_PUBLIC_`.
- `OPENAI_MODEL` (необязательно) — модель Chat Completions для HR/скрининга; по умолчанию `gpt-5.5` (см. `src/lib/ai/openaiHttp.ts`).
- `OPENAI_MANAGER_BRIEF_MODEL` (необязательно) — отдельная модель для финального «Заключения» в отчёте для руководителя (ОД/ТУ); если не задана, используется `OPENAI_MODEL`.
- `OPENAI_BASE_URL` (необязательно) — базовый URL API без пути `/v1/...` (по умолчанию `https://api.openai.com`). Для Timeweb/РФ: URL Railway relay, например `https://telegram-relay2-production.up.railway.app`.
- `OPENAI_RELAY_SECRET` (нужен при relay) — `relay_secret` tenant'а в `RELAY_TENANTS` на relay; уходит как заголовок `X-Relay-Secret`.

### Брендинг PDF и Word-экспорта отчётов

| Переменная | Назначение |
|------------|------------|
| `REPORT_BRAND_LOGO_ON_LIGHT_BG_PATH` (необязательно) | Тёмный логотип для светлого фона (PDF-шапка, Word). По умолчанию `public/branding/bts-logo-on-light-bg.png`. |
| `REPORT_BRAND_LOGO_ON_DARK_BG_PATH` (необязательно) | Белый логотип для тёмного фона. По умолчанию `public/branding/bts-logo-on-dark-bg.png`. |
| `REPORT_BRAND_LOGO_PATH` (необязательно) | Устаревший одиночный файл; только для светлого фона, если нет `…ON_LIGHT_BG…`. |
| `REPORT_BRAND_URL` (необязательно) | URL при клике на логотип. По умолчанию `https://www.bts-kognium.ru/`, иначе `APP_URL` / Railway. |

Логотип ставится в зону контикула на **каждой** странице PDF и в колонтитул docx; текст отчёта не меняется.

### Google Sheets (выгрузка ответов)

| Переменная | Назначение |
|------------|------------|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID таблицы из URL: `https://docs.google.com/spreadsheets/d/<ID>/edit` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON ключа сервисного аккаунта Google Cloud (одной строкой в Railway) |
| `GOOGLE_SHEETS_TEST_TAB` (необязательно) | Имя листа для `npm run sheets:test` (по умолчанию «Тест подключения») |

Таблицу нужно **расшарить** на email сервисного аккаунта (`client_email` из JSON) с правом **Редактор**. Ключ JSON хранить только на сервере, не коммитить в репозиторий. Проверка: `npm run sheets:test` из каталога `web/`.

### Timeweb Cloud (логи приложения)

| Переменная | Назначение |
|------------|------------|
| `TIMEWEB_API_TOKEN` | Bearer-токен Timeweb Cloud API (панель Timeweb → API) |
| `TIMEWEB_APP_ID` | ID приложения App Platform в Timeweb |

Просмотр в админ-панели (`/admin/timeweb-logs`) — только главному администратору. Токен хранить только на сервере.
