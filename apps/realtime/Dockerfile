FROM oven/bun:1-slim

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/realtime/ ./apps/realtime/
COPY packages/ ./packages/
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
USER bun
EXPOSE 8000
CMD ["bun", "run", "apps/realtime/src/index.ts"]
