# Lor

The AI multiplayer workspace for teams.

Lor is a chat-first workspace for software teams. Chat is the interface; **Merlin** — the resident AI agent — is the product. It indexes everything that happens in your workspace (messages, threads, voice transcripts, integrations) and answers questions about your team's history, decisions, and ongoing work. Think "Glean for small teams," open-source and self-hostable.

## Why Lor?

- **Open source & self-hostable** — AGPL-licensed; run it on your own infra or use the hosted version
- **Chat-native institutional memory** — Merlin lives where the work happens, not behind a separate search bar
- **For software teams** — not a community-chat platform; designed around how engineering orgs actually communicate

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

AGPL-3.0
