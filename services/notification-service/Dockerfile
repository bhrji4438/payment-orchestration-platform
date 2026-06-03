# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
# Copy shared library
COPY shared/ ./shared/
# Copy core prisma schema for client generation
COPY payment-platform-core/prisma/ ./services/notification-service/prisma/
# Copy package files
COPY services/notification-service/package*.json ./services/notification-service/
WORKDIR /app/services/notification-service
RUN npm ci
COPY services/notification-service/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY shared/ ./shared/
COPY payment-platform-core/prisma/ ./services/notification-service/prisma/
COPY services/notification-service/package*.json ./services/notification-service/
WORKDIR /app/services/notification-service
RUN npm ci --only=production
COPY --from=builder /app/services/notification-service/dist ./dist
RUN npx prisma generate

EXPOSE 3002
CMD ["node", "dist/services/notification-service/src/index.js"]
