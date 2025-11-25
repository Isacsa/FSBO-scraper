# Use Node.js LTS
FROM node:18-slim

# Instalar dependências do sistema necessárias para Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
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

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências
RUN npm install

# Instalar browsers do Playwright
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 3000

# Variável de ambiente para Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Comando para iniciar a aplicação
CMD ["npm", "start"]


