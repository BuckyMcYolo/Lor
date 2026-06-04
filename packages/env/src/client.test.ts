import { afterEach, describe, expect, it, vi } from "vitest"

const DEFAULT_MAX_FILE_UPLOAD_SIZE = 20 * 1024 * 1024

async function loadClientEnv(overrides: Partial<Record<string, string>> = {}) {
  vi.resetModules()
  vi.stubEnv("NODE_ENV", overrides.NODE_ENV ?? "test")
  vi.stubEnv(
    "NEXT_PUBLIC_API_URL",
    overrides.NEXT_PUBLIC_API_URL ?? "api.lor.test"
  )
  vi.stubEnv(
    "NEXT_PUBLIC_REALTIME_URL",
    overrides.NEXT_PUBLIC_REALTIME_URL ?? "localhost:8081"
  )

  if (Object.hasOwn(overrides, "NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE")) {
    vi.stubEnv(
      "NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE",
      overrides.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE
    )
  } else {
    vi.stubEnv("NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE", undefined)
  }

  if (Object.hasOwn(overrides, "NEXT_PUBLIC_SELF_HOSTED")) {
    vi.stubEnv("NEXT_PUBLIC_SELF_HOSTED", overrides.NEXT_PUBLIC_SELF_HOSTED)
  } else {
    vi.stubEnv("NEXT_PUBLIC_SELF_HOSTED", undefined)
  }

  return (await import("./client")).env
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("client env", () => {
  it("adds https to public hosts and http to localhost hosts", async () => {
    const env = await loadClientEnv({
      NEXT_PUBLIC_API_URL: "api.lor.test",
      NEXT_PUBLIC_REALTIME_URL: "localhost:8081",
    })

    expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.lor.test")
    expect(env.NEXT_PUBLIC_REALTIME_URL).toBe("http://localhost:8081")
  })

  it("preserves explicit http and websocket protocols", async () => {
    const env = await loadClientEnv({
      NEXT_PUBLIC_API_URL: " http://localhost:8080 ",
      NEXT_PUBLIC_REALTIME_URL: "wss://realtime.lor.test",
    })

    expect(env.NEXT_PUBLIC_API_URL).toBe("http://localhost:8080")
    expect(env.NEXT_PUBLIC_REALTIME_URL).toBe("wss://realtime.lor.test")
  })

  it("coerces boolean and numeric public settings", async () => {
    const env = await loadClientEnv({
      NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE: "1024",
      NEXT_PUBLIC_SELF_HOSTED: "1",
    })

    expect(env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE).toBe(1024)
    expect(env.NEXT_PUBLIC_SELF_HOSTED).toBe(true)
  })

  it("uses the default upload limit when the public value is not set", async () => {
    const env = await loadClientEnv()

    expect(env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE).toBe(
      DEFAULT_MAX_FILE_UPLOAD_SIZE
    )
  })
})
