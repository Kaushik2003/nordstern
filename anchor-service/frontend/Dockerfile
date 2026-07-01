FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# These are baked into the Next.js bundle at build time.
ARG BIZ_URL=http://business-server:3000
ARG NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ENV BIZ_URL=${BIZ_URL}
ENV NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}

RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3001
CMD ["node", "server.js"]
