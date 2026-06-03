# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
# Copy shared library
COPY shared/ ./shared/
# Copy core prisma schema for client generation
COPY payment-platform-core/prisma/ ./services/invoice-service/prisma/
# Copy package files
COPY services/invoice-service/package*.json ./services/invoice-service/
WORKDIR /app/services/invoice-service
RUN npm ci
COPY services/invoice-service/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY shared/ ./shared/
COPY payment-platform-core/prisma/ ./services/invoice-service/prisma/
COPY services/invoice-service/package*.json ./services/invoice-service/
WORKDIR /app/services/invoice-service
RUN npm ci --only=production
COPY --from=builder /app/services/invoice-service/dist ./dist
RUN npx prisma generate

EXPOSE 3001
CMD ["node", "dist/index.js"]
