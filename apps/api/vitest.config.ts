import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

// Dummy values that satisfy `@repo/env/server`'s Zod schema so tests can
// load modules that transitively import it (e.g. `@repo/db`, `@repo/auth`).
// `env` is applied before any module is loaded, which is necessary because
// the env package parses `process.env` at import time. Nothing here is
// real — tests must not make outbound calls.
const TEST_ENV = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  BETTER_AUTH_SECRET: "test-secret-not-real",
  ANTHROPIC_API_KEY: "test",
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
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
})
