# Stage 1: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
# Copy shared library
COPY shared/ ./shared/
# Copy core prisma schema for client generation
COPY payment-platform-core/prisma/ ./services/settlement-service/prisma/
# Copy package files
COPY services/settlement-service/package*.json ./services/settlement-service/
WORKDIR /app/services/settlement-service
RUN npm ci
COPY services/settlement-service/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY shared/ ./shared/
COPY payment-platform-core/prisma/ ./services/settlement-service/prisma/
COPY services/settlement-service/package*.json ./services/settlement-service/
WORKDIR /app/services/settlement-service
RUN npm ci --only=production
COPY --from=builder /app/services/settlement-service/dist ./dist
RUN npx prisma generate

EXPOSE 3004
CMD ["node", "dist/services/settlement-service/src/index.js"]
