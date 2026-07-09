# Build context: platform/ (the npm workspace root) — see docker-compose.platform.yml.
# Installs the workspace so @nordstern/shared-ui + shared-auth resolve, builds only this app.
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
# The /api rewrite destination is baked from API_URL at build time (standalone). Point it
# at platform-api on the compose network so the browser stays same-origin (cookies flow).
ARG API_URL=http://platform-api:4000
ENV API_URL=$API_URL
# The redeem link the admin copies points at the founder console (a different origin).
# Baked at build time (NEXT_PUBLIC_*). Dev falls back to same-origin if unset.
ARG NEXT_PUBLIC_FOUNDER_URL=
ENV NEXT_PUBLIC_FOUNDER_URL=$NEXT_PUBLIC_FOUNDER_URL
RUN npm run build -w @nordstern/admin-console

# ── Production image (Next.js standalone; traced from the workspace root) ─────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_URL=http://platform-api:4000

COPY --from=builder /app/admin-console/.next/standalone ./
COPY --from=builder /app/admin-console/.next/static ./admin-console/.next/static

EXPOSE 3000
CMD ["node", "admin-console/server.js"]
