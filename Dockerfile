# Multi-stage build for Telegram RPG Quest Bot
# Optimized for production deployment

# Stage 1: Build TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY bot/package*.json ./bot/
COPY bot/tsconfig.json ./bot/

# Install dependencies
WORKDIR /app/bot
RUN npm ci --only=production && \
    npm install --save-dev typescript @types/node

# Copy source code
COPY bot/src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Python environment
FROM python:3.11-slim AS python-deps

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Production image
FROM node:18-alpine

WORKDIR /app

# Install Python 3 and system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    postgresql-client \
    curl

# Copy Node.js dependencies
COPY --from=builder /app/bot/node_modules ./bot/node_modules
COPY --from=builder /app/bot/dist ./bot/dist
COPY --from=builder /app/bot/package.json ./bot/

# Copy Python dependencies
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy application code
COPY bot ./bot
COPY tools ./tools
COPY database ./database
COPY workflows ./workflows
COPY .env.example .env.example

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if(r.statusCode !== 200) throw new Error('Health check failed')})"

# Start bot
WORKDIR /app/bot
CMD ["node", "dist/index.js"]
