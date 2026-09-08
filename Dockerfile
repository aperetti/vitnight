# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# Base stage with package definitions
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package*.json ./

# ------------------------------------------------------------------------------
# Development stage (for live coding in Docker)
# ------------------------------------------------------------------------------
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
EXPOSE 3000 3001
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ------------------------------------------------------------------------------
# Builder stage (compiles client assets and bundles with Vite)
# ------------------------------------------------------------------------------
FROM base AS builder
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# ------------------------------------------------------------------------------
# Production runner stage (minimal, secure, non-root)
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend assets from builder
COPY --chown=node:node --from=builder /app/dist ./dist

# Copy backend and shared source code
COPY --chown=node:node --from=builder /app/src/server ./src/server
COPY --chown=node:node --from=builder /app/src/shared ./src/shared
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json

# Run as non-root node user
USER node

EXPOSE 3000

# Built-in health check using Node 18+ native fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
