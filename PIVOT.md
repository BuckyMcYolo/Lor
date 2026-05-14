# Pivot: Townhall → Ravn

> **Status (2026-05-13):** Brand direction locked. Codebase rename / delete pass **not yet executed**. The repo still uses the old Townhall lexicon (Voice Chamber, Decree, Council, Sigil, etc.). Do not start renames in code until the open decisions below are resolved.

## TL;DR

Townhall — an open-source Discord-alternative for community chat — is pivoting to **Ravn**: a chat-first **company brain** that connects across the tools a company already uses (GitHub, Datadog / Better-Stack, Notion, CRM, etc.) and turns chat threads into queryable institutional memory.

Chat stays the primary surface. The brain is woven in — not bolted on.

## Why the pivot

The community-chat space is crowded and the "Discord but open source" wedge is thin. Meanwhile there's a real, growing slot for an **open-source / self-hostable, MCP-native company brain** that competitors (Glean, Slack AI, Notion AI, ChatGPT-with-connectors) structurally can't fill — because they're not where the conversations happen.

The thesis:

1. Chat is already where company comms live, all day, every day.
2. If the chat itself is part of the corpus, the product compounds with use — month six is dramatically more valuable than month one.
3. That collective memory is the moat. Solo AI assistants can't replicate it.

## What the product is

A team chat app (workspaces, channels, threads, presence, realtime) with an AI agent (`@<agent>`) that can answer questions across:

- Internal chat history
- Connected external sources via MCP (GitHub, Datadog, Notion, CRM, etc.)
- Source-ACL-aware retrieval (intersected with chat-level visibility)

**Multi-user, not solo assistant.** Threads, decisions, and answers all become part of the indexed corpus.

## Target customer

Small / self-serve tech startups first. Expand to non-tech and larger orgs once the product loop is proven.

## Product model

### Workspace model — single active, multi-workspace account

One user account can belong to multiple workspaces, but you are only *in* one workspace at a time. Workspace switcher lives top-left (**Linear / Figma pattern**), not a permanent sidebar stack of org orbs (Slack / Discord pattern).

**Why:** the "company brain" framing requires one unambiguous *we*. When someone asks `@munin "what did we decide about pricing?"` the answer must come from one company's corpus, not a federated view across orgs. Each workspace is its own tenant, its own ACL universe, its own Munin instance.

Cross-org collaboration (vendors, contractors, customers) is deferred to v2+ as Slack-Connect-style **shared channels**. Not in v1.

### Conversation primitives

The workspace surface has three:

1. **Public channels** — workspace-wide, topical, visible to all members. Listed in the sidebar. Slack/Discord pattern.
2. **Private channels** — same structure as public channels (name, topic, pinned messages, persistent membership) but only visible to invited members. For persistent confidential topics: `#exec`, `#leadership-private`, `#project-acme-secret`. Slack model, not Discord's role-permission complexity.
3. **DMs** — 1:1 and group direct messages between specific people. No channel structure, no topic — an ad-hoc thread identified by its participants. Both 1:1 and group DMs are supported.

Channels and DMs are different primitives, intentionally. A private channel is a *persistent topical space*; a group DM is an *ad-hoc thread between specific people*. Don't try to collapse them.

### Navigation & sidebar IA

The interface is **two regions**: a thin top bar and a tabbed sidebar. The main conversation pane fills the rest.

```
┌──────────────────────────────────────────────┐
│  Workspace ▾                       🔍        │  ← top bar
├──────────────────────────────────────────────┤
│  ┌──────────┬──────────┬───────────────┐    │
│  │ Channels │ DMs  (3) │ Munin         │    │  ← sidebar tabs
│  └──────────┴──────────┴───────────────┘    │
├──────────────────────────────────────────────┤
│  ▾ core                                      │
│      # general                               │
│      # eng                       (3)         │
│      🔒 exec                     (1)         │
│  ▾ engineering                               │
│      # eng-frontend                          │
│      # eng-backend                           │
│      🔒 eng-incidents                        │
│  ▾ design                                    │
│      # design-crit                           │
├──────────────────────────────────────────────┤
│  [Avatar]  You · presence            ⚙       │  ← user footer
└──────────────────────────────────────────────┘
```

**Top bar — minimal, on purpose.** Two affordances:

- `Workspace ▾` — workspace switcher (Linear/Figma dropdown, top-left). Cross-workspace nav lives here only.
- `🔍 Search` — global Cmd+K-style search across the active workspace.

No new-message icon, no inbox, no drafts, no activity feed, no apps menu. Per-channel unread badges *are* the inbox. To start a new message, navigate to that channel and type.

**Tabbed sidebar — three tabs, one active at a time.**

- **Channels** — public + private together, organized in **collapsible Discord-style categories**. `#` for public, `🔒` for private. One iconography system, no exceptions.
- **DMs** — flat list, 1:1 and group DMs together, recents first. No friend requests, no allies, no friendship layer — workspace membership *is* the relationship.
- **Munin** — flat list of saved Munin chats (ChatGPT-style named conversations), `+ new chat` at top. Note: `@munin` invocations inside channels/DMs are inline replies in those threads and do **not** create sidebar entries here. This tab is **only** for standalone 1:1 Munin chats (the surface where DM-indexing applies, per the trust boundary above).

**Tab-switching behavior:**

- Activity in an inactive tab shows as a count badge on the tab itself (e.g., `DMs (3)`).
- Switching tabs **only swaps the sidebar contents** — the main conversation pane is unaffected. You don't lose your place.
- Keyboard: `Cmd+1` / `Cmd+2` / `Cmd+3` switch tabs.
- The tab the user was on at last sign-out persists per-user — Ravn opens to the tab you left.

**User footer (bottom-left of sidebar):** avatar + name + presence indicator + settings cog. Profile, status, theme, preferences, notifications — all live behind the avatar/cog. Not in the top bar.

**What we explicitly do NOT have** (refusing-by-design list, so future scope creep gets caught):

- No left vertical icon rail (Slack/Discord workspace orb stack)
- No Inbox / Activity / Threads top-level entry
- No Drafts surface (this isn't email)
- No Starred / Bookmarks section
- No Apps section in the sidebar
- No friend requests / allies / friendship layer
- No "Huddles" / "Spring cleaning" / utility-bar cruft
- No mixed iconography (one icon = one meaning, always)
- No bold-vs-faded read-state typography — unread state is a single badge signal only

If a future feature wants a sidebar slot, it needs to displace something already there, not pile on. Density is a feature.

### Munin's visibility & ACL behavior

**Strict ACL respect (v1).** Munin only retrieves from channels and DMs the asking user has visibility into. Two users asking the same question may get different answers based on what they can see. Simpler trust model, smaller compliance surface, no risk of leaking sensitive info via the agent.

The god-view-with-redaction model (Munin indexes everything, surfaces selectively at query time) is deferred. That's a feature to earn later once trust is established — not v1.

### DM indexing & Munin in DMs

DM content is **opt-in per user**, off by default. When opted in, Munin may use your DMs as context — but **only in one surface**: a **standalone 1:1 chat with Munin** (a dedicated Munin conversation, ChatGPT/Claude-app style, separate from any `@munin` invocation in a multi-user space).

Munin **never** surfaces, cites, or references DM content in any other context:

- Not in public channels
- Not in private channels
- Not in group DMs (even if all participants of the source DM are present)
- Not in another user's 1:1 with Munin

The trust boundary is **structural, not behavioral**: Munin in your private space with Munin = can use your indexed DMs. Munin anywhere else = cannot, by construction. This is easier to reason about than runtime context-checking and removes the failure mode where DM content accidentally leaks via the agent into a multi-user setting.

**Future:** 1:1 DMs should eventually be **E2E encrypted**. That implies Munin's DM indexing will need to run client-side (agent operates on decrypted content locally; server only ever sees ciphertext). Architectural note for later — not v1, but should not design ourselves out of it.

## New brand

### Name + domain
- **Product:** **Ravn** — Old Norse spelling of "raven," pronounced like *Raven*.
- **Domain:** [ravn.to](https://ravn.to) — `.to` reads as a sending verb ("ravn-*to*-recipient"), reinforcing the chat product.

### Palette
Purple-forward with **candle-gold** as the differentiating warm accent. Cool ink-purple in dark mode, warm pale lavender in light mode. Gold is the punctuation, not the paragraph.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#FAF7FF` | `#14121E` |
| `--foreground` | `#1B1729` | `#F1ECFA` |
| `--primary` | `#6D28D9` | `#A78BFA` |
| `--primary-foreground` | `#FAF7FF` | `#14121E` |
| `--accent` | `#C99738` | `#E0B566` |
| `--muted` | `#EFE9F7` | `#2A2440` |
| `--border` | `#E7DEF0` | `#312B47` |

### Wordmark
Sharp serif, all-caps, tracked-out — **RAVN** as a stamp/seal/sigil. Typeface candidates: Recoleta, GT Sectra, Tiempos Headline, Söhne Breit. Product UI body type stays clean and modern (Inter / Geist) — personality lives in the wordmark and mascot.

Avoid: fantasy fonts (Cinzel, Trajan, anything that reads as D&D book cover).

### Mascot
A stylized raven. Profile pose, geometric, premium — Linear / Octocat polish, not webcomic. Deep ink-purple silhouette with a single gold detail (eye glint or beak highlight). Must work at 16px favicon and at billboard scale.

Avoid: heroic wings-spread, Edgar-Allan-Poe goth, hooded/cloaked wizard imagery (different mythology), cartoon eyes, Saturday-morning energy.

## Codebase migration plan

Three buckets. Execute in order: deletes first on a branch, get to a minimal chat shell, then layer the brain on top.

### Keep (foundation — already works, don't touch)
- pnpm + Turborepo monorepo
- `apps/api` — Hono + OpenAPI
- `apps/realtime` — Socket.IO gateway
- `packages/auth` — better-auth + Drizzle
- `packages/db` — Drizzle schema for users, messages, threads, mentions, reactions, presence
- `packages/ui` — shadcn/ui + Tailwind v4 setup
- Web app shell, channels, threads — concepts carry over

### Delete aggressively (do not rename, do not migrate, just `rm`)
- Voice Chambers (`apps/realtime` voice surfaces)
- Roles / Titles / Wardens / Citizens machinery beyond basic workspace member/admin
- Sigils (custom emoji)
- Crests (animated emoji)
- Allies / Ally Requests (friends system)
- Decrees (announcement channels)
- Councils (group DMs)
- Discovery
- All medieval lexicon in copy, components, schema fields, routes
- Marketing site copy on `apps/www` — full rewrite

### Build new
- Connector framework — **lean MCP-native** rather than building integrations one at a time
- Indexing + embedding pipeline (Postgres + pgvector is the natural fit given current stack)
- Retrieval layer
- LLM orchestration with tool-calling
- ACL model: source ACLs × workspace visibility × thread privacy
- `@munin` surface inside threads (streaming, citations back to source)

Recommended v1 scope: **one connector, done exceptionally well** (GitHub is the obvious pick for the dev-tools early audience) plus the collective-memory layer. Race for integration breadth later.

## The agent: **Munin**

The AI agent users `@` in chat to query the brain is **Munin** — from Norse mythology, Odin's raven of *Memory* (the other is Huginn = Thought). The ravens flew out each day across the world and brought knowledge back, which is literally the product's mechanic. The agent's name *means Memory*.

Two ravens in the world: **Ravn** is the brand/product (the chat where your team lives), **Munin** is the agent inside it (the raven of memory you summon for answers).

**Anchor line:** *"Munin remembers everything your company has ever said, written, or shipped."*

**Voice + usage notes:**
- Summon as `@munin` inside any thread.
- Every answer cites its source — Munin shows its work, linking back to the message, doc, PR, ticket, or dashboard it pulled from.
- Don't anthropomorphize Munin as "wizard" or "AI assistant." Munin is *the raven of memory.*
- Streaming/thinking state uses the candle-gold accent — a pulsing gold glint, echoing the mascot's eye.

## Open work, in rough order

1. Trademark check on RAVN in classes 9 & 42 (USPTO TESS).
2. ~~Register `ravn.to`.~~ ✅ Done.
3. Commission mascot from the brief in the [Mascot section](#mascot).
4. Build the new shadcn theme using the palette above; install in `packages/ui`.
5. Build the tabbed sidebar IA (Channels / DMs / Munin tabs) + minimal top bar per [Navigation & sidebar IA](#navigation--sidebar-ia). Includes Discord-style collapsible channel categories.
6. Branch the delete pass. Strip the old lexicon and surfaces listed in [Delete aggressively](#delete-aggressively-do-not-rename-do-not-migrate-just-rm).
7. Rebuild marketing site copy on `apps/www` against the new positioning.
8. Begin the connector + retrieval work (GitHub first).
9. Implement `@munin` agent surface — inline `@munin` in threads (streaming, citations, gold-pulse) AND standalone Munin chat surface (the third sidebar tab, where DM-indexing applies).

## Related docs

- [`README.md`](./README.md) — repo overview (still describes old Townhall as of this writing)
- [`ROADMAP.md`](./ROADMAP.md) — feature roadmap (will need a rewrite alongside the pivot)
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code working notes for this repo
