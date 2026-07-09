FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# The /api rewrite destination is baked from API_URL at build time (standalone). Point it
# at platform-api on the compose network so the browser stays same-origin (cookies flow).
ARG API_URL=http://platform-api:4000
ENV API_URL=$API_URL
RUN npm run build

# ── Production image (Next.js standalone) ─────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_URL=http://platform-api:4000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
