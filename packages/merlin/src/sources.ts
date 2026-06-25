import { and, cosineDistance, db, eq, isNotNull, schema } from "@repo/db"
import { tool } from "ai"
import { z } from "zod"
import { embedText } from "./embeddings"

// Track B retrieval: semantic search over ingested integration `source` rows
// (summaries of PRs, issues, releases, …). Embeddings live on the summary;
// full content is live-fetched by the connector layer (not here yet).

const SEARCH_DEFAULT_LIMIT = 6
const SEARCH_MAX_LIMIT = 15

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
    .where(
      and(
        eq(schema.source.workspaceId, workspaceId),
        eq(schema.source.status, "active"),
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
  }
}
