# Roadmap

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
- [ ] Message deletion
- [ ] Message editing UI
- [ ] User profiles (bio, custom status, avatar upload)
- [ ] Channel edit/delete
- [ ] Settings pages

## Phase 2 — Permissions & Moderation

- [ ] Granular permission system (beyond owner/admin/member)
- [ ] Member management UI (kick, banish, silence, role assignment)
- [ ] Rate limiting enforcement (API-level + per-channel)
- [ ] Audit logs

## Phase 3 — Social Features

- [ ] Shareable invite links (not just email invites)
- [ ] Ally (friend) system with requests
- [ ] User blocking
- [ ] Privacy settings

## Phase 4 — Tests & CI/CD

- [ ] API endpoint tests
- [ ] Critical path integration tests
- [ ] CI pipeline (lint, type-check, test, build)
- [ ] Docker / deployment configs

## Phase 5 — Polish

- [ ] Message search
- [ ] Typing indicators
- [ ] Pinned messages panel
- [ ] Thread support
- [ ] Notification preferences
- [ ] Error handling & loading state improvements

## Phase 6 — Infrastructure

- [ ] Structured logger (Pino/Winston) replacing `console.error`
- [ ] Production environment management
- [ ] Production startup guard for `REALTIME_CORS_ORIGIN` on localhost defaults
- [ ] Database migration workflow
- [ ] Monitoring & logging (observability)
- [ ] CORS lockdown for production domains

## Phase 7 — v2 Features

- [ ] Voice/video (Voice Chambers)
- [ ] Bots & webhooks
- [ ] Custom emojis (Sigils & Crests)
- [ ] Server discovery
- [ ] Forum channel posts

---

## Backlog (Short-Term Hardening)

- [ ] Add explicit error logging in `initializeConnection` before disconnecting a socket (include `socket.id` + `userId` context).
- [ ] Update onboarding `normalizeSlugInput` to collapse repeated hyphens while typing.
- [ ] Use `DM_CHANNEL_TYPES` constant everywhere in DM route filters to avoid drift.
- [ ] Extract shared DM last-message projection/formatter helper so list/get endpoints use one source of truth.

## Backlog (Architecture / Scale)

- [ ] Move `@everyone` fanout off the realtime request path:
  - [ ] Enqueue one guild-fanout job instead of per-member synchronous work in `message:send`.
  - [ ] Process fanout in a worker with batched DB writes and chunked emits.
  - [ ] Add rate-limiting and permission checks for mass mentions.
