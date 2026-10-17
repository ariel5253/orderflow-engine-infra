# The end-to-end runner: the suite on the Playwright image of the web client's pinned playwright version, which holds
# Node and the browser build of that release. scripts/e2e runs it on the network of the stack it starts.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /e2e
ENV CI=true \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY playwright.config.ts ./
COPY tests ./tests
CMD ["npx", "playwright", "test"]
