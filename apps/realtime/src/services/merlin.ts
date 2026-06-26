import {
  and,
  db,
  desc,
  eq,
  isNotNull,
  isNull,
  MERLIN_USER_ID,
  schema,
} from "@repo/db"
import type { PlacementTurn } from "@repo/merlin/placement"
import { extractDirectMentionUserIds } from "@repo/messaging"
import type { RealtimeMessage } from "@repo/realtime-types"
import type { AccessibleChannel } from "@/services/channel-access"
import { createMessage } from "@/services/messages"

const PLACEMENT_CONTEXT_LIMIT = 12

export function isMerlinMentioned(content: string | null | undefined): boolean {
  if (!content) return false
  return extractDirectMentionUserIds(content).has(MERLIN_USER_ID)
}

// Whether the message addresses a teammate (any non-Merlin mention). Used to
// end an open Merlin session — talking to a person isn't talking to Merlin.
export function mentionsOtherUser(content: string | null | undefined): boolean {
  if (!content) return false
  for (const id of extractDirectMentionUserIds(content)) {
    if (id !== MERLIN_USER_ID) return true
  }
  return false
}

// Has Merlin posted in this thread? If so the thread is an ongoing Merlin
// conversation, so plain replies go to it without a mention or session window.
export async function isMerlinThread(threadRootId: string): Promise<boolean> {
  const row = await db
    .select({ id: schema.message.id })
    .from(schema.message)
    .where(
      and(
        eq(schema.message.authorId, MERLIN_USER_ID),
        eq(schema.message.threadRootId, threadRootId)
      )
    )
    .limit(1)
    .then((r) => r[0])
  return !!row
}

// Recent channel-level messages (oldest→newest) used to decide reply placement.
export async function loadRecentChannelMessages(
  channelId: string
): Promise<PlacementTurn[]> {
  const rows = await db
    .select({
      content: schema.message.content,
      authorName: schema.user.name,
    })
    .from(schema.message)
    .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
    .where(
      and(
        eq(schema.message.channelId, channelId),
        isNull(schema.message.threadRootId),
        isNotNull(schema.message.content)
      )
    )
    .orderBy(desc(schema.message.createdAt))
    .limit(PLACEMENT_CONTEXT_LIMIT)

  return rows
    .reverse()
    .map((r) => ({ authorName: r.authorName, content: r.content ?? "" }))
}

// Empty Merlin placeholder the worker streams into; no fanout (fires on completion).
export async function createMerlinPlaceholder(args: {
  accessibleChannel: AccessibleChannel
  channelId: string
  threadRootId: string | null
}): Promise<RealtimeMessage> {
  const result = await createMessage({
    userId: MERLIN_USER_ID,
    payload: {
      channelId: args.channelId,
      threadRootId: args.threadRootId ?? undefined,
    },
    accessibleChannel: args.accessibleChannel,
  })
  return result.message
}
