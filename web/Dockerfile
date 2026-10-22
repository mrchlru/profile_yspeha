# Prod-образ Timeweb: npm ci по lockfile (все native optional deps), YOLO — при старте.

FROM node:20-bookworm AS builder

WORKDIR /app

ENV NPM_CONFIG_JOBS=2 \
    NPM_CONFIG_FETCH_TIMEOUT=300000 \
    NPM_CONFIG_FETCH_RETRIES=5

COPY package*.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

RUN npm run db:generate
RUN npx next build
RUN npm prune --omit=dev

FROM node:20-bookworm AS runner

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

RUN rm -rf \
  node_modules/onnxruntime-node/bin/napi-v3/win32 \
  node_modules/onnxruntime-node/bin/napi-v3/darwin \
  && test -d node_modules/prisma \
  && test -d .next \
  && test -d models

EXPOSE 8080

CMD ["sh", "-c", "node scripts/ensureYoloModel.mjs && node scripts/setupDb.mjs && exec npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
