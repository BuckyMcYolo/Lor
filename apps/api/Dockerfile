FROM oven/bun:1-slim

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
USER bun
EXPOSE 8080
CMD ["bun", "run", "apps/api/src/index.ts"]
