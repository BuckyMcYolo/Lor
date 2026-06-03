# Roadmap

> Note: roadmap pending a full rewrite for Lor positioning. This is a cleanup pass — old/dead items removed but not yet refreshed with new Lor-specific direction.

## Completed

- [x] Add `apps/realtime` Socket.IO gateway and wire it to authenticated sessions.
- [x] Register realtime socket handlers synchronously and run presence bootstrap asynchronously (`initializeConnection`).
- [x] Prevent duplicate sender delivery for realtime events:
  - [x] `message:send` broadcasts with `socket.to(channelRoom(...)).emit(...)`.
  - [x] `channel:mark-read` broadcasts with `socket.to(userRoom(...)).emit(...)` and returns sender state via `ack`.
- [x] Add core notification/read-state schema tables:
  - [x] `message_mention`
  - [x] `notification_event`
  - [x] `channel_read_state`
- [x] Document schema intent with comments (including why notifications/mentions use `userId` instead of guild-scoped member IDs).
- [x] Handle notification insert conflicts safely by merging inserted + existing `notification_event` rows when `.onConflictDoNothing().returning()` suppresses duplicates.
- [x] Improve onboarding guild creation flow with safe first-channel lookup fallback to guild root navigation.
- [x] Refactor DM membership checks into a shared helper and remove redundant member remapping in `getDM`.
- [x] Move realtime runtime config to validated env values (`REALTIME_PORT`, `REALTIME_CORS_ORIGIN`).

---

## Phase 1 — Core UX Gaps

- [x] File/image attachment uploads (R2)
- [x] Message deletion
- [x] Message editing UI
- [x] User profiles (bio, custom status, avatar upload)
- [x] Channel edit/delete
- [x] User settings page

## Phase 2 — Permissions & Moderation

- [ ] Granular permission system (beyond owner/admin/member)
- [ ] Rate limiting enforcement (API-level + per-channel)
- [ ] Audit logs

## Phase 4 — Tests & CI/CD

- [ ] API endpoint tests
- [ ] Critical path integration tests
- [ ] CI pipeline (lint, type-check, test, build)
- [ ] Docker / deployment configs

## Phase 5 — Polish

- [x] Message search — guild-wide and DM search APIs, interactive search bar dropdown in both guild and DM panels
- [x] Typing indicators
- [x] Pinned messages panel
- [ ] **Thread support** — Slack-style sidebar threads for long sub-discussions and AI Q&A drill-downs. General-purpose (humans use them too), kept as a separate primitive from inline `referencedMessageId` replies, which stay Discord-style and continue to render in the channel feed.
  - **Schema** — add `threadRootId` (uuid, nullable, → `message.id`) to the `message` table. Messages with `threadRootId IS NULL` are channel messages; messages with it set are thread replies and never render in the main feed. Denormalize `threadReplyCount` and `threadLastReplyAt` on the root for the channel-feed footer (keeps the channel query cheap).
  - **API** — `listChannelMessages` filters `WHERE threadRootId IS NULL`. New `GET /channels/:id/messages/:rootId/thread` reuses the cursor pagination (`around` / `before` / `after` / `limit`). `message:send` accepts an optional `threadRootId` — when set, the reply is broadcast to thread subscribers only, not to the channel feed. Update the root's denormalized reply count + last-reply time inside the same transaction.
  - **Realtime** — new events `thread:reply:created` / `:updated` / `:deleted` scoped to thread rooms (`thread:<rootId>`). Channel rooms get a lightweight `message:thread:updated` with the new count + last-reply timestamp so the channel-feed footer stays live without re-broadcasting the reply body.
  - **UI** — `MessageActionBar` gains a "Reply in thread" action on every message. Messages with `threadReplyCount > 0` render a footer ("N replies · last at …"). Clicking either opens the thread in the existing right-side panel (alongside pinned/members views) with the root pinned at top, a paginated reply list using the same `MessageList` + `useChannelMessages`-style hook, and its own composer.
  - **Merlin behavior** — Merlin decides per-response whether to reply inline (default — surfaces artifacts, citations, and tool-call results to the channel so the whole team sees them) or open a thread (long verbose Q&A, follow-up clarification, off-topic drift). Users can also pull any Merlin reply into a thread via the explicit action. The thread primitive itself stays universal — no AI-specific branching in the data model.
- [x] Desktop app (Tauri) — native window wrapper, notification plugin wired up
- [x] Desktop/browser notifications — notification:bootstrap on connect, unread state context, auto-mark-as-read, browser Notification API + Tauri native notifications
- [x] Notification preferences — user_notification_settings table, API (get/update), settings UI (desktop/DM notification levels, permission request)
- [x] Unread indicators (Discord-style) — channel/DM text highlights, mention badges, left-side unread pill
- [x] Reaction tooltips (who reacted with each emoji)
- [x] User profile popover (bio, status, online indicator)
- [x] Remember last visited channel per guild (localStorage)
- [ ] Error handling & loading state improvements
- [x] Username editing in account settings (with availability check)
- [ ] Other settings pages

## Phase 6 — Infrastructure

- [ ] Structured logger (Pino/Winston) replacing `console.error`
- [ ] Production environment management
- [ ] Production startup guard for `REALTIME_CORS_ORIGIN` on localhost defaults
- [ ] Monitoring & logging (observability)
- [ ] CORS lockdown for production domains

## Phase 7 — v2 Features

- [ ] Voice/video (voice channels)
- [ ] Bots & webhooks (including inbound channel webhooks for integrations like GitHub PR notifications with @mentions)

---

## Backlog (Short-Term Hardening)

- [x] Fix stale presence after server restart (heartbeat TTL + reconciliation sweep).
- [ ] Add explicit error logging in `initializeConnection` before disconnecting a socket (include `socket.id` + `userId` context).
- [ ] Update onboarding `normalizeSlugInput` to collapse repeated hyphens while typing.
- [ ] Use `DM_CHANNEL_TYPES` constant everywhere in DM route filters to avoid drift.
- [ ] Extract shared DM last-message projection/formatter helper so list/get endpoints use one source of truth.

## Backlog (Architecture / Scale)

- [ ] Move `@everyone` fanout off the realtime request path:
  - [ ] Enqueue one guild-fanout job instead of per-member synchronous work in `message:send`.
  - [ ] Process fanout in a worker with batched DB writes and chunked emits.
  - [ ] Add rate-limiting and permission checks for mass mentions.
