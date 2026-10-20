# Рабочий прод-образ для Timeweb: полный node_modules после prune.
# Без standalone/отдельного prisma-cli — там ломался migrate (valibot/studio/dotenv).

# Полный bookworm в builder — openssl/ca без apt (экономия ~2 мин на лимите Timeweb).
FROM node:20-bookworm AS builder

WORKDIR /app

COPY package*.json .npmrc ./
# Кэш npm + без audit/fund — быстрее укладываемся в buildctl ~1680s.
RUN --mount=type=cache,target=/root/.npm \
  npm ci --no-audit --no-fund --prefer-offline

COPY . .

RUN node scripts/ensureYoloModel.mjs
RUN npm run db:generate
RUN npm run build
# Убрать devDependencies перед копированием в runner.
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/models ./models
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/assets/report-fonts ./report-fonts

# Чужие платформы onnx не нужны в linux-раннере.
RUN rm -rf \
  node_modules/onnxruntime-node/bin/napi-v3/win32 \
  node_modules/onnxruntime-node/bin/napi-v3/darwin \
  && test -d node_modules/prisma \
  && test -d .next

EXPOSE 8080

CMD ["sh", "-c", "node scripts/setupDb.mjs && exec npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
