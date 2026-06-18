import {
  and,
  db,
  desc,
  eq,
  isNotNull,
  isNull,
  MERLIN_USER_ID,
  ne,
  or,
  schema,
} from "@repo/db"
import { withContext } from "@repo/logger"
import { respond, writeBack } from "@repo/merlin"
import { buildMessageFanout } from "@repo/messaging"
import type { MerlinRespondJobData } from "@repo/realtime-types"
import type { ServerToClientEvents } from "@repo/realtime-types/events"
import { channelRoom, threadRoom, userRoom } from "@repo/realtime-types/rooms"
import type { Emitter } from "@socket.io/redis-emitter"
import type { Job } from "bullmq"
import type { createClient } from "redis"
import { logger } from "@/lib/logger"

// The redis client type, derived from the same createClient the worker
// entrypoint uses (avoids the RedisClientType generic/duplicate-copy mismatch).
type RedisClient = ReturnType<typeof createClient>

// Batch streamed tokens so we publish ~every 24 chars, not per chunk.
const FLUSH_THRESHOLD = 24
const CONTEXT_LIMIT = 30
// Per-workspace write-back lock TTL (seconds) — releases if the worker crashes.
const WRITEBACK_LOCK_TTL = 120

// Recent messages of the channel (or thread), oldest→newest, with author
// names — excluding the empty placeholder and content-less system messages.
async function loadConversation(args: {
  channelId: string
  threadRootId: string | null
  merlinMessageId: string
}) {
  const scope = args.threadRootId
    ? or(
        eq(schema.message.id, args.threadRootId),
        eq(schema.message.threadRootId, args.threadRootId)
      )
    : and(
        eq(schema.message.channelId, args.channelId),
        isNull(schema.message.threadRootId)
      )

  const rows = await db
    .select({
      content: schema.message.content,
      authorName: schema.user.name,
    })
    .from(schema.message)
    .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
    .where(
      and(
        scope,
        ne(schema.message.id, args.merlinMessageId),
        isNotNull(schema.message.content)
      )
    )
    .orderBy(desc(schema.message.createdAt))
    .limit(CONTEXT_LIMIT)

  return rows
    .reverse()
    .map((r) => ({ authorName: r.authorName, content: r.content ?? "" }))
}

export function createMerlinRespondProcessor(
  emitter: Emitter<ServerToClientEvents>,
  redis: RedisClient
) {
  return (job: Job<MerlinRespondJobData>) =>
    withContext(
      { jobId: job.id, jobName: job.name, channelId: job.data.channelId },
      async () => {
        const { merlinMessageId, channelId, threadRootId } = job.data
        const room = threadRootId
          ? threadRoom(threadRootId)
          : channelRoom(channelId)

        const emit = (delta: string, done: boolean) =>
          emitter.to(room).emit("message:stream", {
            channelId,
            messageId: merlinMessageId,
            delta,
            done,
          })

        // Register the stream so clients can show a thinking indicator.
        emit("", false)

        // Phase 1 — generation + streaming. A failure here means no complete
        // answer was streamed, so replacing the client's (partial) text with a
        // fallback is correct.
        let answer: Awaited<ReturnType<typeof respond>>
        let workspaceId: string
        let gateText: string
        try {
          const conversation = await loadConversation({
            channelId,
            threadRootId,
            merlinMessageId,
          })

          const channel = await db
            .select({ workspaceId: schema.channel.workspaceId })
            .from(schema.channel)
            .where(eq(schema.channel.id, channelId))
            .then((r) => r[0])

          // Merlin only answers in workspace channels (it's never in a DM).
          if (!channel?.workspaceId) {
            logger.warn(
              { channelId, merlinMessageId },
              "Merlin invoked outside a workspace channel; skipping"
            )
            emit("", true)
            return
          }
          workspaceId = channel.workspaceId

          let pending = ""
          answer = await respond(
            { workspaceId, conversation },
            {
              onDelta: (d) => {
                pending += d
                if (pending.length >= FLUSH_THRESHOLD) {
                  emit(pending, false)
                  pending = ""
                }
              },
            }
          )
          if (pending.length > 0) emit(pending, false)

          gateText = `${conversation
            .map((t) => `${t.authorName}: ${t.content}`)
            .join("\n")}\n\nMerlin: ${answer.text}`
        } catch (err) {
          logger.error({ err, merlinMessageId }, "Merlin response failed")
          const fallback =
            "⚠️ I ran into an error answering that. Please try again."
          await db
            .update(schema.message)
            .set({ content: fallback })
            .where(eq(schema.message.id, merlinMessageId))
            .catch(() => {})
          emit(fallback, true)
          return
        }

        // Phase 2 — persistence + fanout. The reply is already fully streamed
        // to clients, so a failure here must NOT clobber it with a fallback:
        // log it, still emit the final signal so clients finalize the streamed
        // text, and leave the DB row for a later retry to reconcile.
        try {
          await db
            .update(schema.message)
            .set({ content: answer.text })
            .where(eq(schema.message.id, merlinMessageId))

          // Notify like a normal message now the reply is final: fan out
          // unread/mention notifications to recipients' user rooms.
          const channelRow = await db
            .select({
              id: schema.channel.id,
              workspaceId: schema.channel.workspaceId,
              name: schema.channel.name,
            })
            .from(schema.channel)
            .where(eq(schema.channel.id, channelId))
            .then((r) => r[0])

          if (channelRow) {
            const fanout = await buildMessageFanout({
              authorId: MERLIN_USER_ID,
              channel: channelRow,
              message: {
                id: merlinMessageId,
                content: answer.text,
                author: { name: "Merlin" },
                attachments: [],
              },
            })
            for (const n of fanout.unreadNotifications) {
              emitter
                .to(userRoom(n.userId))
                .emit("notification:unread", n.payload)
            }
            for (const n of fanout.mentionNotifications) {
              emitter
                .to(userRoom(n.userId))
                .emit("notification:mention", n.payload)
            }
          }

          emit("", true)
          logger.info(
            { merlinMessageId, length: answer.text.length },
            "Merlin reply complete"
          )
        } catch (err) {
          logger.error(
            { err, merlinMessageId },
            "Merlin reply persistence/fanout failed after streaming"
          )
          emit("", true)
        }

        // Phase 3 — autonomous write-back, after the answer is delivered.
        // A per-workspace lock serializes writes so concurrent mentions can't
        // race on the brain tree; if another write-back holds it, skip this one
        // (the knowledge resurfaces on a later mention).
        const lockKey = `merlin:writeback:${workspaceId}`
        const acquired = await redis
          .set(lockKey, "1", { NX: true, EX: WRITEBACK_LOCK_TTL })
          .catch(() => null)
        if (acquired !== "OK") {
          logger.info(
            { workspaceId, merlinMessageId },
            "Write-back skipped; another is in progress"
          )
          return
        }
        try {
          await writeBack(
            { workspaceId, priorMessages: answer.messages, gateText },
            {
              onMemoryWritten: ({ path, action }) =>
                emitter.to(room).emit("merlin:memory", {
                  channelId,
                  messageId: merlinMessageId,
                  path,
                  action,
                }),
            }
          )
        } catch (err) {
          logger.error({ err, merlinMessageId }, "Merlin write-back failed")
        } finally {
          await redis.del(lockKey).catch(() => {})
        }
      }
    )
}
