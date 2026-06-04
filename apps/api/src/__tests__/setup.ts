import { vi } from "vitest"

// Stub Redis so module-load and rate-limit middleware don't hang waiting
// on a connection that will never succeed in CI/test envs. The middleware
// already "fails open" when Redis is unavailable, so returning a rejecting
// client keeps the auth-guard tests working end-to-end.
vi.mock("@/lib/redis", () => ({
  getRedisClient: () => Promise.reject(new Error("redis disabled in tests")),
}))
