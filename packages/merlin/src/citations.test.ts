import { describe, expect, it } from "vitest"
import {
  classifyToken,
  extractCitationTokens,
  prefixedTokenId,
  type Resolution,
  rewriteCitations,
  sanitizeCitationField,
} from "./citations"

// Eval harness — citation contract (Layer 1). These are deterministic: they
// exercise the pure grounding logic with stubbed resolutions, so no DB / LLM /
// network is touched. The DB-backed end-to-end eval (seeded workspace → real
// resolveSourceCitation/pageExists) is the next tier and is gated separately.

// A resolve() that looks tokens up in a plain map, mirroring how groundCitations
// builds its resolution map from the DB. Falls back to "missing" so an
// unexpected token is treated as a hallucination, never kept.
function resolverFrom(map: Record<string, Resolution>) {
  return (token: string): Resolution => {
    const known = map[token]
    if (known) return known
    const kind = classifyToken(token)
    return kind === "src"
      ? { kind: "src", source: null }
      : { kind, exists: false }
  }
}

const VALID_SRC = (title: string, url: string | null): Resolution => ({
  kind: "src",
  source: { title, url },
})

describe("classifyToken", () => {
  it("routes by prefix, defaulting to a brain page", () => {
    expect(classifyToken("src:abc")).toBe("src")
    expect(classifyToken("msg:abc")).toBe("msg")
    expect(classifyToken("/decisions/auth")).toBe("page")
  })
})

describe("prefixedTokenId", () => {
  it("strips the 4-char prefix and any enrichment suffix", () => {
    expect(prefixedTokenId("msg:abc-123")).toBe("abc-123")
    expect(prefixedTokenId("src:abc-123")).toBe("abc-123")
    // Idempotent: an already-enriched source token yields the bare id.
    expect(prefixedTokenId("src:abc-123|My PR|https://x.test/1")).toBe(
      "abc-123"
    )
  })
})

describe("extractCitationTokens", () => {
  it("collects unique, trimmed tokens", () => {
    const tokens = extractCitationTokens(
      "see [[/a]] and [[ /a ]] and [[msg:1]] plus [[src:2]]"
    )
    expect([...tokens].sort()).toEqual(["/a", "msg:1", "src:2"])
  })

  it("returns empty when there are no citations", () => {
    expect(extractCitationTokens("no citations here").size).toBe(0)
  })
})

describe("sanitizeCitationField", () => {
  it("removes characters that would break the [[…]] encoding", () => {
    expect(sanitizeCitationField("a]b|c[d")).toBe("a b c d")
    expect(sanitizeCitationField("line1\nline2\r\nline3")).toBe(
      "line1 line2 line3"
    )
    expect(sanitizeCitationField("  spaced   out  ")).toBe("spaced out")
  })
})

describe("rewriteCitations — brain pages", () => {
  it("keeps a valid page citation and counts it valid", () => {
    const r = rewriteCitations(
      "decided in [[/decisions/auth]].",
      resolverFrom({ "/decisions/auth": { kind: "page", exists: true } })
    )
    expect(r.text).toBe("decided in [[/decisions/auth]].")
    expect(r).toMatchObject({ valid: 1, invalid: 0 })
  })

  it("unwraps an unresolved page to its plain path (not dropped)", () => {
    const r = rewriteCitations(
      "see [[/made/up]] please",
      resolverFrom({ "/made/up": { kind: "page", exists: false } })
    )
    expect(r.text).toBe("see /made/up please")
    expect(r).toMatchObject({ valid: 0, invalid: 1 })
  })
})

describe("rewriteCitations — messages", () => {
  it("keeps a valid message citation", () => {
    const r = rewriteCitations(
      "as noted [[msg:abc]]",
      resolverFrom({ "msg:abc": { kind: "msg", exists: true } })
    )
    expect(r.text).toBe("as noted [[msg:abc]]")
    expect(r).toMatchObject({ valid: 1, invalid: 0 })
  })

  it("drops an unresolved message entirely (a bare id is noise)", () => {
    const r = rewriteCitations(
      "as noted [[msg:ghost]] today",
      resolverFrom({ "msg:ghost": { kind: "msg", exists: false } })
    )
    expect(r.text).toBe("as noted  today")
    expect(r).toMatchObject({ valid: 0, invalid: 1 })
  })
})

describe("rewriteCitations — sources", () => {
  it("enriches a valid source with its verified title + url", () => {
    const r = rewriteCitations(
      "shipped in [[src:pr-1]].",
      resolverFrom({ "src:pr-1": VALID_SRC("Add OAuth", "https://gh.test/1") })
    )
    expect(r.text).toBe("shipped in [[src:pr-1|Add OAuth|https://gh.test/1]].")
    expect(r).toMatchObject({ valid: 1, invalid: 0 })
  })

  it("enriches a source with a null url to an empty url field", () => {
    const r = rewriteCitations(
      "[[src:pr-2]]",
      resolverFrom({ "src:pr-2": VALID_SRC("No link", null) })
    )
    expect(r.text).toBe("[[src:pr-2|No link|]]")
    expect(r).toMatchObject({ valid: 1, invalid: 0 })
  })

  it("sanitizes a source title that contains breaking characters", () => {
    const r = rewriteCitations(
      "[[src:pr-3]]",
      resolverFrom({
        "src:pr-3": VALID_SRC("Fix [a] | b", "https://gh.test/3"),
      })
    )
    expect(r.text).toBe("[[src:pr-3|Fix a b|https://gh.test/3]]")
  })

  it("drops a hallucinated / cross-tenant / revoked source (null resolution)", () => {
    const r = rewriteCitations(
      "supposedly [[src:fake]] here",
      resolverFrom({ "src:fake": { kind: "src", source: null } })
    )
    expect(r.text).toBe("supposedly  here")
    expect(r).toMatchObject({ valid: 0, invalid: 1 })
  })

  it("is idempotent — re-grounding an enriched token keeps the same id", () => {
    const enriched = "[[src:pr-1|Add OAuth|https://gh.test/1]]"
    const r = rewriteCitations(
      enriched,
      // The enriched token still resolves, and prefixedTokenId recovers the bare
      // id ("pr-1") so the re-emitted token doesn't accrete its own suffix.
      resolverFrom({
        "src:pr-1|Add OAuth|https://gh.test/1": VALID_SRC(
          "Add OAuth",
          "https://gh.test/1"
        ),
      })
    )
    expect(r.text).toBe(enriched)
    expect(r).toMatchObject({ valid: 1, invalid: 0 })
  })
})

describe("rewriteCitations — mixed + edge cases", () => {
  it("handles a mix of valid and invalid citations of every kind", () => {
    const r = rewriteCitations(
      "page [[/d/auth]] msg [[msg:m1]] src [[src:s1]] bad-page [[/x]] bad-msg [[msg:m2]] bad-src [[src:s2]]",
      resolverFrom({
        "/d/auth": { kind: "page", exists: true },
        "msg:m1": { kind: "msg", exists: true },
        "src:s1": VALID_SRC("PR one", "https://gh.test/s1"),
        "/x": { kind: "page", exists: false },
        "msg:m2": { kind: "msg", exists: false },
        "src:s2": { kind: "src", source: null },
      })
    )
    expect(r.text).toBe(
      "page [[/d/auth]] msg [[msg:m1]] src [[src:s1|PR one|https://gh.test/s1]] bad-page /x bad-msg  bad-src "
    )
    expect(r).toMatchObject({ valid: 3, invalid: 3 })
  })

  it("returns text unchanged when there are no citations", () => {
    const r = rewriteCitations("plain answer, no sources", resolverFrom({}))
    expect(r).toEqual({
      text: "plain answer, no sources",
      valid: 0,
      invalid: 0,
    })
  })
})
