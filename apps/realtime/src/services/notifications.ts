import { db, eq, schema } from "@repo/db"
import type {
  MentionNotification,
  RealtimeMessage,
  UnreadNotification,
} from "@/lib/events"
import type { AccessibleChannel } from "./channel-access"

type MessageFanoutInput = {
  authorId: string
  channel: AccessibleChannel
  message: RealtimeMessage
}

type UserTargetedPayload<T> = {
  userId: string
  payload: T
}

type MentionInsertType =
  (typeof schema.messageMention.$inferInsert)["mentionType"]
type NotificationInsertType = Extract<
  (typeof schema.notificationEvent.$inferInsert)["type"],
  "direct_mention" | "everyone_mention"
>

const USER_MENTION_REGEX =
  /<@([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>/gi
const EVERYONE_MENTION_REGEX = /(^|\s)@everyone\b/i

function extractDirectMentionUserIds(content: string) {
  const userIds = new Set<string>()

  for (const match of content.matchAll(USER_MENTION_REGEX)) {
    const userId = match[1]
    if (userId) {
      userIds.add(userId)
    }
  }

  return userIds
}

async function listRecipientUserIds(channel: AccessibleChannel) {
  if (channel.guildId) {
    return db
      .select({
        userId: schema.guildMember.userId,
      })
      .from(schema.guildMember)
      .where(eq(schema.guildMember.guildId, channel.guildId))
      .then((rows) => rows.map((row) => row.userId))
  }

  return db
    .select({
      userId: schema.channelMember.userId,
    })
    .from(schema.channelMember)
    .where(eq(schema.channelMember.channelId, channel.id))
    .then((rows) => rows.map((row) => row.userId))
}

function buildMentionTargets(args: {
  channel: AccessibleChannel
  recipients: string[]
  messageContent: string
}) {
  const directMentionedUserIds = extractDirectMentionUserIds(
    args.messageContent
  )
  const includeEveryoneMention =
    Boolean(args.channel.guildId) &&
    EVERYONE_MENTION_REGEX.test(args.messageContent)

  const mentionTypeByUserId = new Map<string, MentionInsertType>()
  const recipientSet = new Set(args.recipients)

  for (const userId of directMentionedUserIds) {
    if (recipientSet.has(userId)) {
      mentionTypeByUserId.set(userId, "direct")
    }
  }

  if (includeEveryoneMention) {
    for (const userId of args.recipients) {
      if (!mentionTypeByUserId.has(userId)) {
        mentionTypeByUserId.set(userId, "everyone")
      }
    }
  }

  return mentionTypeByUserId
}

function toNotificationType(
  mentionType: MentionInsertType
): NotificationInsertType {
  return mentionType === "direct" ? "direct_mention" : "everyone_mention"
}

export async function buildMessageFanout(input: MessageFanoutInput) {
  const allRecipientIds = await listRecipientUserIds(input.channel)
  const recipientIds = [...new Set(allRecipientIds)].filter(
    (id) => id !== input.authorId
  )

  const unreadNotifications: Array<UserTargetedPayload<UnreadNotification>> =
    recipientIds.map((userId) => ({
      userId,
      payload: {
        channelId: input.channel.id,
        guildId: input.channel.guildId,
        messageId: input.message.id,
        unreadCountDelta: 1,
      },
    }))

  const mentionTypeByUserId = buildMentionTargets({
    channel: input.channel,
    recipients: recipientIds,
    messageContent: input.message.content ?? "",
  })

  if (mentionTypeByUserId.size === 0) {
    return {
      unreadNotifications,
      mentionNotifications: [] as Array<
        UserTargetedPayload<MentionNotification>
      >,
    }
  }

  const mentionRows = Array.from(mentionTypeByUserId.entries()).map(
    ([userId, mentionType]) => ({
      messageId: input.message.id,
      channelId: input.channel.id,
      mentionedUserId: userId,
      mentionType,
    })
  )

  await db
    .insert(schema.messageMention)
    .values(mentionRows)
    .onConflictDoNothing()

  const notificationRows = Array.from(mentionTypeByUserId.entries()).map(
    ([userId, mentionType]) => ({
      userId,
      guildId: input.channel.guildId,
      channelId: input.channel.id,
      messageId: input.message.id,
      type: toNotificationType(mentionType),
    })
  )

  const insertedNotifications = await db
    .insert(schema.notificationEvent)
    .values(notificationRows)
    .onConflictDoNothing()
    .returning({
      id: schema.notificationEvent.id,
      userId: schema.notificationEvent.userId,
      type: schema.notificationEvent.type,
      messageId: schema.notificationEvent.messageId,
      channelId: schema.notificationEvent.channelId,
      guildId: schema.notificationEvent.guildId,
      createdAt: schema.notificationEvent.createdAt,
    })

  const mentionNotifications: Array<UserTargetedPayload<MentionNotification>> =
    insertedNotifications.map((notification) => ({
      userId: notification.userId,
      payload: {
        id: notification.id,
        type: notification.type as MentionNotification["type"],
        messageId: notification.messageId ?? input.message.id,
        channelId: notification.channelId ?? input.channel.id,
        guildId: notification.guildId ?? input.channel.guildId,
        createdAt: notification.createdAt.toISOString(),
      },
    }))

  return {
    unreadNotifications,
    mentionNotifications,
  }
}
