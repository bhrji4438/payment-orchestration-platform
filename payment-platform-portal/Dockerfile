# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
# Copy shared library
COPY shared/ ./shared/
# Copy portal package files using path relative to build context (repo root)
COPY payment-platform-portal/package*.json ./payment-platform-portal/
WORKDIR /app/payment-platform-portal
RUN npm ci
COPY payment-platform-portal/ ./
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY payment-platform-portal/package*.json ./payment-platform-portal/
WORKDIR /app/payment-platform-portal
RUN npm ci --only=production
COPY --from=builder /app/payment-platform-portal/.next ./.next
COPY --from=builder /app/payment-platform-portal/public ./public
COPY --from=builder /app/payment-platform-portal/app ./app

EXPOSE 3006
CMD ["npm", "start"]
