FROM node:20-bookworm-slim AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY . .

RUN node scripts/ensureYoloModel.mjs
RUN npm run db:generate
RUN npm run build

FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/models ./models
COPY --from=builder /app/src/assets/report-fonts ./report-fonts
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Timeweb App Platform маршрутизирует HTTPS по EXPOSE, не по переменной PORT.
EXPOSE 8080

CMD ["sh", "-c", "npm run db:setup && npx next start -H 0.0.0.0 -p ${PORT:-8080}"]

