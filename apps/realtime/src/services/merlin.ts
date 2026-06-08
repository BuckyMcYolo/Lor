import { MERLIN_USER_ID } from "@repo/db"
import { extractDirectMentionUserIds } from "@repo/messaging"
import type { RealtimeMessage } from "@repo/realtime-types"
import type { AccessibleChannel } from "./channel-access"
import { createMessage } from "./messages"

export function isMerlinMentioned(content: string | null | undefined): boolean {
  if (!content) return false
  return extractDirectMentionUserIds(content).has(MERLIN_USER_ID)
}

// Empty message authored by Merlin that the worker streams its reply into.
// No fanout here — notifications fire when the stream completes.
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
