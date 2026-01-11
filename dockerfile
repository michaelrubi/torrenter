# 1. Build Stage
FROM node:25-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# Remove dev dependencies to keep image small
RUN npm prune --production

# 2. Run Stage
FROM node:25-alpine
WORKDIR /app
# Copy built artifacts and production deps
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .

EXPOSE 3000
ENV NODE_ENV=production
# SvelteKit adapter-node default entry
CMD [ "node", "build" ]