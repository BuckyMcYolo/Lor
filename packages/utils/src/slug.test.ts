import { describe, expect, it } from "vitest"
import { sluggify } from "./slug"

describe("sluggify", () => {
  it("normalizes text into a URL-safe slug", () => {
    expect(sluggify("  Hello, Lor Team!!  ")).toBe("hello-lor-team")
  })

  it("collapses repeated whitespace and dashes", () => {
    expect(sluggify("Ship   fast --- keep moving")).toBe(
      "ship-fast-keep-moving"
    )
  })

  it("trims dangling dashes after max-length truncation", () => {
    expect(sluggify("alpha beta gamma", 11)).toBe("alpha-beta")
  })
})
