FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CAMP_SCOUT_BASE=/
ENV BUILD_OUT_DIR=dist
RUN npm run build:fly

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/server ./src/server
COPY --from=build /app/src/data ./src/data
COPY --from=build /app/src/ingestion ./src/ingestion

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["npx", "tsx", "server/production.mjs"]
