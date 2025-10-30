FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --silent --omit=dev
RUN npm ci --silent --omit=dev

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Bring the built app and production dependencies into the runner image so
# `npm run start` can find the `package.json`/node modules it needs.
# We copy package*.json and node_modules from the builder stage.
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the Next.js build output and static public files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm","run","start"]