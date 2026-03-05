import type {
  RealtimeMessage,
  RealtimeMessageReactionUpdated,
} from "@repo/realtime-types"
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
    mentions: rm.mentions,
    reactions: rm.reactions,
  }
}

export function applyReactionUpdateToMessage(
  message: Message,
  update: RealtimeMessageReactionUpdated,
  currentUserId?: string
): Message {
  if (message.id !== update.messageId) {
    return message
  }

  const existingReactions = message.reactions ?? []
  const reactionIndex = existingReactions.findIndex(
    (reaction) => reaction.emoji === update.emoji
  )
  const nextReactions = [...existingReactions]

  if (update.count <= 0) {
    if (reactionIndex === -1) {
      return message
    }

    nextReactions.splice(reactionIndex, 1)
    return {
      ...message,
      reactions: nextReactions,
    }
  }

  const reactedByCurrentUser =
    currentUserId && update.actorUserId === currentUserId
      ? update.reactedByActor
      : ((reactionIndex >= 0 ? nextReactions[reactionIndex] : undefined)
          ?.reactedByCurrentUser ?? false)

  const nextReaction = {
    emoji: update.emoji,
    count: update.count,
    reactedByCurrentUser,
  }

  if (reactionIndex === -1) {
    nextReactions.push(nextReaction)
  } else {
    nextReactions[reactionIndex] = nextReaction
  }

  return {
    ...message,
    reactions: nextReactions,
  }
}

/**
 * Optimistically toggles a reaction for the current user on a single message.
 * This mirrors server toggle behavior for immediate UI feedback.
 */
export function toggleReactionOptimistically(
  message: Message,
  emoji: string
): Message {
  const existingReactions = message.reactions ?? []
  const reactionIndex = existingReactions.findIndex(
    (reaction) => reaction.emoji === emoji
  )

  if (reactionIndex === -1) {
    return {
      ...message,
      reactions: [
        ...existingReactions,
        { emoji, count: 1, reactedByCurrentUser: true },
      ],
    }
  }

  const nextReactions = [...existingReactions]
  const currentReaction = nextReactions[reactionIndex]
  if (!currentReaction) {
    return message
  }

  if (currentReaction.reactedByCurrentUser) {
    const nextCount = currentReaction.count - 1
    if (nextCount <= 0) {
      nextReactions.splice(reactionIndex, 1)
    } else {
      nextReactions[reactionIndex] = {
        ...currentReaction,
        count: nextCount,
        reactedByCurrentUser: false,
      }
    }
  } else {
    nextReactions[reactionIndex] = {
      ...currentReaction,
      count: currentReaction.count + 1,
      reactedByCurrentUser: true,
    }
  }

  return {
    ...message,
    reactions: nextReactions,
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
  author: MessageAuthor,
  mentions: Message["mentions"] = []
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
    mentions,
    reactions: [],
  }
}
