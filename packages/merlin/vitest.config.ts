import { defineConfig } from "vitest/config"

// Dummy values satisfying `@repo/env/server`'s Zod schema so tests that
// transitively import it (e.g. via `./index` → `@repo/db`) can load. `env` is
// applied before any module loads, since the env package parses `process.env` at
// import time. Nothing here is real — citation tests are pure (no DB/LLM/network),
// and any future DB-backed eval must point at a real test database explicitly.
// Keep these keys in sync with required fields in packages/env/src/server.ts.
const TEST_ENV = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  BETTER_AUTH_SECRET: "test-secret-not-real",
  ANTHROPIC_API_KEY: "test",
  OPENAI_API_KEY: "test",
  NEXT_PUBLIC_API_URL: "http://localhost:8080",
  S3_ENDPOINT: "http://localhost:9000",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  S3_BUCKET_NAME: "test",
  S3_PUBLIC_URL: "http://localhost:9000/test",
  RESEND_API_KEY: "test",
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: TEST_ENV,
  },
})
