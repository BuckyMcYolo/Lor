import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  enforceDmMessageRateLimit,
  enforceWorkspaceMessageRateLimit,
} from "./rate-limit"

function createRedisMock(counts: number[]) {
  return {
    incr: vi.fn(async () => counts.shift() ?? 1),
    expire: vi.fn(async () => true),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-06-03T12:00:10.000Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("workspace message rate limits", () => {
  it("sets a TTL when a rate-limit window is first used", async () => {
    const redis = createRedisMock([1])

    await enforceWorkspaceMessageRateLimit(redis as never, {
      workspaceId: "workspace-1",
      userId: "user-1",
      role: "member",
    })

    expect(redis.incr).toHaveBeenCalledWith(
      "ratelimit:workspace:workspace-1:user:user-1:message:29674800"
    )
    expect(redis.expire).toHaveBeenCalledWith(
      "ratelimit:workspace:workspace-1:user:user-1:message:29674800",
      90
    )
  })

  it("falls back to the stricter member limit for unknown roles", async () => {
    const redis = createRedisMock([31])

    await expect(
      enforceWorkspaceMessageRateLimit(redis as never, {
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "guest",
      })
    ).rejects.toThrow("Rate limit exceeded. Try again in 50 seconds")
  })

  it("allows elevated workspace roles to use their higher limit", async () => {
    const redis = createRedisMock([31])

    await expect(
      enforceWorkspaceMessageRateLimit(redis as never, {
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "admin",
      })
    ).resolves.toBeUndefined()
  })
})

describe("DM message rate limits", () => {
  it("rejects messages above the DM limit", async () => {
    const redis = createRedisMock([46])

    await expect(
      enforceDmMessageRateLimit(redis as never, "user-1")
    ).rejects.toThrow("Rate limit exceeded. Try again in 50 seconds")
  })
})
