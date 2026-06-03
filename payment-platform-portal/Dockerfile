# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
# Copy portal package files using path relative to build context (repo root)
COPY payment-platform-portal/package*.json ./
RUN npm ci
COPY payment-platform-portal/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY payment-platform-portal/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder /app/app ./app

EXPOSE 3006
CMD ["node_modules/.bin/next", "start", "-p", "3006"]
