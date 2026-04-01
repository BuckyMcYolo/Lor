FROM oven/bun:1-slim

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/worker/ ./apps/worker/
COPY packages/ ./packages/
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
USER bun
CMD ["bun", "run", "apps/worker/src/index.ts"]
