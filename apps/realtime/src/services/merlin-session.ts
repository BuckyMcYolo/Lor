import type { createClient } from "redis"

type RedisClient = ReturnType<typeof createClient>

// How long after a user's last exchange with Merlin they can keep replying in
// the same channel/thread without re-mentioning @Merlin. Refreshed each turn.
const SESSION_TTL_SECONDS = 120

// Keyed by conversation scope (thread root, else channel) + user: a session is
// the asker's alone, and a thread session never bleeds into the channel.
function sessionKey(scopeId: string, userId: string) {
  return `merlin:session:${scopeId}:${userId}`
}

export async function openMerlinSession(
  redis: RedisClient,
  scopeId: string,
  userId: string
) {
  await redis.set(sessionKey(scopeId, userId), "1", { EX: SESSION_TTL_SECONDS })
}

export async function isMerlinSessionOpen(
  redis: RedisClient,
  scopeId: string,
  userId: string
): Promise<boolean> {
  return (await redis.exists(sessionKey(scopeId, userId))) === 1
}

export async function closeMerlinSession(
  redis: RedisClient,
  scopeId: string,
  userId: string
) {
  await redis.del(sessionKey(scopeId, userId))
}

// Threads default to "Merlin responds" once it's posted there. Mentioning a
// teammate (not Merlin) mutes that — humans have taken the thread over — until
// someone @Merlins again. Long TTL just garbage-collects abandoned threads.
const THREAD_MUTE_TTL_SECONDS = 7 * 24 * 60 * 60

function threadMuteKey(threadRootId: string) {
  return `merlin:thread:muted:${threadRootId}`
}

export async function muteMerlinThread(
  redis: RedisClient,
  threadRootId: string
) {
  await redis.set(threadMuteKey(threadRootId), "1", {
    EX: THREAD_MUTE_TTL_SECONDS,
  })
}

export async function unmuteMerlinThread(
  redis: RedisClient,
  threadRootId: string
) {
  await redis.del(threadMuteKey(threadRootId))
}

export async function isMerlinThreadMuted(
  redis: RedisClient,
  threadRootId: string
): Promise<boolean> {
  return (await redis.exists(threadMuteKey(threadRootId))) === 1
}
