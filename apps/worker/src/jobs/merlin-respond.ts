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
import { respond } from "@repo/merlin"
import { buildMessageFanout } from "@repo/messaging"
import type { MerlinRespondJobData } from "@repo/realtime-types"
import type { ServerToClientEvents } from "@repo/realtime-types/events"
import { channelRoom, threadRoom, userRoom } from "@repo/realtime-types/rooms"
import type { Emitter } from "@socket.io/redis-emitter"
import type { Job } from "bullmq"
import { logger } from "@/lib/logger"

// Batch streamed tokens so we publish ~every 24 chars, not per chunk.
const FLUSH_THRESHOLD = 24
const CONTEXT_LIMIT = 30

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
  emitter: Emitter<ServerToClientEvents>
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

        try {
          const conversation = await loadConversation({
            channelId,
            threadRootId,
            merlinMessageId,
          })

          let pending = ""
          const { text } = await respond(conversation, {
            onDelta: (d) => {
              pending += d
              if (pending.length >= FLUSH_THRESHOLD) {
                emit(pending, false)
                pending = ""
              }
            },
          })
          if (pending.length > 0) emit(pending, false)

          await db
            .update(schema.message)
            .set({ content: text })
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
                content: text,
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
            { merlinMessageId, length: text.length },
            "Merlin reply complete"
          )
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
        }
      }
    )
}
