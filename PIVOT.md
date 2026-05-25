# Pivot: Townhall → Lor

> **Status (2026-05-23):** Brand direction locked. Codebase rename / delete pass **not yet executed**. The repo still uses the old Townhall lexicon (Voice Chamber, Decree, Council, Sigil, etc.) and CSS still carries the intermediate **Ravn** palette. Do not start renames in code until decisions below are settled with the maintainer.

## TL;DR

Townhall — an open-source Discord-alternative for community chat — is becoming **Lor**: a chat-first **institutional-memory** product for software teams. Chat is the interface. **Merlin** (the AI agent) is the actual product. Framed competitively as **"Glean for small teams"** — open-source, self-hostable, with chat as the native surface instead of a search-bar overlay.

The name **Lor** is from Old English *lār* — teaching, accumulated knowledge. Domain: [lor.chat](https://lor.chat). The agent is **Merlin** (the sage who remembers; Lor is what he protects).

## Lineage (very brief)

1. **Townhall** (Feb 2026) — privacy-first Discord alternative, triggered by Discord's age-verification announcement. Warm brown/gold palette. Consumer/B2C.
2. **Ravn** (intermediate, weeks) — short-lived gothic Norse identity (deep purples, raven mascot, "cloaked stranger"). Abandoned for being too cold/edgy for B2B and still serving the wrong framing.
3. **Lor** (mid-May 2026 →) — B2B institutional memory. Twilight-violet + warm starlight-gold. Wonder-first brand voice. Merlin as the named character. Halls as the resurrected medieval term for channels — now load-bearing because the mythology actually maps to the mechanic (Merlin the wizard, Lor the lore, Halls where lore is kept).

## Why the pivot

Three honest reckonings drove it:

1. **Competing with Discord on chat alone is structurally weak.** Network effects favor the incumbent (~230M MAU). No amount of privacy-first positioning overcomes that.
2. **The "communal AI with server-wide context" feature on the Townhall roadmap was actually the whole product, not a feature.** A chat platform where an agent indexes all communication, docs, incidents, and integrations — and answers questions about company history and decisions — is not "Discord with an AI bot." Different product category.
3. **B2B dev teams have a clear buyer, a clear pain, a clear revenue model.** Consumer community platforms don't.

The thesis crystallized as: *"Every engineering team loses 30% of its context every time someone leaves. Lor is the chat platform where that context becomes permanent."*

## What the product is

A team chat app (workspaces, Halls, threads, presence, realtime) wrapped around an AI agent (**Merlin**, summoned via `@merlin`) that answers questions across:

- Internal chat history (Halls + DMs, with strict ACL respect)
- Connected external sources via MCP / integrations (GitHub, Linear, Notion, Datadog/Better-Stack, CRMs)
- A persistent, **growing wiki** of structured markdown entity pages — services, people, decisions, incidents, concepts — that Merlin maintains incrementally. This is the **visible brain** that differentiates against Glean's "ask a question, get an answer" mode.

**Multi-user, not solo assistant.** Threads and decisions become part of the indexed corpus, which is the moat against ChatGPT-with-connectors and similar individual tools.

## Target customer & business model

- **Buyer:** CTOs, engineering leads, technical founders at **5–50 person dev startups**.
- **Pain:** institutional memory loss when people leave ("why did we choose Postgres over Mongo two years ago?")
- **Revenue:** per-user SaaS, **$18/user/month** Pro tier. **Free self-hosted forever.**
- **License:** **AGPL with CLA.**
- Self-hosted is the distribution channel. Cloud is the revenue.
- **Recommended next move before pouring fuel on Merlin's architecture:** 30 customer discovery calls with CTOs / engineering leads.

## Product model

(These decisions carried through from the Ravn phase. They were locked separately from the rebrand and remain valid — they're about the chat+AI primitive, not consumer-vs-B2B framing.)

### Workspace model — single active, multi-workspace account

One user account can belong to multiple workspaces, but you are only *in* one workspace at a time. Workspace switcher lives top-left (**Linear / Figma pattern**), not a permanent sidebar stack of org orbs (Slack / Discord pattern).

**Why:** the "institutional memory" framing requires one unambiguous *we*. When someone asks `@merlin "what did we decide about pricing?"` the answer must come from one company's corpus, not a federated view across orgs. Each workspace is its own tenant, its own ACL universe, its own Merlin instance.

Cross-org collaboration (vendors, contractors, customers) is deferred to v2+ as Slack-Connect-style **shared Halls**. Not in v1.

### Conversation primitives

Three:

1. **Public Halls** — workspace-wide, topical, visible to all members. Listed in the sidebar. Slack/Discord pattern.
2. **Private Halls** — same structure as public Halls (name, topic, pinned messages, persistent membership) but only visible to invited members. For persistent confidential topics: `#exec`, `#leadership-private`, `#project-acme-secret`. Slack model, not Discord's role-permission complexity.
3. **DMs** — 1:1 and group direct messages between specific people. No Hall structure, no topic — an ad-hoc thread identified by its participants. Both 1:1 and group DMs are supported.

Halls and DMs are different primitives, intentionally. A private Hall is a *persistent topical space*; a group DM is an *ad-hoc thread between specific people*. Don't try to collapse them.

### Navigation & sidebar IA

The interface is **two regions**: a thin top bar and a tabbed sidebar. The main conversation pane fills the rest.

```
┌──────────────────────────────────────────────┐
│  Workspace ▾                       🔍        │  ← top bar
├──────────────────────────────────────────────┤
│  ┌──────────┬──────────┬───────────────┐    │
│  │  Halls   │ DMs  (3) │ Merlin        │    │  ← sidebar tabs
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

- `Workspace ▾` — workspace switcher (Linear/Figma dropdown). Cross-workspace nav lives here only.
- `🔍 Search` — global Cmd+K-style search across the active workspace.

No new-message icon, no inbox, no drafts, no activity feed, no apps menu. Per-Hall unread badges *are* the inbox. To start a new message, navigate to that Hall and type.

**Tabbed sidebar — three tabs, one active at a time.**

- **Halls** — public + private together, organized in **collapsible Discord-style categories**. `#` for public, `🔒` for private. One iconography system, no exceptions.
- **DMs** — flat list, 1:1 and group DMs together, recents first. No friend requests, no allies, no friendship layer — workspace membership *is* the relationship.
- **Merlin** — flat list of saved standalone Merlin chats (ChatGPT-style named conversations), `+ new chat` at top. Note: `@merlin` invocations inside Halls/DMs are inline replies in those threads and do **not** create sidebar entries here. This tab is **only** for standalone 1:1 Merlin chats (the surface where DM-indexing applies, per the trust boundary below).

**Tab-switching behavior:**

- Activity in an inactive tab shows as a count badge on the tab itself (e.g., `DMs (3)`).
- Switching tabs **only swaps the sidebar contents** — the main conversation pane is unaffected. You don't lose your place.
- Keyboard: `Cmd+1` / `Cmd+2` / `Cmd+3` switch tabs.
- The tab the user was on at last sign-out persists per-user — Lor opens to the tab you left.

**User footer (bottom-left of sidebar):** avatar + name + presence indicator + settings cog. Profile, status, theme, preferences, notifications — all live behind the avatar/cog. Not in the top bar.

**What we explicitly do NOT have** (refusing-by-design list, so future scope creep gets caught):

- No left vertical icon rail (Slack/Discord workspace orb stack)
- No Inbox / Activity / Threads top-level entry
- No Drafts surface (this isn't email)
- No Starred / Bookmarks section
- No Apps section in the sidebar
- No friend requests / allies / friendship layer
- No mixed iconography (one icon = one meaning, always)
- No bold-vs-faded read-state typography — unread state is a single badge signal only

If a future feature wants a sidebar slot, it needs to displace something already there, not pile on. Density is a feature.

### Merlin's visibility & ACL behavior

**Strict ACL respect (v1).** Merlin only retrieves from Halls and DMs the asking user has visibility into. Two users asking the same question may get different answers based on what they can see. Simpler trust model, smaller compliance surface, no risk of leaking sensitive info via the agent.

The god-view-with-redaction model (Merlin indexes everything, surfaces selectively at query time) is deferred. That's a feature to earn later once trust is established — not v1.

### DM indexing & Merlin in DMs

DM content is **opt-in per user**, off by default. When opted in, Merlin may use your DMs as context — but **only in one surface**: a **standalone 1:1 chat with Merlin** (a dedicated Merlin conversation, ChatGPT/Claude-app style, separate from any `@merlin` invocation in a multi-user space).

Merlin **never** surfaces, cites, or references DM content in any other context:

- Not in public Halls
- Not in private Halls
- Not in group DMs (even if all participants of the source DM are present)
- Not in another user's 1:1 with Merlin

The trust boundary is **structural, not behavioral**: Merlin in your private space with Merlin = can use your indexed DMs. Merlin anywhere else = cannot, by construction. This is easier to reason about than runtime context-checking and removes the failure mode where DM content accidentally leaks via the agent into a multi-user setting.

**Future:** 1:1 DMs should eventually be **E2E encrypted**. That implies Merlin's DM indexing will need to run client-side (agent operates on decrypted content locally; server only ever sees ciphertext). Architectural note for later — not v1, but should not design ourselves out of it.

## New brand

### Name + domain
- **Product:** **Lor** — from Old English *lār* (teaching, accumulated knowledge). Short spelling chosen over "Lore" for distinctiveness in B2B and to avoid gaming/fantasy connotations.
- **Domain:** [lor.chat](https://lor.chat).

### Brand voice principle

**Mythic, warm, atmospheric — wonder-first.** NOT "modern dev tool," even though the buyer overlaps with Linear's audience.

> **Who you sell to ≠ how the brand feels.**

The product UI is dev-clean (Geist, restrained, fast); the brand voice is mythic (illuminated manuscripts, twilight travel, dawn air, journey, accumulated lore). Wonder lives in *atmosphere* — palette, typography, illustrations, hero imagery — not in *vocabulary*. Don't write "thy" or "doth." **Halls** and **Merlin** are the only lore-flavored vocabulary tokens that survive into the product surface.

### Palette direction

Purple-forward — **twilight violet** anchored at OKLCH hue **~278–282** — with **warm starlight-gold** as the Merlin accent. Cool sky + warm star. NOT gothic. NOT generic-AI-purple.

| Token | Approximate value |
| --- | --- |
| Primary interactive | `#5A63BC` (deeper periwinkle/sky-purple) |
| Fills / decoration | lighter sky-periwinkle |
| Merlin accent | warm starlight / candlelight gold (beeswax-toned, NOT cool gilt) |
| Light surfaces | pale dawn sky / parchment cream |
| Dark surfaces | purple-shifted darks (NOT near-black) |

Variant palettes explored — **Aurora** (teal lead + violet ribbon + gold), **Ember** (warm ochre-forward), **Twilight / Night Sky** — all share the rule: *surface anchored to a hue; Merlin always the warm gold star in the cool sky*.

**The CSS in `packages/ui/src/styles/globals.css` is NOT yet updated to this direction.** It still carries the intermediate Ravn hue-295 palette. Palette tuning is sensitive; don't change CSS values without explicit guidance.

### Wordmark + logo direction

- **Lead concept:** "**o-as-portal**" — the `o` in Lor rendered as a circular portal/lens, implying passage into accumulated knowledge.
- **Secondary concept:** **constellation mark** — Merlin's knowledge as stars forming a picture.
- **Typeface:** **Geist** (both wordmark and product UI).
- **No primary creature mascot.** Lor's identity is wordmark + symbol driven. The Ravn-era raven-with-gold-eye is retired.
- **Avoid:** **Othala rune (ᛟ)** as a prominent mark. Semantically perfect (inherited heritage, knowledge passed down) but appropriated by hate groups. Rune-as-background-texture remains fine; just not Othala specifically as a logomark.

## Terminology

- **Channels → Halls** (carried over from Townhall, now codified). The medieval flavor is no longer decorative; it's load-bearing — Merlin (wizard) / Lor (lore) / Halls (where lore is kept) all map to the product.
- **Most other Townhall medieval terms do NOT survive.** Wardens, Citizens, Sigils, Crests, Allies, Banish, Silence, Decree, Council, Send-a-Raven — these were Discord-feature analogs for a community chat product. A B2B institutional-memory product doesn't have group DMs as "Councils" or moderators as "Wardens." Confirm before resurrecting any.

## Tech stack

Carried over from Townhall (functional):

- **Railway** hosting
- **Postgres + Drizzle** ORM
- **Socket.IO** realtime
- **Better Auth**
- **R2** (Cloudflare object storage)
- **BullMQ** (background jobs)
- **shadcn/ui + Tailwind v4** in `packages/ui`

New for Lor:

- **Qdrant** (vector DB for Merlin) — confirmed.

## Merlin architecture (sketch — not started yet)

**Karpathy-style wiki accumulation**, NOT just RAG on raw messages. Merlin incrementally **builds and maintains structured markdown entity pages** — services, people, decisions, incidents, concepts — as a **persistent artifact**. The "visible, growing brain" is the demo differentiator vs. Glean's "ask a question, get an answer."

**Open architectural questions:**

- Embedding model choice
- Chunking strategy
- Qdrant collection schema
- Retrieval pipeline
- First integration target (likely GitHub or Linear)

## Codebase migration plan

Three buckets. Execute in order: deletes first on a branch, get to a minimal chat shell, then layer Merlin on top.

### Keep (foundation — already works, don't touch)
- pnpm + Turborepo monorepo
- `apps/api` — Hono + OpenAPI
- `apps/realtime` — Socket.IO gateway
- `packages/auth` — Better Auth + Drizzle
- `packages/db` — Drizzle schema for users, messages, threads, mentions, reactions, presence
- `packages/ui` — shadcn/ui + Tailwind v4 setup
- Web app shell. Halls (renamed from channels), threads — concepts carry over.

### Delete aggressively (do not rename, do not migrate, just `rm`)
- Voice Chambers (`apps/realtime` voice surfaces)
- Roles / Titles / Wardens / Citizens machinery beyond basic workspace member/admin
- Sigils (custom emoji)
- Crests (animated emoji)
- Allies / Ally Requests (friends system)
- Decrees (announcement channels)
- Councils (group DMs — replaced by standard group-DM primitive)
- Discovery
- All Townhall medieval lexicon **except Halls**
- All Ravn-era references (raven mascot, raven-themed copy, Munin agent name)
- Marketing site copy on `apps/www` — full rewrite for Lor positioning

### Build new
- **Connector framework** — lean MCP-native rather than building integrations one at a time
- **Indexing + embedding pipeline** (Postgres source-of-truth + Qdrant vectors)
- **Retrieval layer**
- **LLM orchestration** with tool-calling
- **ACL model:** source ACLs × workspace visibility × Hall privacy
- **Wiki accumulation engine** — the visible growing brain (entity markdown pages maintained over time)
- **`@merlin` agent surface** inside threads (streaming responses, source citations, warm-gold thinking indicator)
- **Standalone Merlin chat surface** (the third sidebar tab, where DM-indexing applies)

Recommended v1 scope: **one connector, done exceptionally well** (GitHub is the obvious pick for the dev-tools early audience) plus the collective-memory layer + visible wiki. Race for integration breadth later.

## Open decisions

- **Palette implementation in CSS** — twilight-violet + warm starlight-gold values not yet in `globals.css`. Need to land the new direction without re-triggering the painful color-tuning churn that happened in mid-May.
- **First integration:** GitHub or Linear? Slight lean toward GitHub for early dev audience.
- **Embedding model and chunking strategy** for Merlin.

## Open work, in rough order

1. Trademark check on LOR in classes 9 & 42 (USPTO TESS).
2. ~~Register `ravn.to`.~~ Superseded — register / point `lor.chat`.
3. 30 customer discovery calls with CTOs / engineering leads before architecting Merlin.
4. Commission wordmark (o-as-portal) + constellation mark in Geist.
5. Update the shadcn theme in `packages/ui` to the twilight-violet + starlight-gold direction — carefully, with maintainer sign-off on values.
6. Build the tabbed sidebar IA (Halls / DMs / Merlin tabs) + minimal top bar per [Navigation & sidebar IA](#navigation--sidebar-ia). Includes Discord-style collapsible Hall categories.
7. Branch the delete pass. Strip the old lexicon and surfaces listed in [Delete aggressively](#delete-aggressively-do-not-rename-do-not-migrate-just-rm).
8. Rebuild marketing site copy on `apps/www` against the new Lor / institutional-memory positioning.
9. Wire up Qdrant. Decide embedding model + chunking + collection schema.
10. Begin the connector + retrieval work (likely GitHub first).
11. Implement `@merlin` agent surface — inline `@merlin` in threads (streaming, citations, gold-pulse) AND the standalone Merlin chat surface (the third sidebar tab, where DM-indexing applies).
12. Begin wiki-accumulation engine — structured markdown entity pages that grow with the corpus.

## Related docs

- [`README.md`](./README.md) — repo overview (still describes old Townhall as of this writing)
- [`ROADMAP.md`](./ROADMAP.md) — feature roadmap (will need a rewrite alongside the pivot)
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code working notes for this repo
