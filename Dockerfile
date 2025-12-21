# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application and scripts
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Install required tools and create directories
RUN mkdir -p /app/wg-db/clients /app/wg-db/server /app/wg-db/users && \
    apk add --no-cache wireguard-tools iptables iproute2 tcpdump curl && \
    chmod +x /app/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

EXPOSE 3000

# Use entrypoint script for proper initialization
ENTRYPOINT ["/app/docker-entrypoint.sh"]
