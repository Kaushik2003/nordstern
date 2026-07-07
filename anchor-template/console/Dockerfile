FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Production image (Next.js standalone) ─────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
# Per-anchor targets — injected by the provisioner at container launch. rewrites()
# reads these at server start, so one image serves every anchor.
ENV PLATFORM_API_URL=http://platform-api:4000
ENV BIZ_URL=http://control-plane:3002

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3001
CMD ["node", "server.js"]
