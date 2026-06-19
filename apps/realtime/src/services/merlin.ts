import { MERLIN_USER_ID } from "@repo/db"
import { extractDirectMentionUserIds } from "@repo/messaging"
import type { RealtimeMessage } from "@repo/realtime-types"
import type { AccessibleChannel } from "./channel-access"
import { createMessage } from "./messages"

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
