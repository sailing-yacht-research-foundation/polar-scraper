FROM node:16-alpine AS builder
WORKDIR /usr/src/app
COPY ["package*.json", "tsconfig.json",  "./"]
RUN npm ci
COPY ./src ./src
RUN npm run build

FROM node:16-alpine
WORKDIR /usr/src/app
# Install chromium in container instead of letting puppeteer install because there is an issue in docker using puppeteer's chromium
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apk add chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY package*.json ./
RUN npm install --production --silent
COPY --from=builder /usr/src/app/build/ build/