# Townhall

A free, open source chat app built for communities of any size.

Townhall aims to be a simple, privacy-respecting alternative to platforms like Discord. No ads, no AI training on your data, no forced identity verification. Just chat.

## Why Townhall?

- **Free and open source** — the code is public, forkable, and self-hostable
- **No tracking** — no analytics, no algorithms, no data harvesting
- **No identity verification** — no face scans, no ID uploads, no phone number required
- **Self-host or use hosted** — run it on your own server or use the hosted version

## Project Structure

This is a pnpm + Turborepo monorepo:

```
apps/
  web/          — Main chat app (Vite + React + TanStack Router)
  www/          — Marketing site & waitlist (Next.js)
  api/          — Hono API server
  realtime/     — Socket.IO realtime gateway

packages/
  api-client/   — Shared type-safe Hono API client
  auth/         — Better Auth configuration and helpers
  ui/           — Shared shadcn/ui component library
  db/           — Drizzle ORM schema & database client
  env/          — Type-safe environment variables (server/client)
  utils/        — Shared utility helpers
  typescript-config/ — Shared TypeScript configs
```

## Getting Started

```sh
# Install dependencies
pnpm install

# Copy env file and fill in values
cp .env.example .env

# Push database schema
pnpm db:push

# Start all apps in dev mode
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm check` | Run Biome linting and formatting checks |
| `pnpm check:fix` | Auto-fix Biome issues |
| `pnpm db:push` | Push Drizzle schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## License

MIT
