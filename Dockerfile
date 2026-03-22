# ── Stage 1: Install dependencies ──
FROM node:18-slim AS deps

WORKDIR /app

COPY package*.json ./

# Install production dependencies only (skip optional express/cors)
RUN npm install --omit=optional --ignore-scripts

# Install Playwright browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

# ── Stage 2: Production image ──
FROM node:18-slim

# System dependencies for Playwright Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependencies and browser from build stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /ms-playwright /ms-playwright

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

# Copy application code
COPY . .

# Ensure data directories exist for price state and incremental tracking
RUN mkdir -p data/price-history

# Production orchestrator
CMD ["node", "scripts/scrape-and-push.js"]
