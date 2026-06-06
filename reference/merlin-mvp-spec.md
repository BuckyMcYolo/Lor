# Merlin MVP — Implementation Spec

**Status:** MVP build target. Concrete, buildable. Derived from and narrower than `merlin-architecture.md`.
**Audience:** the engineer/agent building the Merlin brain + harness.
**Relationship to `merlin-architecture.md`:** that document is the north-star architecture and remains the source of truth for the *vision* and the data-model rationale. This document is the *MVP cut* and **intentionally overrides** several "v1-locked" decisions in it. Where they conflict, this document wins for the MVP.

### What this MVP spec changes vs. `merlin-architecture.md`

| Topic | Architecture doc | **MVP decision** |
|---|---|---|
| Chat synthesis | Proactive, compile-time, background ("the tutor") | **Lazy / on-demand** — only when `@Merlin` is mentioned |
| Chat retrieval | Conversation chunks embedded as fallback layer | **Postgres FTS only** (no chat embeddings). Embeddings are a later, additive swap — *changes the tool, not the harness* |
| `conversation_chunks` table | In the data model | **Dropped** from MVP |
| `memory_events` log | Append-only, required | **Dropped** from MVP (revisit later); page updates kept non-destructive-ish via a `version` column |
| Integration ingestion | Summary + pointer (timing unstated) | **Eager** — meaningful events summarized + embedded into `sources` as they arrive |
| Reply placement | Not addressed | New: a cheap model decides **thread vs. main channel** |
| Grounding | Strict citations | **Conditional**: strict for institutional/truth questions, relaxed for general questions |
| Self-host / BYO-key | A first-class concern (AGPL) | **Out of scope** for MVP — product-first, cloud-only, our keys |
| Brain browser UI | Human-browsable | **Deferred** — agent-only brain for MVP |

Everything else in `merlin-architecture.md` (the three storage layers, pgvector-not-Qdrant, the filesystem-AND-graph brain, real folder/page nodes not path strings, taxonomy-as-data, summary-and-pointer + live-fetch for integrations, anchored code fetch, GitHub rate-limit client) carries forward unchanged.

---

## 1. The one principle

> **Embed the unit when the source emits discrete, high-signal units. Search live when the source emits a high-volume, low-signal stream. The synthesized brain compiles lazily, on demand.**

| Source | Volume | Unit | Strategy |
|---|---|---|---|
| Chat | high | none (stream) | live Postgres **FTS** (tsvector + trgm); no embeddings |
| Integrations (PR/issue/page) | low | the item | **eager** summarize + embed summary; live-fetch full content on demand |
| Code | huge | file@sha | anchored live-fetch (GitHub API) — *deferred past MVP* |
| Brain pages | low | the page | embedded; synthesized **lazily** on `@Merlin` |

The harness is the moat. Tools, context construction, steering, and grounding/verification are where quality lives — not in always reaching for the strongest model. The MVP is built so the *retrieval mechanism behind a tool* can change (FTS → embeddings, API → ephemeral clone) without touching the harness.

---

## 2. MVP scope

**In:**
- The brain: `nodes` (folder/page tree) + `edges` (typed graph) + pgvector embeddings on pages.
- The harness: a model-driven tool loop (Claude) over the brain + chat + sources, with conditional grounding/verification.
- The `@Merlin` invocation loop end-to-end: trigger → triage → retrieve → reason → answer (streamed into chat) → reply-placement → async write-back (streamed to UI as "Merlin remembered this").
- Integration ingestion **contract + data model** (`sources`, `integration_connections`): eager summarize + embed of meaningful events. **The connectors themselves are a parallel track owned by Jacob**; this spec defines the `sources` shape both tracks meet at.

**Out (deferred):**
- Brain browser UI (agent-only brain for now).
- Chat embeddings / `conversation_chunks` (FTS instead).
- `memory_events` append-only log.
- Anchored code search / repo-map / SHA-pinned code citation (§7 of the architecture doc) — GitHub enters the MVP only as a *source* (PRs/issues summarized into `sources`), not as code search.
- Self-host / BYO-key / provider abstraction.
- Compaction / decay job class.
- A formal eval set. **Note:** we *will* need a seed eval set (real questions + expected citations) to validate the harness-as-moat thesis — call it out as required-soon, not MVP-blocking.

---

## 3. The invocation loop (heart of the MVP)

Stateless per invocation. The only persistent state is the brain in Postgres.

```
1. TRIGGER     realtime detects @Merlin mention → enqueues a `merlin-respond` job (per-workspace serialized)
2. TRIAGE      (Haiku) classify the question:
                 • grounding_mode: "institutional" (about this workspace) | "general" (world knowledge / how-to / chit-chat)
                 • seed retrieval hints (keywords, entities)
3. RETRIEVE    embed the question (OpenAI 3-small) → vector pre-fetch top-k over page + source embeddings → seed context.
                 Also load: the thread/channel context Merlin was summoned in.
4. HARNESS     (Sonnet; escalate to Opus for hard cases) tool loop:
                 brain tools (ls/read/tree/write/mkdir/move/link),
                 chat tools (search_messages/read_thread/fetch_recent_messages),
                 source tools (search_sources/fetch_source).
                 Drafts an answer. If grounding_mode = institutional, answer MUST cite real sources or admit "nothing in memory."
5. VERIFY      harness validates every citation resolves to a real message/page/source id. Reject + retry on dangling cites.
6. ANSWER      stream the answer into chat (token-by-token via realtime socket).
7. PLACEMENT   (cheap model) decide thread vs. main channel based on question/answer complexity + broad usefulness.
                 Default: reply in-thread. Promote to main channel when broadly useful (a decision, a team-wide FYI).
8. WRITE-BACK  (async, after the answer ships; Sonnet) decide if anything durable should be written/updated in the brain.
                 Do it (write/mkdir/link), re-embed changed pages, then emit a `merlin_memory_written` event to the UI.
9. SLEEP       invocation ends. No persistent process.
```

Key properties:
- **Answer latency is decoupled from write-back.** Users wait only for steps 1–6. Step 8 runs after.
- **Write-back is visible.** Step 8 emits a UI event (`merlin_memory_written`: `{ action: created|updated, path, title, learned }`) so users see "🧠 Merlin remembered: <title>" under the answer. This surfaces the compounding moat in-product.
- **Per-workspace serialization** of write-backs avoids races on the `(workspace_id, parent_id, name)` uniqueness and conflicting page edits. Reads/answers can run in parallel.

### 3.1 Triage & the two cheap-model decisions

Two cheap (Haiku) decisions wrap the expensive loop:

- **Grounding mode (pre-flight).** Institutional questions ("what did we decide about X", "who owns Y", "why did Z break") → strict grounding: cite real sources or say "I don't have anything in memory about that." General questions ("write a regex for emails", "what's a good name for this") → answer freely, grounding optional. The product must not refuse or over-hedge general questions — that makes it worse. The classifier draws this line.
- **Reply placement (post-draft or folded into triage).** thread vs. main channel. Provisional: run it *after* the answer is drafted so it can weigh answer complexity/usefulness, not just the question. Default in-thread; promote to channel when everyone benefits.

Both are provisional in *where they run* and can be tuned; what's fixed is that they exist and use a cheap model.

---

## 4. The harness

A model-driven tool-use loop (Anthropic SDK, Claude). Built cleanly against Claude's tool API; tool *definitions* and *orchestration* kept model-agnostic in shape (no multi-provider abstraction layer in MVP).

**Tools** (all scoped to the invocation's `workspace_id`):

*Brain (over `nodes`/`edges`):*
- `ls(path)` → immediate children of a folder
- `read(path)` → a page's body + metadata + provenance
- `tree(path, depth)` → structure overview
- `write(path, body, metadata?)` → create or update a page (re-embeds on body change)
- `mkdir(path)` → create a folder
- `move(src, dst)` → move a node
- `link(fromPath, toPath, type)` → create a typed edge (`supersedes` | `relates_to` | `caused_by` | `decided_in` | …; type is free text, conventional values documented)

*Chat (over `message`, via FTS):*
- `search_messages(query, { channelId?, authorId?, before?, after?, limit? })` → ranked snippets + message ids (websearch_to_tsquery + ts_rank; trgm fuzzy fallback)
- `read_thread(messageId | threadRootId)` → full thread
- `fetch_recent_messages(channelId, n, { before? })` → recent N messages in a channel/thread (the conversational-context tool)

*Sources (over `sources`):*
- `search_sources(query, { provider? })` → vector + keyword over source summaries
- `fetch_source(sourceId)` → **live-fetch** full current content by following the pointer through the integration connection (short-term cached). Embedded summary is for *recall*; live content is for *correctness*.

**Loop control:** bounded tool iterations (start ~20) and a token budget; must terminate in an answer. Model tiering: Sonnet default → escalate to Opus for hard/contested cases (and swap default to Opus if Sonnet underperforms in practice); Haiku for triage/placement/summarization.

**Grounding / citation contract (provisional — to be hardened):**
- Institutional answers carry citations to real `message` / `node` / `source` ids.
- The harness **verifies** every cited id exists before posting; dangling citations → reject and retry. This verification layer is the main thing that makes a weaker model trustworthy here.
- Exact citation representation (inline markers? a structured `citations[]` payload?) is **not finalized** — we'll work it out during build. The fixed requirement is: real-id-backed and harness-validated for institutional answers; not required for general answers.

---

## 5. Data model (MVP, indicative Drizzle shapes)

Postgres 16 + pgvector. UUID PKs (`.defaultRandom()`), matching existing tables. Embedding dim **1536** (OpenAI `text-embedding-3-small`) → `vector(1536)`, HNSW indexes. New tables prefixed `merlin_`.

- **`merlin_node`** — the brain tree.
  - `id`, `workspaceId` (fk → workspace, cascade), `kind` (`folder` | `page`), `parentId` (self-ref, null for roots), `name`
  - page-only: `body` (text), `metadata` (jsonb default `{}`), `embedding` (`vector(1536)`)
  - `status` (`active` | `archived`, default `active`) — supports archive-not-delete + future decay without a migration
  - `version` (int, default 1) — bumps on body update; minimal door-open for versioning/audit without `memory_events`
  - `createdAt`, `updatedAt`
  - unique `(workspaceId, parentId, name)`; index `(workspaceId, parentId)` for `ls`; HNSW on `embedding`
- **`merlin_edge`** — typed graph between page nodes.
  - `id`, `workspaceId`, `fromNodeId`, `toNodeId`, `type` (text), `metadata` (jsonb), `createdAt`
  - unique `(fromNodeId, toNodeId, type)`; indexes on `(workspaceId, fromNodeId)` and `(workspaceId, toNodeId)`
- **`merlin_source`** — provenance / integration pointers, **embedded**.
  - `id`, `workspaceId`, `provider` (text discriminator: `github` | `linear` | `notion` | …; drives UI icon), `externalId`, `url`, `title`, `summary`, `embedding` (`vector(1536)`), `metadata` (jsonb — provider-specific: PR review state, Linear cycle, Notion props, etc.), `lastFetchedAt`, `createdAt`, `updatedAt`
  - unique `(workspaceId, provider, externalId)`; HNSW on `embedding`
- **`merlin_page_source`** — polymorphic provenance join (a page has many sources).
  - `id`, `workspaceId`, `pageId` (fk → merlin_node)
  - exactly one of: `messageId` (fk → message) **or** `sourceId` (fk → merlin_source). (Code locations are `merlin_source` rows with `provider=github` + repo/sha/path/line_range in metadata — deferred, but the shape already supports it.)
  - index on `pageId`
- **`merlin_integration_connection`** — per-provider auth/config (separate from sources; **Jacob's track**).
  - `id`, `workspaceId`, `provider`, `credentials` (jsonb, encrypted at rest), `config` (jsonb), `syncCursor`, `rateLimitState` (jsonb), `status`, `createdAt`, `updatedAt`
  - unique `(workspaceId, provider)`

**Existing-table touches:**
- **`user`**: add `isBot` (boolean, default false). Seed one global **Merlin** bot user; Merlin's chat messages have `authorId = merlinUserId`. Bot bypasses workspace-membership checks (implicitly present in every workspace).
- **`message`**: add a generated `tsvector` column (e.g. `to_tsvector('english', content)`) + GIN index for ranked FTS via `websearch_to_tsquery`. Keep the existing `message_content_trgm_idx` for fuzzy fallback.
- **pgvector**: enable the extension (migration), add to `packages/db`.

**Not in MVP:** `conversation_chunks`, `memory_events`.

---

## 6. Integration ingestion (contract for the parallel track)

Eager, event-driven, but **never indiscriminate**. Each provider adapter defines (1) its *unit* and (2) a cheap salience filter for which events on that unit are worth a Haiku summarization call.

- GitHub: PR opened/merged, release → yes; force-pushes, CI pings → no.
- Linear: issue created, moved to Done, reassigned → yes; label/typo edits → no.
- Notion: page created / meaningfully edited (debounced) → yes; every autosave → no.

Per meaningful event: summarize (Haiku) → upsert a `merlin_source` row (summary + pointer + metadata) → embed the summary. **We embed the summary, not the document.** Full current content is live-fetched on demand via `fetch_source`. Consequence to hold onto: a stale summary only ever hurts *recall* (finding the item), never *correctness* (the answer live-fetches). Re-summarize/re-embed on status-level update events; ignore noise.

Cross-source synthesis into brain **pages** stays **lazy** (write-back step), even though source ingestion is eager. Eager ingestion populates the *retrieval layer*; it does not eagerly compile pages.

**Permissions:** integration connections are workspace-level; synthesized understanding and stored summaries are workspace-visible regardless of the source item's own ACL. Accepted tradeoff (all channels are public-to-workspace in v1).

---

## 7. Topology

- **`packages/merlin`** — the core. Harness, tool implementations, retrieval, triage/placement, write-back logic, prompt assembly. Takes a `db` and a model client. No HTTP, no sockets. *This is the thing we're really building.*
- **`apps/worker`** — runs it. New `merlin-respond` BullMQ queue (mirrors the existing `link-unfurl` pattern). Job = the full invocation loop (§3), including the async write-back as a continuation. Per-workspace serialization for write safety.
- **`apps/realtime`** — detects `@Merlin` mentions (mention parsing + `messageMention` already exist), enqueues the job, and relays streamed output. Answer tokens and `merlin_memory_written` events flow worker → Redis pub/sub → realtime → client socket.
- **`apps/api`** — nothing new for MVP (read-only brain-browse endpoints come with the deferred UI).
- **Merlin bot identity** — the global `isBot` user from §5.

---

## 8. Default brain taxonomy (seed)

Keep it minimal and domain-agnostic — Lor must not be locked to software teams. Seed each new workspace's brain with a tiny scaffold and let Merlin grow it (taxonomy is data, not schema):

- **Provisional seed:** `/people`, `/decisions`. Both are generic across any team.
- Merlin may create any other top-level namespace as a workspace reveals structure (`/projects`, `/systems`, `/customers`, …).
- This is just seed rows — trivially changeable. **Open question to settle during build:** seed `/people` + `/decisions`, or seed only `/people` and let the LLM build everything else? Lean minimal.

---

## 9. Models & cost posture

- **Embeddings:** OpenAI `text-embedding-3-small` (1536). Cheapest/fastest with good-enough quality.
- **Main loop:** Claude **Sonnet** (`claude-sonnet-4-6`) default; **Opus** for hard/contested cases (and promote to default if Sonnet underperforms).
- **Triage / placement / summarization:** Claude **Haiku** (`claude-haiku-4-5`).
- **Ingestion is never metered** (product principle). Per-event integration summarization is cheap and bounded at team scale; it's the moat-builder.
- (Prompt-caching of system prompt / tool defs / brain context is a known cost lever — **explicitly out of this spec for now**.)

---

## 10. Build order

**Track A — brain + harness (the first real code; this spec's primary work):**
1. pgvector extension + `merlin_node` / `merlin_edge` schema + HNSW indexes; Merlin `isBot` user; `message` tsvector column.
2. `packages/merlin`: brain tools (`ls`/`read`/`tree`/`write`/`mkdir`/`move`/`link`) over `nodes`/`edges`.
3. Chat tools (`search_messages` FTS, `read_thread`, `fetch_recent_messages`).
4. Retrieval: question embedding → vector pre-fetch over pages → context assembly.
5. The harness loop (Sonnet) with conditional grounding + citation verification → drafts/answers.
6. Triage (Haiku grounding-mode) + reply-placement (cheap model) wrappers.
7. Wire-up: `merlin-respond` worker job + realtime mention trigger + streamed answer.
8. Async write-back pass + `merlin_memory_written` UI event + re-embed on page write + per-workspace serialization.

**Track B — integrations (parallel, Jacob-owned):**
- `merlin_integration_connection` + `merlin_source` + `merlin_page_source` schema.
- Per-provider connectors (auth, webhooks/polling, salience filter) → eager summarize (Haiku) + embed → `sources`.
- `search_sources` / `fetch_source` tools meet Track A at the `sources` contract (§5/§6).

---

## 11. Non-negotiables (MVP)

- **Never embed individual messages.** MVP embeds only pages + source summaries; chat is FTS.
- **pgvector, embedding-as-column.** No second datastore.
- **Tree (`parent_id`) and graph (`edges`) stay separate.** Folders/pages are real node kinds.
- **Taxonomy is data, not schema.**
- **Integration data = summary + pointer + live-fetch**, eager-ingested, never mirrored. One shared `sources` table + `provider` discriminator + JSONB.
- **Lazy synthesis** — no compile-time background synthesis of chat; it happens on `@Merlin`.
- **Institutional answers are grounded + harness-verified; general answers are answered freely.**
- **Write-back is async and visible** ("Merlin remembered this").
- **Never hard-delete brain content** — `status=archived`, `version` bumps. (Full event log deferred.)
- **The retrieval behind a tool is swappable without touching the harness** (FTS→embeddings, API→clone).
