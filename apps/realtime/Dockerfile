FROM node:22-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/realtime/ ./apps/realtime/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/realtime build

ENV NODE_ENV=production
USER node
WORKDIR /app/apps/realtime
EXPOSE 8000
CMD ["node", "dist/index.js"]
