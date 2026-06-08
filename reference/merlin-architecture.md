# Merlin Memory & Knowledge Architecture — Implementation Spec

**Status:** v1 design, locked. Ready to build.
**Audience:** the engineer/coding agent implementing the Merlin memory layer.
**Scope:** how Merlin stores, synthesizes, retrieves, and cites knowledge. This is the AI/knowledge layer that sits on top of Lor's chat substrate. Chat/messaging already exists; this document is about everything Merlin does with it and around it.

---

## 0. Orientation: what Merlin is

Merlin is the AI knowledge layer for a Lor workspace. It ingests the team's communication and connected tools, synthesizes a persistent, structured, human-browsable "brain," and answers questions about company history, decisions, and context with citations back to sources.

The product thesis: **the chat substrate is the surface; Merlin is the product.** Compounding institutional memory is the moat — every month of usage makes Merlin smarter about that specific workspace. The architecture below exists to serve that thesis, so two principles override convenience whenever they conflict with it:

1. **Ingest freely, never meter ingestion.** Ingestion is the moat-builder. Query allowances are the upgrade lever, not ingestion.
2. **Store understanding, not other people's data.** Lor owns messaging natively. For everything else (integrations, code), Lor stores a *synthesized understanding* plus a *pointer* back to the source of record. Lor does not become the system of record for data other tools already own.

---

## 1. What Lor owns natively (v1 scope)

**v1 owns exactly one native data source: messaging** (and later, voice channels). Nothing else.

We explicitly do **not** build native schema for incidents, decisions/RFCs, changelogs, runbooks, on-call, etc. in v1. Rationale: those artifacts are not native to the platform — nobody is creating them *inside Lor* yet, so building first-class tables for them is premature. They arrive as either (a) integration data from external tools, or (b) **synthesized memory pages** that Merlin derives from messages and integrations.

This keeps the v1 ingestion story to a single real source (chat), which sharply reduces surface area.

> Future: if/when owning a data structure natively would make Merlin meaningfully smarter (e.g. incidents created directly in Lor), we promote it to native. The rule is: **if owning the data structure makes Merlin smarter, own it natively; if Merlin just needs to read it, integrate it.** v1 only clears the bar for messaging.

---

## 2. The three storage layers

Merlin's knowledge is organized into three distinct layers with different storage and freshness strategies. Do not collapse these.

### 2.1 Native data — stored fully
Lor messages (and later voice transcripts). Full content lives in Postgres, permanently. Lor is the system of record. Merlin has rich, direct, structured access.

### 2.2 Integration data — summary + pointer, live-fetch on demand
GitHub, Linear, Notion, etc. We do **not** mirror these corpuses. For each relevant item we store a lightweight **source record**: a distilled summary, structured metadata, and a **pointer** (provider + stable external ID + URL) that resolves to the live item via the source API.

- Retrieval/synthesis uses the local summary + its embedding (fast, no API call).
- When the *full current content* is needed, Merlin follows the pointer and live-fetches from the source API, with a short-term cache.

**Why summary-and-pointer rather than mirroring:**
- **Freshness** — a Linear issue's status changes constantly; a mirrored copy is stale within hours, a pointer always resolves to current state.
- **Not the system of record** — mirroring someone else's corpus raises storage cost, sync complexity, and liability. Let the source own the source.
- **Permissions stay correct** — live-fetching through the integration's credentials means a user who lost access to a private resource doesn't get stale, now-unauthorized content leaking through Merlin.
- **Cheaper compaction** — we decay small summary rows, not gigabytes of mirrored docs.

Tradeoff accepted: live-fetch adds latency and depends on source API uptime/limits. Mitigated by a short-term cache on fetched content.

### 2.3 High-volume sources — queried on demand, never ingested
Logs, analytics events. Volume is too high and signal-per-item too low to ingest or embed. Merlin pulls a relevant *window* on demand (e.g. the log window around an incident) and may synthesize an aggregated summary into the brain, but raw logs/events are never stored or embedded wholesale.

**Logs/analytics philosophy:** never embed raw logs or raw analytics events — volume too high, signal too low. Embed aggregated summaries and incident windows; retrieve raw data on demand.

---

## 3. Merlin's brain: the synthesized memory layer

On top of the three storage layers sits Merlin's brain — the synthesized memory. This is the compounding artifact and the thing that makes month 12 qualitatively different from month 1 (not just bigger).

### 3.1 Two complementary modes

Merlin does **both** of these; neither alone generalizes to a multi-user team workspace:

- **Compile-time synthesis ("the tutor")** — a background process incrementally builds and maintains structured memory pages from raw sources. Knowledge is *compiled once and kept current*, not re-derived on every query. (This is the Karpathy-wiki-pattern influence.)
- **Query-time federated retrieval ("the librarian")** — at query time, Merlin retrieves from the synthesized layer first, and falls through to raw sources (chat chunks, live integration fetches, on-demand log windows) when the synthesized layer is insufficient.

### 3.2 The brain is a filesystem AND a graph (two views over the same rows)

The synthesized memory is modeled as **both**:

- **A hierarchical filesystem tree** — the human-friendly skeleton. Browsable like a directory: `/users/`, `/services/`, `/integrations/`, etc. This is what a human "peeks around in," and it's the addressing scheme Merlin's agent tools operate over.
- **A typed graph** — the associative layer. Pages link to each other across the hierarchy with typed edges (`supersedes`, `relates_to`, `caused_by`, `decided_in`, etc.).

Critical distinction — **do not conflate these two**:
- **Tree containment** (`parent_id`) = *where a page lives*. One parent. This is the folder hierarchy.
- **Typed edges** (separate `edges` table) = *what a page relates to*. Many, across the tree.

A page lives in exactly one folder but can relate to many pages elsewhere. Tree = skeleton; edges = associations.

This yields **three retrieval surfaces** that all fall out of the same data:
1. **Tree/browse** — `ls`-style navigation via `parent_id`.
2. **Graph** — traverse typed edges from a focused node.
3. **Semantic search** — vector similarity over page embeddings.

### 3.3 Folders and pages are real, separate node kinds (not a path string)

Do **not** model the filesystem as a `path` string column. Model it as a real tree so navigation, listing, renaming, and moving are clean and the agent can drive it with filesystem-shaped tools.

- A single `nodes` table with a `kind` discriminator: `folder` | `page`, and a self-referential `parent_id` (adjacency list — the same shape a real filesystem uses).
- A **folder** node is pure structure: name, parent. No payload.
- A **page** node carries the payload: markdown body, metadata, embedding, provenance.
- Unique constraint on `(parent_id, name)` — no two siblings with the same name, exactly like a real FS.

Why real tree over a path string: prefix-matching a string gets ugly fast for "list immediate children only," renaming a folder (rewrite every descendant), moving a subtree, or representing an empty folder. The adjacency list makes all of these clean and `ls` becomes one indexed query: `SELECT id, name, kind FROM nodes WHERE parent_id = $1`.

### 3.4 Filesystem-shaped agent tools

Give Merlin a filesystem toolset over its own brain. This deliberately meets the model where it is strongest — agents (cf. Claude Code) are excellent at reasoning over `ls`/`read`/`write`, far better than over opaque "query this vector store with these filters."

- `ls(path)` → immediate children of a folder
- `read(path)` → a page's body
- `write(path, body)` → create/update a page
- `mkdir(path)` / `move(src, dst)` / `tree(path, depth)` for structure ops

### 3.5 Taxonomy is data, not schema

The folder taxonomy (`/users`, `/services`, `/decisions`, …) must **not** be hardcoded as enum/schema. Let categories be data so Merlin can create a new top-level namespace when a workspace has something the default taxonomy didn't anticipate. Otherwise every unanticipated category becomes a migration.

Provide a sensible default scaffold per new workspace, but allow it to grow organically.

---

## 4. Embedding strategy & vector store

### 4.1 We embed very little — and never per-message

**Do not embed individual chat messages.** Per-message embedding is the worst option: messages like "lol yeah", "deploying now", "👍" are pure noise individually, the volume is enormous, and retrieval quality gets *worse*, not better.

What actually gets embedded (two things only):
1. **Synthesized memory pages** — one vector per page. This is the **primary** retrieval surface; queried first.
2. **Conversation chunks** — messages grouped into semantic units (a thread, or a sliding window of N messages within a time gap), embedded per-chunk. This is the **fallback** raw layer, used when the synthesized layer is insufficient and Merlin needs "what was actually said."

Retrieval order: synthesized pages first → fall through to conversation chunks only when needed.

### 4.2 Use pgvector, not Qdrant

**Decision: pgvector. Qdrant is dropped from v1.** (This supersedes the earlier "Qdrant confirmed" decision — the original choice assumed an "embed everything" workload that no longer exists.)

Because we embed only synthesized pages + coarse conversation chunks, the vector volume is thousands per workspace, not millions of per-message vectors. At that scale pgvector wins:

- **One database to operate** — one backup, one connection pool, one thing to run. Critical for a solo dev. Qdrant as a separate stateful service (plus its self-host story, backups, upgrades) is operational tax for a workload Postgres handles.
- **No sync problem** — the embedding is just a column on the page/chunk row. The page and its vector can never drift out of sync, deleting a whole class of "page updated, vector stale" bugs.
- **Trivial hybrid/filtered queries** — "semantic search within `/services/auth`, pages touched in the last 90 days" is one SQL query (WHERE + vector distance), not cross-system metadata filtering.
- **Fast enough** — pgvector with HNSW indexes is fast well past where v1 will be.

Caveat (years away, migrate-then): if a *single workspace* ever reaches millions of vectors, pgvector's HNSW build/memory gets heavy and Qdrant's specialized indexing pulls ahead. Because vectors are a column on a row, that migration is mechanical if ever needed. Do not pre-build for it.

Bonus: dropping Qdrant removes a container from the self-host compose file — a win for the AGPL/self-hostable distribution.

---

## 5. Scaling the brain over time: compaction / memory decay

An active workspace will accumulate thousands of pages over a year, and they rot: duplicates, superseded decisions, stale entity pages, pages about deleted services. A scheduled background process maintains brain quality. This is **not** optional — it's what keeps the brain accurate over time, which is the genuinely hard and genuinely differentiating part.

### 5.1 It's a *class* of jobs, not one monolithic nightly CRON
Build these as independently tunable jobs (they can run on different cadences; `/incidents/` need not decay on the same schedule as `/users/`). Per-namespace operation is a reason the tree model helps here.

- **Merge** — collapse near-duplicate pages into one (semantic similarity via the embeddings we already store).
- **Resummarize / compact** — pages that have sprawled get re-synthesized tighter; old detail compressed.
- **Decay / archive** — pages not retrieved in a long time and not linked from active pages get demoted (archived).
- **Supersession resolution** — when a new decision contradicts an old one, set the `supersedes` edge and mark the old page historical.

### 5.2 Never hard-delete
Decay = demotion of relevance, **not** destruction. Archive instead of delete, and keep an **append-only event log** of every ingest/compile/edit/merge/decay with full provenance, so the brain is replayable and a human can audit "why did Merlin forget/change this." Memory decay is about relevance ranking and archival, never data loss.

---

## 6. Provenance & integration data modeling

### 6.1 Memory pages stay uniform and source-agnostic
A synthesized page is the same shape regardless of origin. A decision learned from a GitHub PR and one learned from a chat thread are both just pages; origin is a provenance field, not a different table. **Do not create per-source memory tables** — that would fragment the brain by origin and break cross-source synthesis (the whole point is that a Linear issue and a chat thread about the same incident merge into one understanding).

### 6.2 Source/provenance records: one shared table + discriminator + JSONB
This is the layer that reconciles "own table per provider" vs "polymorphic." Use a **single shared `sources` table** (the polymorphic choice) with:

- Common columns every integration has: `provider` (`github` | `linear` | `notion` | …), `external_id`, `url`, `title`, `summary`, `last_fetched_at`. This is essentially the pointer.
- A `provider` **discriminator column** — this is what the UI switches on to render a GitHub icon, Linear icon, etc. You get per-provider UI affordances from a column, with **no** per-provider table needed.
- A `metadata jsonb` column for provider-specific fields that don't generalize (a PR's review state, a Linear issue's cycle, a Notion page's database props). Shape varies in JSONB rather than in new tables.

Why this beats per-provider tables: with the stated ambition of many integrations, per-provider tables mean a new table + migration + new branch in every retrieval query per integration. The shared-table + JSONB pattern makes **adding an integration a config + adapter task, not a schema migration.** The GitHub-icon requirement is fully satisfied by the discriminator column.

### 6.3 Integration *connections* are separate
The connection itself — OAuth tokens, workspace-level config, sync cursors, rate-limit state — genuinely differs per provider and is connection-management, not knowledge. Keep `integration_connections` separate from `sources`.

### 6.4 Provenance source types
A page's provenance must be able to cite any of:
- a **native message** (internal ID),
- an **integration item** (a `sources` row / pointer),
- a **code location** (`provider`, `repo`, `sha`, `path`, `line_range`) — see §7.

Code citations are first-class without indexing any code: the page knows where the code is; the source system holds the code.

---

## 7. Code search & citation

Merlin needs to cite code — "this bug in `jwt.ts` caused this incident/log spike." This is a different beast from other integrations; handle it deliberately.

### 7.1 We do NOT index/embed the codebase (the Cursor approach is wrong for us)
Cursor-style indexing (AST/tree-sitter chunking → code-aware embeddings → vector store pinned to a commit, continuously re-synced) exists because the codebase is Cursor's *entire product surface*. For Lor it's the wrong tradeoff:
- It violates §2.2 (summary-and-pointer; don't be the system of record) — a codebase is the extreme case: enormous, changes hourly, and the source already has a search API.
- The per-commit incremental re-index across branches (force-pushes, rebases, blob-hash tracking) is heavy engineering that's table-stakes-to-do-badly — months of solo-dev time.
- We don't need conceptual whole-repo semantic search for our job. Our use case is **anchored**: an incident/log/stack-trace already gives file paths, symbols, error strings. We need "given `auth/jwt.ts:142` from this trace, fetch and cite that code," not "semantically find code that conceptually does X across the repo."

### 7.2 The model: anchored live-fetch, validated by Claude Code / Codex CLI
Frontier agentic coding tools (Claude Code, Codex CLI) **do not pre-index** the repo. They give the agent filesystem/search tools (`grep`/ripgrep, glob, `read`, `bash`) and let it explore *on demand* at query time — agentic search, not retrieval from an embedding index. Two well-resourced teams independently concluded that for agentic code reasoning, on-demand exploration beats a pre-built index (no staleness, no sync, works on any repo instantly, exact symbol lookup via grep). This is strong precedent for our approach.

Note the one difference: those tools run **locally** (grep is microseconds, free). Merlin works over the **GitHub API** (slower, rate-limited), so Merlin's exploration must be **anchored and shallow** (a handful of targeted fetches guided by incident anchors), not a broad local-speed crawl.

### 7.3 The v1 mechanism
1. **Repo map at integration time** — a one-time background job generates a synthesized overview page (`/services/<repo>/overview`): what the project is, high-level directory structure, main modules, entry points, stack, conventions. Built from the tree (`git/trees?recursive=1`, ~1 call) + targeted reads of entry points/manifests/READMEs (tens of reads, not the whole repo). This is the orientation layer (the `CLAUDE.md` analog) — it lets Merlin go straight to likely files instead of crawling, which is the biggest lever on API call count. It's just another synthesized page; embedded and citeable like everything else. Refresh periodically.
2. **Per-incident anchored fetch** — use the anchors the incident already provides (paths, symbols, errors) to live-fetch specific files at a specific SHA via the contents API. Cite `repo@sha:path#L140-160` — precise, permanent (SHA-pinned, doesn't rot), permission-correct.
3. **GitHub Code Search API** for the rare "no anchor, need to find a symbol" step — GitHub's grep, server-side. We pull no files to search them. **Use sparingly** — it's on a much tighter rate-limit bucket (see §8).
4. **Short-term cache** keyed by `repo@sha:path`. Code at a given SHA is immutable, so the cache is trivially safe and never stale; repeated reads in one investigation cost one fetch.
5. **Durable artifact = the synthesized page**, not the code. "Auth service had an incident on date X caused by a token-expiry bug in `jwt.ts`; here's the fix PR" lives in the brain with SHA pointers. The code stays in GitHub. Each incident enriches the repo map → future investigations need *fewer* fetches. (This compounding is the moat showing up in the code layer — a static clone never gets cheaper.)

### 7.4 What we explicitly reject and defer
- **Persistent clone stored at rest per workspace — NO.** Reintroduces system-of-record/staleness/liability (storing customer source at rest is a serious security surface for our privacy/compliance-focused ICP) and the per-workspace-storage economics we already rejected.
- **Ephemeral SHA-pinned sandbox clone — DEFER, not v1.** If/when we build ephemeral sandboxes for code execution anyway, route both the initial repo-map crawl and deeper investigations through a short-lived shallow clone at a SHA → local grep-and-read (Claude-Code parity, no per-grep API cost) → extract the page → tear down → persist nothing but page + SHA pointers. This is defensible (nothing at rest, never stale) but it is a later optimization. **It does not change the data model** — whether the map is built via API calls or local grep in an ephemeral clone, the output is identical (a synthesized page + SHA pointers in the same `nodes` tree). The mechanism is hot-swappable behind the same artifact, which is exactly why we can ship the API version now and swap later without touching the schema.

---

## 8. GitHub API rate limits — constraints for the client

Verified against current GitHub REST API rate-limit docs. The headline: **the API approach is comfortably viable for v1**, because the limit is per-installation (per customer org) and our access is anchored-and-shallow.

### 8.1 The budget
- Authenticate as a **GitHub App** (the correct type for multi-tenant; per-installation tokens, not a personal PAT).
- Installation access token: **5,000 requests/hour minimum, per installation** — i.e. **per customer org**. Each workspace brings its own bucket; one customer's busy hour does not eat another's budget.
- Scales up: installations with >20 repos get +50 req/hr per repo; >20 users get +50 req/hr per user; ceiling 12,500 req/hr.
- **GitHub Enterprise Cloud orgs** get a higher fixed base of **15,000 req/hr** per installation (in place of the 5,000-plus-scaling formula above).

### 8.2 The math says we're fine
- Initial repo-map crawl: tree (1) + tens of targeted reads < 100 calls, one-time, async. Trivial against 5,000/hr.
- Per-incident investigation: ~10–50 calls. Would need 100+ investigations in one hour for one customer to threaten the limit — not a real scenario for a 10–50 person team.

This is why the ephemeral sandbox (§7.4) stays a *later* optimization: the rate-limit fear that would justify it doesn't materialize at v1 usage.

### 8.3 The two real watch-outs
1. **Code Search is a separate, much tighter bucket** (the code search endpoint is limited to **9 requests/min** for authenticated requests — vs 30/min for the other search endpoints). So the lever to protect is *search frequency*, not file reads. Orientation via the repo map keeps search rare — Merlin usually has an anchor and goes straight to `read`. Keep search the exception.
2. **Secondary limits — concurrency.** Max 100 concurrent requests, shared across REST + GraphQL. The ingestion worker must use **bounded concurrency** (a small pool), not a parallel blast of file reads — even when nowhere near the primary limit.

### 8.4 Required client behavior (build once, never think about it again)
The GitHub client wrapper must, from day one:
- **Read rate-limit response headers** off every response: `x-ratelimit-remaining`, `x-ratelimit-reset` (UTC epoch seconds), `x-ratelimit-used`, `x-ratelimit-limit`. Self-throttle when `remaining` gets low; back off until `reset`. Prefer headers over polling the `GET /rate_limit` endpoint (that endpoint doesn't count against the primary limit but the docs advise using headers).
- **Handle 403/429 with correct backoff:** on primary-limit hit (`remaining` = 0), do not retry until `x-ratelimit-reset`. On secondary-limit hit, honor `retry-after` if present; otherwise back off according to the documented reset/backoff guidance. **Continuing to hammer while rate-limited risks the integration being banned** — this wrapper is not optional.
- **Bounded concurrency** to respect the 100-concurrent secondary limit.

---

## 9. Data model summary (build target)

Postgres + pgvector. No Qdrant. Indicative shape — the implementer should turn this into Drizzle schema:

- **`nodes`** — the brain tree.
  - `id`, `workspace_id`, `kind` (`folder` | `page`), `parent_id` (self-ref, nullable for roots), `name`
  - page-only payload: `body` (markdown), `metadata` (jsonb), `embedding` (pgvector)
  - unique `(parent_id, name)`; index on `parent_id` (for `ls`); HNSW index on `embedding`
- **`edges`** — typed graph links between **page** nodes.
  - `id`, `workspace_id`, `from_node_id`, `to_node_id`, `type` (`supersedes` | `relates_to` | `caused_by` | `decided_in` | …), `metadata` (jsonb)
- **`sources`** — provenance / integration pointers (shared, polymorphic).
  - `id`, `workspace_id`, `provider` (discriminator, drives UI icon), `external_id`, `url`, `title`, `summary`, `last_fetched_at`, `metadata` (jsonb for provider-specific fields)
  - may also represent a **code location** provenance: `provider=github` + repo/sha/path/line_range (in columns or metadata)
- **`page_sources`** (or provenance join) — links a page to the `sources` / native messages / code locations it was synthesized from (a page has many sources).
- **`conversation_chunks`** — the fallback raw-retrieval layer.
  - `id`, `workspace_id`, `channel_id`, time/message range, `body`, `embedding` (pgvector); HNSW index
- **`integration_connections`** — per-provider auth/config (separate from `sources`).
  - `id`, `workspace_id`, `provider`, tokens (encrypted), config (jsonb), sync cursors, rate-limit state
- **`memory_events`** — append-only event log (ingest/compile/edit/merge/decay) with full provenance, for replay and human audit. Never deleted.

Messaging tables already exist (native, full content) — not redefined here.

---

## 10. Build order (suggested)

1. `nodes` + `edges` schema, pgvector set up, HNSW indexes. The brain skeleton.
2. Filesystem agent tools (`ls`/`read`/`write`/`mkdir`/`move`/`tree`) over `nodes`.
3. Conversation chunking + embedding of chunks; embedding of pages.
4. Retrieval: pages-first semantic search → conversation-chunk fallback; plus tree and graph traversal.
5. Compile-time synthesis loop (chat → synthesized pages with provenance).
6. First integration (GitHub) as summary-and-pointer: `integration_connections` + `sources` + the header-aware/backoff GitHub client (§8.4).
7. Repo-map generation job (§7.3.1) and anchored code fetch + citation.
8. Compaction job class (merge / compact / decay / supersession), per-namespace, archive-not-delete, writing to `memory_events`.

---

## 11. Non-negotiables (re-stated for the implementer)

- **Never embed individual messages.** Pages + conversation chunks only.
- **pgvector, not Qdrant.** Embedding is a column; no second datastore.
- **Tree (`parent_id`) and graph (`edges`) are separate concerns.** Don't merge them.
- **Folders and pages are real node kinds**, not a path string.
- **Taxonomy is data, not hardcoded schema.**
- **Integration data is summary + pointer + live-fetch**, never mirrored. One shared `sources` table with a `provider` discriminator + JSONB; not per-provider tables.
- **Do not index the codebase.** Anchored live-fetch + repo map + SHA-pinned citations.
- **Never hard-delete brain content.** Decay = archive; everything logged to `memory_events`.
- **GitHub client must respect rate-limit headers + backoff + bounded concurrency** from day one.
- **Ingestion is never metered.** (Product principle; relevant to anything that gates ingestion.)
