# Pivot: Townhall → Lor

> **Status (2026-05-28):** Brand direction locked. Codebase rename / delete pass **not yet executed**. The repo still uses the old Townhall lexicon (Voice Chamber, Decree, Council, Sigil, etc.) and CSS still carries the intermediate **Ravn** palette. Do not start renames in code until decisions below are settled with the maintainer.
>
> **Update (2026-05-28):** Scope adjustments after a feature-audit pass:
> - Channels keep the name `channels` — the "Halls" rename is dropped. Merlin is now the *only* lore-flavored vocabulary token in the product surface.
> - **All conversations are public to the workspace by default** — no private channel primitive in v1. Public-by-default is the feature, not a limitation: it's what makes Merlin's corpus discoverable and complete. Sensitive material belongs in DMs.
> - Voice channels are **kept** (Slack Huddles / Discord voice analog). Transcripts feed Merlin context, so voice is part of the same corpus, captured differently.
> - Workspace primitive name locked: **`workspaces`** (`guilds` → `workspaces` rename pass to follow the delete pass).

## TL;DR

Townhall — an open-source Discord-alternative for community chat — is becoming **Lor**: a chat-first **institutional-memory** product for software teams. Chat is the interface. **Merlin** (the AI agent) is the actual product. Framed competitively as **"Glean for small teams"** — open-source, self-hostable, with chat as the native surface instead of a search-bar overlay.

The name **Lor** is from Old English *lār* — teaching, accumulated knowledge. Domain: [lor.chat](https://lor.chat). The agent is **Merlin** (the sage who remembers; Lor is what he protects).

## Lineage (very brief)

1. **Townhall** (Feb 2026) — privacy-first Discord alternative, triggered by Discord's age-verification announcement. Warm brown/gold palette. Consumer/B2C.
2. **Ravn** (intermediate, weeks) — short-lived gothic Norse identity (deep purples, raven mascot, "cloaked stranger"). Abandoned for being too cold/edgy for B2B and still serving the wrong framing.
3. **Lor** (mid-May 2026 →) — B2B institutional memory. Twilight-violet + warm starlight-gold. Wonder-first brand voice. Merlin is the named character and the only lore-flavored vocabulary token that survives into the product surface — channels stay `channels`. The mythology lives in palette, typography, and Merlin's persona, not in renaming UI primitives.

## Why the pivot

Three honest reckonings drove it:

1. **Competing with Discord on chat alone is structurally weak.** Network effects favor the incumbent (~230M MAU). No amount of privacy-first positioning overcomes that.
2. **The "communal AI with server-wide context" feature on the Townhall roadmap was actually the whole product, not a feature.** A chat platform where an agent indexes all communication, docs, incidents, and integrations — and answers questions about company history and decisions — is not "Discord with an AI bot." Different product category.
3. **B2B dev teams have a clear buyer, a clear pain, a clear revenue model.** Consumer community platforms don't.

The thesis crystallized as: *"Every engineering team loses 30% of its context every time someone leaves. Lor is the chat platform where that context becomes permanent."*

## What the product is

A team chat app (workspaces, channels, threads, presence, realtime, voice) wrapped around an AI agent (**Merlin**, summoned via `@merlin`) that answers questions across:

- Internal chat history (channels are workspace-wide public; DMs are the only private surface — Merlin respects that boundary)
- Voice channel transcripts (huddles / meetings — captured into the same corpus)
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

Cross-org collaboration (vendors, contractors, customers) is deferred to v2+ as Slack-Connect-style **shared channels**. Not in v1.

### Conversation primitives

Two surfaces, with voice as a sub-mode of channels:

1. **Channels** — workspace-wide, topical, **visible to all workspace members**. No private channels in v1. The institutional-memory thesis requires the corpus be discoverable and complete: if a decision can be hidden in a private channel, Merlin's answers become unreliable and the product's promise breaks. **Public-by-default is the feature, not a limitation.** Privacy boundary = workspace membership. If a topic is too sensitive for the workspace, it belongs in a DM (or shouldn't be in chat at all).

2. **DMs** — 1:1 and group direct messages. Ad-hoc threads identified by participants, with no topic or persistent membership semantics. **DMs are the only surface in the product where workspace-wide visibility does not apply** — they're the pressure-release valve for the public-channels rule.

**Voice channels** sit alongside text channels as a Slack-Huddles / Discord-voice analog. They are still channels (public to the workspace, joinable by any member). Voice sessions are transcribed and become part of Merlin's corpus — meetings stop being a memory black hole the moment they end.

Channels and DMs are different primitives, intentionally. A channel is a *persistent topical space*; a group DM is an *ad-hoc thread between specific people*. Don't try to collapse them.

### Navigation & sidebar IA

The interface is **two regions**: a thin top bar and a tabbed sidebar. The main conversation pane fills the rest.

```
┌──────────────────────────────────────────────┐
│  Workspace ▾                       🔍        │  ← top bar
├──────────────────────────────────────────────┤
│  ┌──────────┬──────────┬───────────────┐    │
│  │ Channels │ DMs  (3) │ Merlin        │    │  ← sidebar tabs
│  └──────────┴──────────┴───────────────┘    │
├──────────────────────────────────────────────┤
│  ▾ core                                      │
│      # general                               │
│      # eng                       (3)         │
│      🔊 standup                              │
│  ▾ engineering                               │
│      # eng-frontend                          │
│      # eng-backend                           │
│      🔊 pairing                              │
│  ▾ design                                    │
│      # design-crit                           │
├──────────────────────────────────────────────┤
│  [Avatar]  You · presence            ⚙       │  ← user footer
└──────────────────────────────────────────────┘
```

**Top bar — minimal, on purpose.** Two affordances:

- `Workspace ▾` — workspace switcher (Linear/Figma dropdown). Cross-workspace nav lives here only.
- `🔍 Search` — global Cmd+K-style search across the active workspace.

No new-message icon, no inbox, no drafts, no activity feed, no apps menu. Per-channel unread badges *are* the inbox. To start a new message, navigate to that channel and type.

**Tabbed sidebar — three tabs, one active at a time.**

- **Channels** — all workspace channels (text + voice), organized in **collapsible Discord-style categories**. `#` for text, `🔊` for voice. One iconography system, no exceptions. No `🔒` — all channels are public to the workspace.
- **DMs** — flat list, 1:1 and group DMs together, recents first. No friend requests, no allies, no friendship layer — workspace membership *is* the relationship.
- **Merlin** — flat list of saved standalone Merlin chats (ChatGPT-style named conversations), `+ new chat` at top. Note: `@merlin` invocations inside channels/DMs are inline replies in those threads and do **not** create sidebar entries here. This tab is **only** for standalone 1:1 Merlin chats (the surface where DM-indexing applies, per the trust boundary below).

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

Two simple rules, derived from the "all channels public" decision:

1. **Channels:** every channel is visible to every workspace member, so Merlin can use any channel content in any answer to any member of that workspace. No per-user retrieval gating needed at the channel layer.
2. **DMs:** Merlin **never** uses DM content when answering inside channels, group DMs, or another user's space. DM content is only ever used in the asking user's standalone Merlin chat, and only if that user has opted in to DM indexing (see next section).

Cross-workspace isolation is absolute: a Merlin instance for Workspace A never sees Workspace B's corpus, full stop.

### DM indexing & Merlin in DMs

DM content is **opt-in per user**, off by default. When opted in, Merlin may use your DMs as context — but **only in one surface**: a **standalone 1:1 chat with Merlin** (a dedicated Merlin conversation, ChatGPT/Claude-app style, separate from any `@merlin` invocation in a multi-user space).

Merlin **never** surfaces, cites, or references DM content in any other context:

- Not in any channel (all channels are public to the workspace, so DM content leaking there leaks broadly)
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

The product UI is dev-clean (Geist, restrained, fast); the brand voice is mythic (illuminated manuscripts, twilight travel, dawn air, journey, accumulated lore). Wonder lives in *atmosphere* — palette, typography, illustrations, hero imagery — not in *vocabulary*. Don't write "thy" or "doth." **Merlin** is the only lore-flavored vocabulary token that survives into the product surface.

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

**Merlin is the only lore-flavored vocabulary token in the product surface.** Every other Townhall medieval term is retired:

- Channels stay `channels` (the earlier "Halls" rename was dropped — it added cognitive load without payoff once the rest of the lexicon was gone)
- Voice channels stay `voice channels` (not "Voice Chambers")
- DMs stay `DMs` (not "Send a Raven" / "Ravens")
- Workspace members stay `members` (not "Citizens"); admins stay `admins` (not "Wardens")
- No Sigils, Crests, Allies, Banish, Silence, Decree, Council, Discovery — all gone

The wonder lives in atmosphere (palette, typography, illustrations, Merlin's voice) — not in UI vocabulary. The buyer is a senior engineer who'd bounce off a product that called channels "Halls."

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
- `packages/db` — Drizzle schema for users, messages, threads, mentions, reactions, presence, read-states, notification settings, invitations
- `packages/ui` — shadcn/ui + Tailwind v4 setup
- Web app shell. Text channels, threads, message composer, attachments — concepts carry over (no rename needed).
- **Voice channels as a feature** — `apps/realtime` voice surfaces stay. Lor needs huddle-style voice + meeting transcription (transcripts become Merlin context). The current implementation may need rework, but the primitive is kept.

### Delete aggressively (do not rename, do not migrate, just `rm`)

**Social / friendship layer** (workspace membership *is* the relationship):
- `packages/db/src/schemas/ally-requests.ts` + `apps/api/src/routes/v1/allies/` + `apps/web/src/components/allies/`
- `packages/db/src/schemas/user-privacy-settings.ts` + `apps/api/src/routes/v1/privacy-settings/` (peer-to-peer privacy controls don't apply inside a tenant)
- `realtime/src/services/blocks.ts` block enforcement in DMs (the `user-blocks` table itself stays for now per maintainer call — UI hidden)

**Banishment and timeouts — gone for good:**
- `packages/db/src/schemas/guild-bans.ts`
- `communicationDisabledUntil` / `communicationDisabledBy` / `communicationDisabledReason` fields on `guild-members.ts`
- `banGuildMember`, `timeoutGuildMember`, `clearGuildMemberTimeout` endpoints in `apps/api/src/routes/v1/guilds/`
- Ban / timeout UI in `apps/web/src/components/sidebar/right-panel/guild-members-panel.tsx`
- `isCommunicationDisabled` / `assertMemberCanCommunicate` helpers in `apps/api/src/lib/permissions.ts`

**Granular permission system — KEPT** (decision reversed 2026-05-28):
- The better-auth `createAccessControl` system in `packages/auth/src/lib/permissions.ts` stays. `guild-roles.ts` schema stays. Dynamic per-guild role grants stay. `assertGuildPermission(actor, guild, { channel: ["update"] })` pattern stays — it scales better than `if role === "admin"` sprinkled in handlers.
- Trims to the system for Lor scope: drop `announcement` statement (no announcement channels), drop `ban`/`timeout` actions from `guildMember` (features removed), drop the `warden` role (no moderator tier; teams can define their own moderator role via the dynamic `guild_role` table), drop "Citizen" label → "Member."
- Final core roles: `owner`, `admin`, `member`. Assignable via API: `["admin", "member"]`.
- `role` column on `guild_member` is plain `text` (no DB enum constraint) — better-auth pattern, allows dynamic role names.

**Channel types we don't need:**
- `announcement` (Decrees) — B2B teams don't broadcast like communities
- `forum` — threads live inside text channels
- Remove these values from the channel-type enum in `packages/db/src/schemas/channels.ts` and any UI branches that render them

**`category` channel-type stays.** Earlier draft said "categories are sidebar UI grouping, not a channel-type row." Revisited 2026-05-28: that was an aesthetic preference, not a load-bearing requirement. Discord uses the same channel-as-category-row pattern at scale. Migrating to a separate `channel_category` table would touch ~25-30 files + a real DB migration for marginal cleanup. Skipped. Revisit only if it causes concrete pain.

**Private channels:**
- Do not implement a private channel primitive. Channels are public to the workspace, full stop. If a `private`/`visibility` field gets added later, it must come with a maintainer decision — not as a quiet build.

**Group-DM lexicon (primitive stays, naming goes):**
- `group_dm` channel type stays. "Council" / "Send a Raven" naming and any related UI copy goes. Surface as plain DMs.

**Other Townhall lexicon** (mostly UI copy / docs, but track it down):
- Wardens, Citizens, Sigils, Crests, Allies, Banish, Silence, Decree, Council, Send-a-Raven, Voice Chamber → all gone
- All Ravn-era references (raven mascot, raven-themed copy, Munin agent name)
- Discovery (no code yet — just don't build it; strip any www links)

**Marketing site:**
- Marketing site copy on `apps/www` — full rewrite for Lor positioning (keep waitlist mechanic, rewrite copy)

### Build new
- **Connector framework** — lean MCP-native rather than building integrations one at a time
- **Indexing + embedding pipeline** (Postgres source-of-truth + Qdrant vectors)
- **Retrieval layer**
- **LLM orchestration** with tool-calling
- **ACL model:** source ACLs × workspace visibility (channels public to workspace, DMs private to participants, DM-indexed Merlin chats private to owner)
- **Wiki accumulation engine** — the visible growing brain (entity markdown pages maintained over time)
- **`@merlin` agent surface** inside threads (streaming responses, source citations, warm-gold thinking indicator)
- **Standalone Merlin chat surface** (the third sidebar tab, where DM-indexing applies)

Recommended v1 scope: **one connector, done exceptionally well** (GitHub is the obvious pick for the dev-tools early audience) plus the collective-memory layer + visible wiki. Race for integration breadth later.

## Open decisions

- **Workspace primitive name.** Current lean: **`Workspaces`** (Linear/Notion/Figma vocabulary, B2B-recognized, zero cognitive load). Better-auth's default is `organizations` — defensible but longer and more corporate. A Lor-flavored option (`Keeps` — castle stronghold / "place where things are kept") exists but fights the "Merlin is the only lore-vocab token" rule. Decide before starting the `guilds → ?` rename pass.
- **Palette implementation in CSS** — twilight-violet + warm starlight-gold values not yet in `globals.css`. Need to land the new direction without re-triggering the painful color-tuning churn that happened in mid-May.
- **First integration:** GitHub or Linear? Slight lean toward GitHub for early dev audience.
- **Embedding model and chunking strategy** for Merlin.
- **Notification settings depth.** `user-notification-settings` table is kept for now; whether per-channel granularity survives or collapses to workspace-level prefs is TBD.
- **Voice transcription pipeline.** Whisper local vs. hosted (Deepgram/AssemblyAI) vs. Claude/Gemini multimodal — and whether transcripts live in Postgres as a side table or stream straight into the message corpus. Not blocking the delete pass.

## Open work, in rough order

**Foundation first — rework the existing chat app before any Merlin work begins.** Per maintainer call (2026-05-28): the order below front-loads the delete pass + workspace rename so we have a clean base, then layers Merlin on top.

1. **Branch the delete pass.** Strip the old surfaces listed in [Delete aggressively](#delete-aggressively-do-not-rename-do-not-migrate-just-rm) — social/friendship layer, per-guild roles/bans/timeouts, `announcement`/`forum`/`category` channel types, Townhall lexicon, Ravn references. Voice channels stay.
2. ~~**Resolve the workspace primitive name** (see Open decisions) and execute the `guilds → workspaces|organizations|keeps` rename across schema, API routes, web routes, and components.~~ **Done.** `guild*` → `workspace*` rename executed across schemas (`packages/db/src/schemas/workspace*.ts`), API (`apps/api/src/routes/v1/workspaces/`), web routes (`apps/web/src/routes/_authenticated/$workspaceSlug/`), components, realtime room/event names, and permission helpers. Better-auth's `organization` plugin surface is unchanged at the API boundary.
3. **Collapse private-Hall scaffolding** if any landed — channels are public-to-workspace by design.
4. **Rebuild the sidebar IA** — tabbed sidebar (Channels / DMs / Merlin) + minimal top bar per [Navigation & sidebar IA](#navigation--sidebar-ia). Includes Discord-style collapsible categories. **The workspace switcher itself is deferred** — top-left can stay as a static workspace badge for now (the multi-workspace switcher dropdown is post-foundation work).
5. Rebuild marketing site copy on `apps/www` against the new Lor / institutional-memory positioning.
6. Trademark check on LOR in classes 9 & 42 (USPTO TESS).
7. ~~Register `ravn.to`.~~ Superseded — register / point `lor.chat`.
8. 30 customer discovery calls with CTOs / engineering leads before architecting Merlin.
9. Commission wordmark (o-as-portal) + constellation mark in Geist.
10. Update the shadcn theme in `packages/ui` to the twilight-violet + starlight-gold direction — carefully, with maintainer sign-off on values.

**Then — Merlin. Not before the above is solid:**

11. Wire up Qdrant. Decide embedding model + chunking + collection schema.
12. Begin the connector + retrieval work (likely GitHub first).
13. Implement `@merlin` agent surface — inline `@merlin` in threads (streaming, citations, gold-pulse) AND the standalone Merlin chat surface (the third sidebar tab, where DM-indexing applies).
14. Begin wiki-accumulation engine — structured markdown entity pages that grow with the corpus.
15. Voice-channel transcription → Merlin corpus pipeline (see Open decisions for stack choice).
16. Onboarding flow rewrite for B2B (workspace creation, invite teammates, connect first integration).

## Related docs

- [`README.md`](./README.md) — repo overview (still describes old Townhall as of this writing)
- [`ROADMAP.md`](./ROADMAP.md) — feature roadmap (will need a rewrite alongside the pivot)
- [`CLAUDE.md`](./CLAUDE.md) — Claude Code working notes for this repo
