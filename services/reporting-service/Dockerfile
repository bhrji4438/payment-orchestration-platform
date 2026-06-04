# Stage 1: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
# Copy shared library
COPY shared/ ./shared/
# Copy core prisma schema for client generation
COPY payment-platform-core/prisma/ ./services/reporting-service/prisma/
# Copy package files
COPY services/reporting-service/package*.json ./services/reporting-service/
WORKDIR /app/services/reporting-service
RUN npm ci
COPY services/reporting-service/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY shared/ ./shared/
COPY payment-platform-core/prisma/ ./services/reporting-service/prisma/
COPY services/reporting-service/package*.json ./services/reporting-service/
WORKDIR /app/services/reporting-service
RUN npm ci --only=production
COPY --from=builder /app/services/reporting-service/dist ./dist
RUN npx prisma generate

EXPOSE 3005
CMD ["node", "dist/services/reporting-service/src/index.js"]
