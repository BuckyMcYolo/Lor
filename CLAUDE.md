# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run build          # Build all packages (turbo)
pnpm run dev            # Start all dev servers (web on 3000, www on 3001)
pnpm run check          # Biome lint + format check
pnpm run check:fix      # Biome auto-fix
pnpm run check-types    # TypeScript type checking across all packages
```

## Architecture

This is a pnpm + Turborepo monorepo for **Lor** — the AI multiplayer workspace for teams.

### Workspaces

- `apps/web` — Next.js 16.1.6 main app (React 19, App Router, port 3000)
- `apps/www` — Next.js 16.1.6 marketing site (React 19, App Router, port 3001)
- `apps/api` — Hono API server (`@repo/api`), OpenAPI via `@hono/zod-openapi`
- `apps/realtime` — Socket.IO realtime gateway (`@repo/realtime`, defaults to port 8081)
- `packages/auth` — Auth package (`@repo/auth`), better-auth + Drizzle adapter
- `packages/db` — Database package (`@repo/db`), Drizzle ORM + Postgres
- `packages/env` — Environment validation (`@repo/env`), Zod schemas for server/client env
- `packages/ui` — Shared component library (`@repo/ui`), shadcn/ui + Tailwind CSS v4
- `packages/typescript-config` — Shared TypeScript configs

### API (`apps/api`)

- Build: `tsc && tsc-alias` (no bundler — workspace deps resolved via pnpm linking)
- Uses `@/*` path alias for `src/*` imports (e.g., `import foo from "@/lib/foo"`)
- `tsc-alias` with `resolveFullPaths: true` rewrites `@/*` to relative `.js` paths in `dist/`
- tsconfig overrides base with `module: "ESNext"` + `moduleResolution: "Bundler"` (no `.js` extensions in source)
- Dev: `tsx watch src/index.ts`

### Path Aliases

- **Only compiled packages** (like `apps/api`) should use path aliases (`@/*`). `tsc-alias` rewrites them at build time.
- **Uncompiled packages** (`packages/db`, `packages/env`, `packages/auth`, etc.) export raw `.ts` and must use relative imports. Node resolves these at runtime and cannot resolve path aliases.

### CSS/Tailwind (Single Source of Truth in `packages/ui`)

All CSS lives in `packages/ui`. Apps do NOT have their own `globals.css`.

- `packages/ui/src/styles/globals.css` — The one CSS file: `@import "tailwindcss"`, `@source` directives, `@import "tw-animate-css"`, `@custom-variant`, `@theme inline`, `:root`/`.dark` variables, `@layer base`
- `packages/ui/postcss.config.mjs` — Shared PostCSS config
- Apps import CSS in layout: `import "@repo/ui/globals.css"`
- Apps re-export PostCSS: `export { default } from "@repo/ui/postcss.config"`
- `@source` paths are relative to the CSS file location in `packages/ui/src/styles/`

### shadcn/ui

- `components.json` lives in `packages/ui` (style: new-york, base color: stone)
- Add components: `cd packages/ui && pnpm dlx shadcn@latest add <component>`
- Import: `import { Button } from "@repo/ui/components/button"`
- The UI package tsconfig has `"paths": { "@repo/ui/*": ["./src/*"] }` so the shadcn CLI resolves aliases correctly

### Biome (replaces ESLint + Prettier)

- 2-space indentation, double quotes, no semicolons, LF line endings
- `check` and `check:fix` are root-level Turbo tasks (`//#check`)
- `noExplicitAny: "error"`, `noNonNullAssertion: "error"`
- Run `pnpm run check:fix` after adding shadcn components (they need import reordering)

### Package Exports (`@repo/ui`)

```
./globals.css    → ./src/styles/globals.css
./postcss.config → ./postcss.config.mjs
./components/*   → ./src/components/*.tsx
./lib/*          → ./src/lib/*.ts
./hooks/*        → ./src/hooks/*.ts
```

PS. If u add/edit routes in the API, make sure to build the API Client as the frontend relies on this being built to be up to date.
Otherwise you will receive errors when type checking
