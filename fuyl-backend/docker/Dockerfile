# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# `npm ci` gives reproducible installs from the lockfile and fails loudly if it
# drifts (the old `npm install --frozen-lockfile || npm install` silently fell
# back to a non-deterministic install — that flag is yarn/pnpm's, not npm's).
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Run as the built-in non-root `node` user (baked into the official image) so a
# process compromise doesn't run as root. Winston writes to ./logs, so that dir
# must be owned by `node` before dropping privileges.
RUN mkdir -p logs && chown -R node:node /app
USER node

# Healthcheck hits the /api/v1/health liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

EXPOSE 4000
CMD ["node", "dist/server.js"]
