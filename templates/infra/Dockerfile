FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
RUN pnpm run build

CMD ["node", "apps/api/src/index.ts"]
