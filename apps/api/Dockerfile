FROM node:22-slim AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=deps /app /app
ENV NODE_ENV=production
USER bun
EXPOSE 8080
CMD ["bun", "run", "apps/api/src/index.ts"]
