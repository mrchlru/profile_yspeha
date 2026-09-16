# Общий runtime с openssl (Prisma / TLS). Один слой apt — меньше времени сборки.
FROM node:20-bookworm-slim AS node-os

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Полное дерево зависимостей Prisma CLI (valibot и пр.) — без всего app node_modules.
FROM node-os AS prisma-cli

WORKDIR /cli
RUN printf '%s\n' '{"name":"prisma-cli","private":true}' > package.json \
  && npm install prisma@7.5.0 pg@8.20.0 --omit=dev --no-audit --no-fund \
  && rm -rf node_modules/@prisma/studio-core

# Сборка приложения.
FROM node-os AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN node scripts/ensureYoloModel.mjs
RUN npm run db:generate
RUN npm run build

# Прод-образ: Next standalone + Prisma CLI + YOLO runtime.
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

# Слить полное дерево Prisma CLI в node_modules standalone.
COPY --from=prisma-cli /cli/node_modules /tmp/prisma-cli-modules
RUN cp -a /tmp/prisma-cli-modules/. ./node_modules/ \
  && rm -rf /tmp/prisma-cli-modules \
  && mkdir -p node_modules/.bin \
  && ln -sf ../prisma/build/index.js node_modules/.bin/prisma \
  && chmod +x node_modules/prisma/build/index.js

# onnxruntime-node вынесен в externals — standalone его не трейсит.
COPY --from=builder /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=builder /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common
COPY --from=builder /app/node_modules/global-agent ./node_modules/global-agent
COPY --from=builder /app/node_modules/tar ./node_modules/tar

RUN rm -rf \
  node_modules/onnxruntime-node/bin/napi-v3/win32 \
  node_modules/onnxruntime-node/bin/napi-v3/darwin \
  node_modules/@prisma/studio-core

# Timeweb App Platform маршрутизирует HTTPS по EXPOSE, не по переменной PORT.
EXPOSE 8080

CMD ["sh", "-c", "node scripts/setupDb.mjs && node server.js"]
