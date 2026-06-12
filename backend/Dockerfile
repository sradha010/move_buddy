# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3000

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "dist/main"]
