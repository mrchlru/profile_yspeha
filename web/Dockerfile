# Общий runtime с openssl (Prisma / TLS).
FROM node:20-bookworm-slim AS node-os

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Изолированный Prisma CLI со ВСЕМИ зависимостями (включая @prisma/studio-core).
# Не мержить в app node_modules и не вырезать studio-core — CLI падает без него.
FROM node-os AS prisma-cli

WORKDIR /prisma-cli
RUN printf '%s\n' '{"name":"prisma-cli","private":true}' > package.json \
  && npm install prisma@7.5.0 pg@8.20.0 --omit=dev --no-audit --no-fund \
  && test -f node_modules/prisma/build/index.js \
  && test -d node_modules/@prisma/studio-core \
  && node node_modules/prisma/build/index.js --version

# Сборка Next standalone.
FROM node-os AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN node scripts/ensureYoloModel.mjs
RUN npm run db:generate
RUN npm run build \
  && test -f .next/standalone/server.js

# Прод-раннер.
FROM node-os AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV PRISMA_CLI_ENTRY=/prisma-cli/node_modules/prisma/build/index.js

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/models ./models
COPY --from=builder /app/src/assets/report-fonts ./report-fonts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Полный Prisma CLI отдельной директорией (не трогаем standalone node_modules).
COPY --from=prisma-cli /prisma-cli /prisma-cli

# onnxruntime-node — external для Next; только linux-бинарь.
COPY --from=builder /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=builder /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common
COPY --from=builder /app/node_modules/global-agent ./node_modules/global-agent
COPY --from=builder /app/node_modules/tar ./node_modules/tar

RUN rm -rf \
  node_modules/onnxruntime-node/bin/napi-v3/win32 \
  node_modules/onnxruntime-node/bin/napi-v3/darwin \
  && test -f server.js \
  && test -f "$PRISMA_CLI_ENTRY" \
  && test -d /prisma-cli/node_modules/@prisma/studio-core \
  && node "$PRISMA_CLI_ENTRY" --version

EXPOSE 8080

CMD ["sh", "-c", "node scripts/setupDb.mjs && exec node server.js"]
