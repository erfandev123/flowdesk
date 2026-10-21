// ---- Flowdesk server ----
FROM node:24-alpine AS server-build
WORKDIR /app
COPY "Node Project/server/package*.json" ./
RUN npm ci --omit=dev
COPY "Node Project/server/src" ./src
COPY "Node Project/server/public" ./public

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4318
ENV DATA_DIR=/data

RUN addgroup -S flowdesk && adduser -S flowdesk -G flowdesk \
 && mkdir -p /data && chown -R flowdesk:flowdesk /data /app

COPY --from=server-build --chown=flowdesk:flowdesk /app ./server

# ---- Flowdesk web ----
FROM node:24-alpine AS web-build
WORKDIR /app
COPY "Node Project/web/package*.json" ./
RUN npm ci
COPY "Node Project/web/index.html" "Node Project/web/tsconfig.json" "Node Project/web/vite.config.ts" ./
COPY "Node Project/web/src" ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4318
ENV DATA_DIR=/data

RUN addgroup -S flowdesk && adduser -S flowdesk -G flowdesk \
 && mkdir -p /data && chown -R flowdesk:flowdesk /data /app

COPY --from=web-build --chown=flowdesk:flowdesk /app/dist ./web/dist
COPY --from=server-build --chown=flowdesk:flowdesk /app ./server

USER flowdesk
VOLUME ["/data"]
EXPOSE 4318

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4318)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/server.js"]
