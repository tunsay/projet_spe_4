FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --silent --omit=dev
RUN npm ci --silent

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm","run","start"]