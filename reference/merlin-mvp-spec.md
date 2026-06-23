# Merlin MVP — Implementation Spec (as-built)

**Status:** MVP-core **implemented** (2026-06-17) — the full loop works: `@Merlin` → answer grounded in chat + brain → autonomous write-back → semantic retrieval. Remaining for MVP: integrations (Track B) + polish (see §10).
**Audience:** anyone working on the Merlin brain + harness.
**Relationship to `merlin-architecture.md`:** that doc is the north-star vision; this is what actually got built. Where they differ, this wins.

## What this changed vs. `merlin-architecture.md`

| Topic | Architecture doc | **As built** |
|---|---|---|
| Chat synthesis | Proactive, compile-time ("the tutor") | **Lazy / on-demand** — only on `@Merlin` |
| Chat retrieval | Conversation chunks embedded | **Postgres FTS only** (expression GIN index); no chat embeddings |
| `conversation_chunks` / `memory_events` | In the model | **Dropped**; non-destructive page updates via `status` + `version` |
| Edge `type` | Free text (taxonomy-as-data) | **Controlled pgEnum** `brain_edge_type` — the graph needs a stable vocabulary |
| Brain table names | `nodes` / `edges` | **`brain_node` / `brain_edge`** |
| Brain tool names | — | bare **`ls`/`read`/`tree`/`write`/`mkdir`/`move`/`link`** (models know these) |
| Write-back | (implied) | **Autonomous** — Merlin decides salience itself; Haiku gate + Sonnet agent |
| Grounding | Strict citations, hard-verified | **Prompt-conditional** (institutional vs general); hard citation verification **deferred** |
| Self-host / BYO-key | First-class (AGPL) | embeddings are **provider-swappable** via env; Claude models still ours |
| Brain browser UI | Human-browsable | **Deferred** — agent-only brain |

---

## 1. The one principle

> **Embed the unit when the source emits discrete, high-signal units. Search live when the source emits a high-volume, low-signal stream. The synthesized brain compiles lazily, on demand.**

| Source | Volume | Unit | Strategy |
|---|---|---|---|
| Chat | high | none (stream) | live Postgres **FTS** (`to_tsvector` expression index); no embeddings |
| Brain pages | low | the page | embedded (1536-d); written **lazily** during write-back |
| Integrations (PR/issue/page) | low | the item | **eager** summarize + embed — *Track B, not yet built* |
| Code | huge | file@sha | anchored live-fetch — *deferred* |

The harness is the moat: tools, context construction, steering. Retrieval behind a tool is swappable (FTS→embeddings, etc.) without touching the harness.

---

## 2. MVP scope

**Built:**
- The brain: `brain_node` (folder/page tree) + `brain_edge` (typed graph) + pgvector embeddings on pages.
- The harness (`packages/merlin`): a Claude tool-loop over the brain + chat; read-only when answering, read+write during write-back.
- The full `@Merlin` loop: mention → stream a grounded answer → notify like a normal message → autonomous async write-back → "🧠 remembered" chip.
- Semantic retrieval: embed-on-write + question pre-fetch over page embeddings.

**Deferred (not built):**
- Integrations (`source` ingestion + connectors) — Track B, §6.
- Reply-placement router (thread vs. channel) — Merlin replies in the trigger's context.
- Hard citation verification — grounding is prompt-enforced only.
- Default taxonomy seed — Merlin grows the tree organically via `mkdir`-on-write.
- Eval set, code search, compaction/decay, brain browser UI, prompt caching.

---

## 3. The invocation loop (as built)

Stateless per invocation; the only persistent state is the brain in Postgres.

```text
1. TRIGGER    realtime message:send detects @Merlin (MERLIN_USER_ID in the mention) →
              creates an empty Merlin placeholder message (NO fanout) → broadcasts
              message:created → enqueues a `merlin-respond` job.
2. ANSWER     worker, Phase 1 (read-only): semantic pre-fetch (embed the question →
              top-3 full brain pages + their linked pages) seeds the prompt; Sonnet tool-loop over chat
              (search_messages/read_thread) + brain (ls/read/tree); streams tokens
              back via `message:stream`. Grounding is conditional (see §4).
3. PERSIST    Phase 2: write final text to the message; run the normal notification
              fanout (so Merlin's reply notifies like any message); emit stream `done`.
4. WRITE-BACK Phase 3 (autonomous, after the answer ships; per-workspace Redis lock):
              Haiku gate ("anything durable here?") → if yes, a Sonnet agent CONTINUES
              the answer's messages with brain read+write tools, decides update-vs-create,
              and writes/links pages. Each page write emits `merlin:memory` → web chip.
5. SLEEP      job ends. No persistent process.
```

- **Answer latency is decoupled from write-back** — users wait only for steps 1–3.
- **Read-only answer / write-only write-back** — the answer loop has no write tools; only the write-back phase can mutate the brain.
- **Per-workspace lock** (`merlin:writeback:<ws>`, Redis `SET NX EX`) serializes brain writes; if held, this write-back is skipped (knowledge resurfaces on a later mention).

### 3.1 Grounding & the cheap-model gate

- **Conditional grounding (in the system prompt, not a separate model):** for workspace questions Merlin grounds in what it finds (brain + message search) or says "I don't have it in memory yet"; general questions (how-to, chit-chat) are answered directly. **Citations are verified** (§4): Merlin cites brain pages it relied on as `[[/path]]` and specific messages as `[[msg:<id>]]`; the worker strips any that don't resolve. Message-id citations are clickable (jump-to-message).
- **Write-back salience gate (Haiku):** a cheap `generateObject` boolean over the exchange decides whether to spin up the expensive write-back agent — skips trivial mentions.
- *Deferred:* a Haiku grounding-mode classifier and a reply-placement router (both folded away / postponed).

---

## 4. The harness (`packages/merlin`)

A Claude tool-use loop (Vercel **AI SDK v6**, `streamText` for the streamed answer, `generateText` for write-back, `generateObject` for the gate). `stopWhen: stepCountIs(12)`.

**Answer tools (read-only):**
- `search_messages(query, limit?)` — workspace-wide FTS (`to_tsvector` + `ts_rank`).
- `read_thread(messageId)` — full thread around a hit.
- `ls(path)` / `read(path)` / `tree(path, depth?)` — browse the brain. `read` and the semantic pre-fetch return each page's **linked pages** (edges: type + direction + connected path), so Merlin traverses the graph via `read` — no separate edge-query tool.

**Write-back tools (answer tools + writes):** adds `write(path, body)` (mkdir-p; embeds on write), `mkdir(path)`, `move(from, to)`, `link(from, to, type)` where `type ∈ brain_edge_type`.

**Models:** Sonnet (`claude-sonnet-4-6`) for both answer and write-back; Haiku (`claude-haiku-4-5`) for the salience gate. Opus reserved for later if Sonnet underperforms.

**Grounding:** prompt-conditional (above). **Citation verification built:** Merlin cites grounding sources inline — brain pages as `[[/path]]`, messages as `[[msg:<id>]]`; `groundCitations(workspaceId, text)` (exported from `packages/merlin`) extracts each, verifies it resolves (`pageExists` for pages, `messageExists` for messages), keeps valid ones, and unwraps unresolved pages to plain text / drops unresolved message ids so a hallucinated citation can't pose as a source. The worker runs it before persist/fanout and logs stripped citations. In the web client, page citations render as a pill and message citations are clickable (jump-to-message, resolving the channel cross-workspace). Making brain-page citations clickable (needs a brain browser) is the remaining open piece.

---

## 5. Data model (as built)

Postgres 16 + pgvector (extensions installed manually on Railway). UUID PKs. Embedding `vector(1536)` (1536-d model), HNSW cosine index.

- **`brain_node`** — the brain tree.
  - `id`, `workspaceId` (fk → workspace, cascade), `kind` (`folder` | `page`), `parentId` (self-ref, cascade; null = top-level), `name`
  - page payload: `body` (text), `metadata` (jsonb default `{}`), `embedding` (`vector(1536)`, null until embedded)
  - `status` (`active` | `archived`, default `active`), `version` (int, default 1, bumps on body update)
  - **unique `(workspaceId, parentId, name)` NULLS NOT DISTINCT** (so top-level names can't collide); HNSW on `embedding`
- **`brain_edge`** — typed graph between page nodes.
  - `id`, `workspaceId`, `fromNodeId`, `toNodeId`, `type` (**`brain_edge_type` enum**), `metadata` (jsonb), `createdAt`
  - `BRAIN_EDGE_TYPES` = `relates_to | supersedes | caused_by | depends_on | part_of | owned_by` (add values deliberately)
  - unique `(fromNodeId, toNodeId, type)`; indexes on `(workspaceId, fromNodeId)` / `(workspaceId, toNodeId)`

**Existing-table touches:**
- **`user`**: added `isBot` (boolean, default false). One global **Merlin** bot user, fixed id `MERLIN_USER_ID` (`packages/db/src/constants.ts`, seeded via `seeds/merlin.ts`). Merlin authors messages as this user; it's a real workspace member (so it's mentionable + receives fanout) — auto-added on workspace creation (`packages/auth` `afterCreateOrganization`).
- **`message`**: added an **expression** GIN index `to_tsvector('english', coalesce(content,''))` (not a stored tsvector column — avoids touching the message zod schemas / a table rewrite). Existing `message_content_trgm_idx` kept for fuzzy fallback.

**Not built (Track B):** `merlin_source`, `merlin_page_source`, `merlin_integration_connection` (see §6). `conversation_chunks`, `memory_events` — dropped.

---

## 6. Integration ingestion (Track B contract — not yet built)

Eager, event-driven, never indiscriminate. Per provider: a *unit* + a salience filter for which events warrant a Haiku summarization → upsert a `source` row (summary + pointer + metadata) → **embed the summary, not the document** (full content live-fetched on demand). Stale summary hurts recall, never correctness. Cross-source synthesis into brain pages stays lazy (write-back). Connections are workspace-level; stored summaries are workspace-visible (accepted, since all channels are public-to-workspace). The search/fetch source tools join the harness when this lands.

---

## 7. Topology (as built)

- **`packages/merlin`** — the harness core: `index.ts` (`respond`, `writeBack`, system prompt, chat tools), `brain.ts` (brain ops + read/write tool sets + `searchBrain`), `embeddings.ts` (`embedText`). No HTTP/sockets.
- **`packages/messaging`** — shared message-notification fanout (`buildMessageFanout`), called by both realtime (human send) and the worker (Merlin completion).
- **`apps/realtime`** — `message:send` detects `@Merlin`, creates the placeholder (no fanout), enqueues; relays streamed output. Blocks DM creation with Merlin (it's workspace-scoped).
- **`apps/worker`** — `merlin-respond` BullMQ job runs the 3 phases; emits `message:stream` + `merlin:memory` through the `@socket.io/redis-emitter`.
- **`apps/web`** — `use-merlin-stream` appends `message:stream` deltas (+ "thinking" indicator) and records `merlin:memory` as a "🧠 remembered: /path" chip on the reply (transient `streaming` / `remembered` fields on `Message`).

Socket events (in `@repo/realtime-types`): `message:stream { channelId, messageId, delta, done }`, `merlin:memory { channelId, messageId, path, action }`.

---

## 8. Brain taxonomy

**Minimal scaffold seeded; structure still emerges.** On workspace creation (`packages/auth` `seedBrainTaxonomy`, alongside Merlin membership) three top-level folders are inserted — **`/people`, `/projects`, `/decisions`** — so Merlin has obvious places to file knowledge cold-start. Beyond that the tree grows organically: `write` (and `mkdir`) create parent folders on demand (mkdir-p) during write-back. Seed is folders only, idempotent, best-effort, and only on creation (existing workspaces are unaffected — mkdir-p covers them). Taxonomy is data, not schema.

---

## 9. Models & cost posture

- **Embeddings:** OpenAI-compatible, env-configurable — `MERLIN_EMBED_MODEL` (default `text-embedding-3-small`) + optional `MERLIN_EMBED_BASE_URL` (self-hosters point at Ollama/LocalAI/etc.). **Must output 1536-d vectors** to match the column (making the dimension configurable is a separate schema change). Key: `OPENAI_API_KEY`.
- **Answer + write-back:** Claude Sonnet (`claude-sonnet-4-6`), `ANTHROPIC_API_KEY`.
- **Salience gate:** Claude Haiku (`claude-haiku-4-5`).
- **Ingestion is never metered** (product principle); write-back cost is bounded by the Haiku gate.
- Prompt caching: not yet wired (known cost lever).

> Env note: `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are required and mirrored into `apps/api/vitest.config.ts` `TEST_ENV`.

---

## 10. Build status & next steps

**Done — MVP-core (built in order 1 → 2 → 4 → 3):**
1. Schema (`brain_node`/`brain_edge`, HNSW), Merlin bot user, message FTS index.
2. Brain tools (`ls`/`read`/`tree`/`write`/`mkdir`/`move`/`link`) + chat tools + the agentic answer loop.
3. (as #4) Autonomous write-back: Haiku salience gate + Sonnet agent, per-workspace lock, `merlin:memory` chip.
4. (as #3) Embeddings: embed-on-write + semantic pre-fetch (top-3 full pages + their linked pages).
   Plus: realtime trigger, worker job, web streaming/chip, fanout extraction (`@repo/messaging`), workspace auto-membership, DM guard, `summary`/`aliases` frontmatter convention.

**Since validated end-to-end (loop observed working: answers grounded in chat + brain, autonomous write-back writing real pages, retrieval, threaded streaming). Also built since MVP-core:**
- **Vision** — image attachments downloaded and sent inline (base64) to the answer model; supported types only, 5MB/8-image caps.
- **Reply-placement router** — Haiku decides channel vs. thread for main-channel mentions (`packages/merlin/placement`, called from realtime); thread session + per-thread mute rules; `contextThreadRootId` so threaded replies still read channel context.
- **Brain-page citation verification** — `[[/path]]` contract + `groundCitations` strips unresolved citations (§3.1/§4).
- **Default taxonomy seed** — `/people` `/projects` `/decisions` on workspace creation (§8).
- **Streamdown** markdown renderer (sanitized, shiki, streaming-aware); **login redirect** to last workspace/channel.

**Next steps (priority order):**
1. **Eval harness (highest).** 5–10 seeded conversations with expected memory + expected retrieval, so the write-back/grounding/placement prompts are tunable with signal instead of vibes. (This is the instrument for tuning the moat — everything prompt-driven now depends on it.)
2. **Integrations (Track B):** `merlin_source` / `merlin_page_source` / `merlin_integration_connection` tables + per-provider connectors + `search_sources`/`fetch_source` tools (§6).
3. **Image-aware write-back** — the salience gate is text-only, so knowledge living only in an image never gets saved.
4. **Optional / when-needed:** page chunking (gated on pages growing large); frontmatter → `metadata` parse (when a consumer exists, e.g. tag filtering); prompt caching; brain-browser UI (makes brain-page citations clickable); streamdown `@source` decoupling from `apps/web/node_modules`.

---

## 11. Non-negotiables

- **Never embed individual messages** — chat is FTS; only pages (and later source summaries) are embedded.
- **pgvector, embedding-as-column.** No second datastore.
- **Tree (`parent_id`) and graph (`brain_edge`) are separate.** Folders/pages are real node kinds.
- **Edge `type` is a controlled enum**, not free text.
- **Lazy, autonomous write-back** — no proactive chat synthesis; Merlin decides what to remember, after answering, async.
- **Conditional grounding** — workspace answers grounded or "not in memory"; general questions answered freely. (Hard verification: later.)
- **Never hard-delete brain content** — `status=archived`, `version` bumps.
- **Retrieval behind a tool is swappable without touching the harness.**
- **Merlin is workspace-scoped** — never in DMs; a member of every workspace.
