# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile || npm install

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --frozen-lockfile || npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Healthcheck hits the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

EXPOSE 4000
CMD ["node", "dist/server.js"]
