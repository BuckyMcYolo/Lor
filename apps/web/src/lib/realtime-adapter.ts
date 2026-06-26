import type {
  RealtimeMessage,
  RealtimeMessageReactionUpdated,
} from "@repo/realtime-types"
import type { Message, MessageAuthor } from "@/lib/api-types"

export function realtimeMessageToMessage(rm: RealtimeMessage): Message {
  return {
    id: rm.id,
    channelId: rm.channelId,
    authorId: rm.author.id,
    content: rm.content,
    type: rm.type,
    createdAt: rm.createdAt,
    author: rm.author,
    referencedMessageId: rm.referencedMessage?.id ?? null,
    referencedMessage: rm.referencedMessage ?? null,
    attachments: rm.attachments ?? [],
    embeds: rm.embeds ?? [],
    pinned: false,
    editedAt: rm.editedAt ?? null,
    mentions: rm.mentions,
    reactions: rm.reactions,
    threadRootId: rm.threadRootId ?? null,
    threadSummary: null,
    ...(rm.streaming ? { streaming: true } : {}),
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

  // Update reactors list based on the actor's action
  const existingReactors = [
    ...((reactionIndex >= 0 ? nextReactions[reactionIndex] : undefined)
      ?.reactors ?? []),
  ]
  const actorInList = existingReactors.findIndex(
    (r) => r.id === update.actorUserId
  )

  if (update.reactedByActor && actorInList === -1) {
    existingReactors.push({ id: update.actorUserId, name: update.actorName })
  } else if (!update.reactedByActor && actorInList !== -1) {
    existingReactors.splice(actorInList, 1)
  }

  const nextReaction = {
    emoji: update.emoji,
    count: update.count,
    reactedByCurrentUser,
    reactors: existingReactors,
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
  emoji: string,
  currentUser?: { id: string; name: string }
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
        {
          emoji,
          count: 1,
          reactedByCurrentUser: true,
          reactors: currentUser ? [currentUser] : [],
        },
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
        reactors: currentUser
          ? (currentReaction.reactors ?? []).filter(
              (r) => r.id !== currentUser.id
            )
          : (currentReaction.reactors ?? []),
      }
    }
  } else {
    nextReactions[reactionIndex] = {
      ...currentReaction,
      count: currentReaction.count + 1,
      reactedByCurrentUser: true,
      reactors: currentUser
        ? [...(currentReaction.reactors ?? []), currentUser]
        : (currentReaction.reactors ?? []),
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
  content: string | null,
  author: MessageAuthor,
  mentions: Message["mentions"] = [],
  referencedMessage?: Message["referencedMessage"],
  attachments: Message["attachments"] = []
): Message {
  return {
    id: nonce,
    channelId,
    authorId: author.id,
    content,
    type: referencedMessage ? "reply" : "default",
    createdAt: new Date().toISOString(),
    author,
    referencedMessageId: referencedMessage?.id ?? null,
    referencedMessage: referencedMessage ?? null,
    attachments,
    embeds: [],
    pinned: false,
    editedAt: null,
    mentions,
    reactions: [],
    threadRootId: null,
    threadSummary: null,
  }
}
