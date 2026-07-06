FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# NETWORK_PASSPHRASE is baked into the Next.js bundle at build time (NEXT_PUBLIC_*).
# BIZ_URL is NOT needed at build time — rewrites() runs at server start.
ARG NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ENV NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}

RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
# Runtime: the business-server proxy target. In the factory model each anchor
# gets its own biz-server; the client defaults to control-plane for operator ops.
ENV BIZ_URL=http://control-plane:3002

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3001
CMD ["node", "server.js"]
