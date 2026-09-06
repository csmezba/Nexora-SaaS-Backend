# syntax=docker/dockerfile:1

# -------------------------------------------------------------
# Stage 1: Build Dependencies and Application
# -------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies if native modules (e.g. bcrypt) are needed
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json .npmrc ./

# Install all dependencies including devDependencies for compilation
RUN npm ci --legacy-peer-deps

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Compile the application
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Production Dependencies Only
# -------------------------------------------------------------
FROM node:22-alpine AS prod-deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json .npmrc ./

RUN npm ci --omit=dev --legacy-peer-deps

# -------------------------------------------------------------
# Stage 3: Production Image
# -------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: Create non-root user or use built-in node user
USER node

COPY --chown=node:node package.json .npmrc ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
