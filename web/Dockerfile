# Общий runtime с openssl (Prisma / TLS). Один слой apt — меньше времени сборки.
FROM node:20-bookworm-slim AS node-os

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Сборка: npm ci здесь же (без COPY полного node_modules между стадиями).
FROM node-os AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN node scripts/ensureYoloModel.mjs
RUN npm run db:generate
RUN npm run build

# Прод-образ: Next standalone + минимум пакетов для migrate / YOLO.
FROM node-os AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
# Timeweb→Railway: предпочитать A (IPv4), иначе IPv6 часто «висит» ~10с.
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/models ./models
COPY --from=builder /app/src/assets/report-fonts ./report-fonts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Prisma CLI для db:setup (migrate deploy / resolve).
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# onnxruntime-node вынесен в externals — standalone его не трейсит.
COPY --from=builder /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=builder /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common
COPY --from=builder /app/node_modules/global-agent ./node_modules/global-agent
COPY --from=builder /app/node_modules/tar ./node_modules/tar

# Убрать чужие платформы и Studio — сильно уменьшает слой экспорта образа.
RUN rm -rf \
  node_modules/onnxruntime-node/bin/napi-v3/win32 \
  node_modules/onnxruntime-node/bin/napi-v3/darwin \
  node_modules/@prisma/studio-core

# Timeweb App Platform маршрутизирует HTTPS по EXPOSE, не по переменной PORT.
EXPOSE 8080

CMD ["sh", "-c", "node scripts/setupDb.mjs && node server.js"]
