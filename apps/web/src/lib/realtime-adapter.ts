import type { RealtimeMessage } from "@repo/realtime-types"
import type { Message, MessageAuthor } from "./api-types"

export function realtimeMessageToMessage(rm: RealtimeMessage): Message {
  return {
    id: rm.id,
    channelId: rm.channelId,
    authorId: rm.author.id,
    content: rm.content,
    type: rm.type,
    createdAt: rm.createdAt,
    author: rm.author,
    referencedMessageId: null,
    attachments: [],
    embeds: [],
    pinned: false,
    editedAt: null,
  }
}

/**
 * Creates an optimistic message that appears instantly in the UI.
 * Uses `nonce` as the temporary `id` so it can be replaced when the server confirms.
 */
export function createOptimisticMessage(
  nonce: string,
  channelId: string,
  content: string,
  author: MessageAuthor
): Message {
  return {
    id: nonce,
    channelId,
    authorId: author.id,
    content,
    type: "default",
    createdAt: new Date().toISOString(),
    author,
    referencedMessageId: null,
    attachments: [],
    embeds: [],
    pinned: false,
    editedAt: null,
  }
}
