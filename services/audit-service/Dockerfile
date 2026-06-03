# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
# Copy shared library
COPY shared/ ./shared/
# Copy core prisma schema for client generation
COPY payment-platform-core/prisma/ ./services/audit-service/prisma/
# Copy package files
COPY services/audit-service/package*.json ./services/audit-service/
WORKDIR /app/services/audit-service
RUN npm ci
COPY services/audit-service/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY shared/ ./shared/
COPY payment-platform-core/prisma/ ./services/audit-service/prisma/
COPY services/audit-service/package*.json ./services/audit-service/
WORKDIR /app/services/audit-service
RUN npm ci --only=production
COPY --from=builder /app/services/audit-service/dist ./dist
RUN npx prisma generate

EXPOSE 3003
CMD ["node", "dist/index.js"]
