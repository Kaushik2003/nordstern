FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
# Run TS directly with tsx (no build step) — keeps the dev/prod surface identical
# for this skeleton. A tsc build stage can be added at hardening (Phase F).
CMD ["npx", "tsx", "src/index.ts"]
