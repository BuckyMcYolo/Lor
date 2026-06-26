import { anthropic } from "@ai-sdk/anthropic"
import { and, cosineDistance, db, eq, isNotNull, schema } from "@repo/db"
import { generateText, tool } from "ai"
import { z } from "zod"
import { embedText } from "./embeddings"
import { getSourceProvider } from "./providers"

// Track B: ingest meaningful integration events into `source` rows (summary +
// pointer + embedding) and search them semantically. Embed the summary, not the
// document; full content is live-fetched by the connector layer (not here yet).

const SEARCH_DEFAULT_LIMIT = 6
const SEARCH_MAX_LIMIT = 15
// Cheap model summarizes each event into embed-friendly memory.
const SUMMARY_MODEL = "claude-haiku-4-5"

export type SourceHit = {
  id: string
  kind: string
  title: string
  author: string | null
  url: string | null
  when: string | null
  summary: string
}

export async function searchSources(
  workspaceId: string,
  queryEmbedding: number[],
  limit: number
): Promise<SourceHit[]> {
  const distance = cosineDistance(schema.source.embedding, queryEmbedding)
  const rows = await db
    .select({
      id: schema.source.id,
      kind: schema.source.kind,
      title: schema.source.title,
      author: schema.source.author,
      url: schema.source.url,
      occurredAt: schema.source.occurredAt,
      createdAt: schema.source.createdAt,
      summary: schema.source.summary,
    })
    .from(schema.source)
    // Join the connection so a revoked/suspended integration's sources drop out.
    .innerJoin(
      schema.integrationConnection,
      eq(schema.source.connectionId, schema.integrationConnection.id)
    )
    .where(
      and(
        eq(schema.source.workspaceId, workspaceId),
        eq(schema.source.status, "active"),
        eq(schema.integrationConnection.status, "active"),
        isNotNull(schema.source.embedding)
      )
    )
    .orderBy(distance)
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    author: r.author,
    url: r.url,
    when: (r.occurredAt ?? r.createdAt).toISOString(),
    summary: r.summary,
  }))
}

export function buildSourceTools(workspaceId: string) {
  return {
    search_sources: tool({
      description:
        "Search summarized activity from the team's connected integrations (e.g. GitHub pull requests, issues, releases). Semantic search; returns matching items with title, summary, author, date, and a url. Cite a source by linking its url.",
      inputSchema: z.object({
        query: z.string().describe("what to look for"),
        limit: z
          .number()
          .int()
          .optional()
          .describe("max results, 1–15 (default 6)"),
      }),
      execute: async ({ query, limit }) => {
        try {
          const n = Math.min(
            Math.max(limit ?? SEARCH_DEFAULT_LIMIT, 1),
            SEARCH_MAX_LIMIT
          )
          return await searchSources(workspaceId, await embedText(query), n)
        } catch {
          return { error: "search failed" }
        }
      },
      strict: true,
    }),
    fetch_source: tool({
      description:
        "Fetch a source's full content (the complete PR/issue/release body and discussion), beyond the summary from search_sources. Pass a source id. Returns a `live` flag: when false the integration was unreachable and `content` falls back to the stored summary.",
      inputSchema: z.object({
        id: z.string().describe("a source id from search_sources"),
      }),
      execute: async ({ id }) => {
        try {
          return await fetchSourceContent(workspaceId, id)
        } catch {
          return { error: "fetch failed" }
        }
      },
      strict: true,
    }),
  }
}

// Live-fetch a source's full content via its provider, scoped to the workspace.
// Falls back to the stored summary when the provider can't fetch (unconfigured
// or error), so the model always gets something usable.
export async function fetchSourceContent(workspaceId: string, id: string) {
  const row = await db
    .select({
      provider: schema.source.provider,
      kind: schema.source.kind,
      externalId: schema.source.externalId,
      url: schema.source.url,
      title: schema.source.title,
      summary: schema.source.summary,
      connectionExternalId: schema.integrationConnection.externalId,
    })
    .from(schema.source)
    .innerJoin(
      schema.integrationConnection,
      eq(schema.source.connectionId, schema.integrationConnection.id)
    )
    .where(
      and(
        eq(schema.source.id, id),
        eq(schema.source.workspaceId, workspaceId),
        eq(schema.source.status, "active"),
        eq(schema.integrationConnection.status, "active")
      )
    )
    .limit(1)
    .then((r) => r[0])
  if (!row) return { error: "source not found" }

  const provider = getSourceProvider(row.provider)
  const fetched = provider
    ? await provider
        .fetchContent(
          { kind: row.kind, externalId: row.externalId, url: row.url },
          { externalId: row.connectionExternalId }
        )
        .catch(() => null)
    : null

  return {
    title: row.title,
    url: row.url,
    kind: row.kind,
    content: fetched ?? row.summary,
    live: fetched !== null,
  }
}

// Derived from the table so it tracks schema changes. The connector supplies the
// stored columns (minus the ones we compute/auto-fill) plus raw `content`.
export type IngestSourceInput = Omit<
  typeof schema.source.$inferInsert,
  "id" | "summary" | "embedding" | "status" | "createdAt" | "updatedAt"
> & {
  // Raw text to summarize (e.g. PR title + body). The summary is what's embedded.
  content: string
}

// Chars of raw content to keep if summarization is unavailable.
const SUMMARY_FALLBACK_MAX = 1000

async function summarize(input: IngestSourceInput): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic(SUMMARY_MODEL),
      prompt: `Summarize this ${input.provider} ${input.kind} for a team's institutional memory in 2–4 sentences: what changed or was decided, who did it, and why it matters. Be factual and specific; no preamble.\n\nTitle: ${input.title}\nAuthor: ${input.author ?? "unknown"}\n\n${input.content}`,
    })
    return text.trim()
  } catch {
    // LLM unavailable — fall back to truncated raw content so the ingest still
    // succeeds (a better summary lands on the next re-delivery/edit).
    return input.content.trim().slice(0, SUMMARY_FALLBACK_MAX)
  }
}

// Summarize → embed → upsert a source. Idempotent on (workspace, provider,
// externalId), so re-delivered/edited events update in place.
export async function ingestSource(input: IngestSourceInput): Promise<void> {
  const summary = await summarize(input)
  const embedding = await embedText(summary).catch(() => null)

  const { content: _content, ...columns } = input
  await db
    .insert(schema.source)
    .values({ ...columns, summary, embedding, status: "active" })
    .onConflictDoUpdate({
      target: [
        schema.source.workspaceId,
        schema.source.provider,
        schema.source.externalId,
      ],
      set: {
        title: input.title,
        url: input.url ?? null,
        author: input.author ?? null,
        occurredAt: input.occurredAt ?? null,
        summary,
        status: "active",
        // Only overwrite the embedding when we have a fresh one — don't null out
        // a previously-good embedding if embedText failed on this re-delivery.
        ...(embedding ? { embedding } : {}),
      },
    })
}
