import { beforeEach, describe, expect, it, vi } from "vitest"
import { isSafeUrl, matchProxyRule } from "./link-unfurl-url"

const lookupMock = vi.hoisted(() => vi.fn())

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

beforeEach(() => {
  lookupMock.mockReset()
})

describe("isSafeUrl", () => {
  it("rejects unsupported protocols without DNS lookup", async () => {
    await expect(isSafeUrl("file:///etc/passwd")).resolves.toBe(false)
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it("rejects localhost and private IP hosts without DNS lookup", async () => {
    await expect(isSafeUrl("http://localhost:8080")).resolves.toBe(false)
    await expect(isSafeUrl("https://127.0.0.1/admin")).resolves.toBe(false)
    await expect(isSafeUrl("https://10.0.0.5/metadata")).resolves.toBe(false)
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it("allows public hosts that resolve to public IPs", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])

    await expect(isSafeUrl("https://example.com/post")).resolves.toBe(true)

    expect(lookupMock).toHaveBeenCalledWith("example.com", { all: true })
  })

  it("rejects public hostnames that resolve to private IPs", async () => {
    lookupMock.mockResolvedValue([{ address: "192.168.1.20", family: 4 }])

    await expect(isSafeUrl("https://example.com/post")).resolves.toBe(false)
  })

  it("rejects malformed URLs", async () => {
    await expect(isSafeUrl("not a url")).resolves.toBe(false)
  })
})

describe("matchProxyRule", () => {
  it("routes X and Twitter URLs through the configured OG proxy", () => {
    expect(matchProxyRule("https://x.com/lor/status/1")).toEqual({
      fetchUrl: "https://fxtwitter.com/lor/status/1",
      siteName: "X (formerly Twitter)",
    })
    expect(matchProxyRule("https://twitter.com/lor/status/1?lang=en")).toEqual({
      fetchUrl: "https://fxtwitter.com/lor/status/1?lang=en",
      siteName: "X (formerly Twitter)",
    })
  })

  it("returns null when no proxy is configured", () => {
    expect(matchProxyRule("https://example.com/article")).toBeNull()
  })
})
