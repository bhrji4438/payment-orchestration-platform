# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
# Copy shared library
COPY shared/ ./shared/
# Copy core package files using path relative to build context (repo root)
COPY payment-platform-core/package*.json ./payment-platform-core/
WORKDIR /app/payment-platform-core
RUN npm ci
COPY payment-platform-core/ ./
RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy shared library to /app/shared/
COPY shared/ ./shared/
COPY payment-platform-core/package*.json ./payment-platform-core/
WORKDIR /app/payment-platform-core
RUN npm ci --only=production
COPY --from=builder /app/payment-platform-core/dist ./dist
COPY --from=builder /app/payment-platform-core/prisma ./prisma
RUN npx prisma generate

EXPOSE 3000
CMD ["node", "dist/index.js"]
