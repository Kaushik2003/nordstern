# syntax=docker/dockerfile:1
# Production image — anchor business-server.
# Compiles TypeScript and runs the compiled JS on a slim, non-root runtime (no tsx,
# no dev deps). The local dev image (business-server/Dockerfile) is left as-is.
#
# Build context is the SERVICE directory:
#   docker build -f infra/docker/business-server.Dockerfile -t <registry>/business-server:<tag> business-server

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build                       # tsc → dist/

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev                    # runtime dependencies only

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Run as a non-root user (least privilege).
RUN addgroup -S app && adduser -S -G app app
COPY --from=deps    --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist         ./dist
COPY --chown=app:app package.json ./
USER app
EXPOSE 3000
# Container-level liveness; k8s probes hit /health too (see the Helm chart).
HEALTHCHECK --interval=30s --timeout=3s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
