# Build from repository root (parent of apk-forge/):
#   docker build -f apk-forge/Dockerfile -t apk-forge .

FROM node:22-alpine
WORKDIR /app

COPY apk-forge/shared/package.json apk-forge/shared/package-lock.json ./shared/
WORKDIR /app/shared
RUN npm ci

COPY apk-forge/shared/*.ts ./
WORKDIR /app

COPY apk-forge/server/package.json apk-forge/server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci

COPY apk-forge/server/src ./src
COPY apk-forge/server/tsconfig.json ./

WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["./node_modules/.bin/tsx", "src/server.ts"]
