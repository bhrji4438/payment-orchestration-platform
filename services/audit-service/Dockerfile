# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY services/audit-service/package*.json ./
RUN npm ci
COPY services/audit-service/ .
# Copy shared library (required for relative path imports)
COPY shared/ ./shared
# Copy schema from core
COPY payment-platform-core/prisma ./prisma
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY services/audit-service/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/shared ./shared
RUN npx prisma generate

EXPOSE 3003
CMD ["node", "dist/index.js"]
