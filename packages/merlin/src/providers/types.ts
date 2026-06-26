import type { schema } from "@repo/db"

// The harness's view of a source + its connection when live-fetching content.
// Derived from the tables so they track schema changes.
export type SourceRef = Pick<
  typeof schema.source.$inferSelect,
  "kind" | "externalId" | "url"
>
export type ConnectionRef = Pick<
  typeof schema.integrationConnection.$inferSelect,
  "externalId"
>

// One integration provider. Add a connection by implementing this and
// registering it in ./index. (Ingestion lives provider-side in apps/api.)
export interface SourceProvider {
  // Live-fetch a source's full content (beyond its stored summary). Returns
  // null when unavailable — provider not configured, not found, or fetch failed.
  fetchContent(
    source: SourceRef,
    connection: ConnectionRef
  ): Promise<string | null>
}
