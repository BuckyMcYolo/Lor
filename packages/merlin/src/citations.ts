// Pure citation-grounding logic — no DB, no env, no network. The DB lookups that
// decide whether a citation actually resolves live in index.ts (groundCitations);
// this module owns the parsing, the keep/strip/enrich decisions, and the inline
// encoding, so the citation contract is verifiable in isolation.

// Merlin's inline citations: [[/brain/page/path]], [[msg:<id>]], or [[src:<id>]]
// (a connected-tool source). The capture excludes ']' so a token can't swallow a
// following bracket.
export const CITATION_REGEX = /\[\[([^\]]+)\]\]/g

export type CitationKind = "page" | "msg" | "src"

// How a single cited token resolved. Pages/messages are a boolean existence
// check; a source carries its verified title + url (or null when unresolved),
// since we render it as a link.
export type Resolution =
  | { kind: "page"; exists: boolean }
  | { kind: "msg"; exists: boolean }
  | { kind: "src"; source: { title: string; url: string | null } | null }

// Classify a token by its prefix. Anything without a known prefix is a brain
// page path.
export function classifyToken(token: string): CitationKind {
  if (token.startsWith("src:")) return "src"
  if (token.startsWith("msg:")) return "msg"
  return "page"
}

// The id inside a prefixed token (msg:/src:), tolerating an already-enriched
// [[src:<id>|…]] form so re-grounding is idempotent. Not meaningful for pages.
export function prefixedTokenId(token: string): string {
  return token.slice(4).split("|")[0]?.trim() ?? ""
}

// The unique citation tokens in a block of text (trimmed, de-duplicated).
export function extractCitationTokens(text: string): Set<string> {
  const tokens = new Set<string>()
  for (const m of text.matchAll(CITATION_REGEX)) {
    const t = m[1]?.trim()
    if (t) tokens.add(t)
  }
  return tokens
}

// Strip the characters that would break a [[…]] token or its pipe-delimited
// inline encoding, so a source title/url can be carried in the citation safely.
export function sanitizeCitationField(value: string): string {
  return value
    .replace(/[[\]|\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Rewrite a block of text given each token's resolution. Valid page/message
// citations are kept (normalized); a valid source citation is enriched to
// [[src:<id>|<title>|<url>]] so the client can render a verified link with no
// second lookup. Hallucinated ones are unwrapped — pages to their plain path
// text, messages and sources dropped entirely (a bare id is noise) — so a
// fabricated citation can't pose as a source. `resolve` must return a verdict for
// every token (callers build it from extractCitationTokens).
export function rewriteCitations(
  text: string,
  resolve: (token: string) => Resolution
): { text: string; valid: number; invalid: number } {
  let valid = 0
  let invalid = 0
  const cleaned = text.replace(CITATION_REGEX, (_full, raw: string) => {
    const t = raw.trim()
    const r = resolve(t)
    if (r.kind === "src") {
      if (r.source) {
        valid++
        const title = sanitizeCitationField(r.source.title)
        const url = sanitizeCitationField(r.source.url ?? "")
        return `[[src:${prefixedTokenId(t)}|${title}|${url}]]`
      }
      invalid++
      return ""
    }
    if (r.exists) {
      valid++
      return `[[${t}]]`
    }
    invalid++
    return r.kind === "msg" ? "" : t
  })
  return { text: cleaned, valid, invalid }
}
