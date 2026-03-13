FROM node:20-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copy dependency files first (layer cache optimisation)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create log directory
RUN mkdir -p logs && chown -R node:node /app

# Run as non-root
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
