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

## Next (Short-Term Hardening)

- [ ] Add explicit error logging in `initializeConnection` before disconnecting a socket (include `socket.id` + `userId` context).
- [ ] Replace `console.error` with a proper structured logger package (e.g. Pino or Winston) and wire logs for external observability platforms (Datadog/New Relic).
- [ ] Update onboarding `normalizeSlugInput` to collapse repeated hyphens while typing.
- [ ] Use `DM_CHANNEL_TYPES` constant everywhere in DM route filters to avoid drift.

## Later (Architecture / Scale)

- [ ] Move `@everyone` fanout off the realtime request path:
  - [ ] Enqueue one guild-fanout job instead of per-member synchronous work in `message:send`.
  - [ ] Process fanout in a worker with batched DB writes and chunked emits.
  - [ ] Add rate-limiting and permission checks for mass mentions.
- [ ] Add a production startup guard that fails fast (or loudly warns) when `REALTIME_CORS_ORIGIN` is left on localhost defaults.
- [ ] Extract shared DM last-message projection/formatter helper so list/get endpoints use one source of truth.
