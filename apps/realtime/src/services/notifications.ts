import { and, db, eq, inArray, schema } from "@repo/db"
import type {
  MentionNotification,
  RealtimeMessage,
  RealtimeMessageMention,
  UnreadNotification,
} from "@repo/realtime-types"
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
const MARKDOWN_USER_MENTION_REGEX =
  /\[@[^\]]*?\bid="([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"[^\]]*]/gi
const EVERYONE_MENTION_REGEX = /(^|\s)@everyone\b/i
const mentionNotificationTypes = ["direct_mention", "everyone_mention"] as const

function extractDirectMentionUserIds(content: string) {
  const userIds = new Set<string>()

  for (const match of content.matchAll(USER_MENTION_REGEX)) {
    const userId = match[1]
    if (userId) {
      userIds.add(userId)
    }
  }

  for (const match of content.matchAll(MARKDOWN_USER_MENTION_REGEX)) {
    const userId = match[1]
    if (userId) {
      userIds.add(userId)
    }
  }

  return userIds
}

async function listRecipientUserIds(channel: AccessibleChannel) {
  if (channel.workspaceId) {
    return db
      .select({
        userId: schema.workspaceMember.userId,
      })
      .from(schema.workspaceMember)
      .where(eq(schema.workspaceMember.workspaceId, channel.workspaceId))
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
    Boolean(args.channel.workspaceId) &&
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

function isMentionNotificationType(
  type: (typeof schema.notificationEvent.$inferSelect)["type"]
): type is MentionNotification["type"] {
  return (mentionNotificationTypes as readonly string[]).includes(type)
}

export async function buildMessageFanout(input: MessageFanoutInput) {
  const allRecipientIds = await listRecipientUserIds(input.channel)
  const recipientIds = [...new Set(allRecipientIds)].filter(
    (id) => id !== input.authorId
  )

  const contentPreview = input.message.content
    ? input.message.content.length > 100
      ? `${input.message.content.slice(0, 100)}…`
      : input.message.content
    : input.message.attachments.length > 0
      ? `sent ${input.message.attachments.length} attachment${input.message.attachments.length > 1 ? "s" : ""}`
      : null

  const unreadNotifications: Array<UserTargetedPayload<UnreadNotification>> =
    recipientIds.map((userId) => ({
      userId,
      payload: {
        channelId: input.channel.id,
        workspaceId: input.channel.workspaceId,
        messageId: input.message.id,
        unreadCountDelta: 1,
        authorName: input.message.author.name,
        contentPreview,
        channelName: input.channel.name,
      },
    }))

  const mentionTypeByUserId = buildMentionTargets({
    channel: input.channel,
    recipients: recipientIds,
    messageContent: input.message.content ?? "",
  })

  const mentionedUserIds = Array.from(mentionTypeByUserId.entries())
    .filter(([, mentionType]) => mentionType === "direct")
    .map(([userId]) => userId)
  const mentionUsers =
    mentionedUserIds.length > 0
      ? await db
          .select({
            id: schema.user.id,
            name: schema.user.name,
            username: schema.user.username,
            displayUsername: schema.user.displayUsername,
            image: schema.user.image,
          })
          .from(schema.user)
          .where(inArray(schema.user.id, mentionedUserIds))
      : []

  const mentionUserMap = new Map(mentionUsers.map((user) => [user.id, user]))
  const messageMentions: RealtimeMessageMention[] = mentionedUserIds.flatMap(
    (userId) => {
      const mentionUser = mentionUserMap.get(userId)
      if (!mentionUser) return []

      return [
        {
          id: mentionUser.id,
          name: mentionUser.name,
          username: mentionUser.username,
          displayUsername: mentionUser.displayUsername,
          image: mentionUser.image,
        },
      ]
    }
  )

  if (mentionTypeByUserId.size === 0) {
    return {
      unreadNotifications,
      messageMentions,
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
      workspaceId: input.channel.workspaceId,
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
      workspaceId: schema.notificationEvent.workspaceId,
      createdAt: schema.notificationEvent.createdAt,
    })

  const expectedNotificationKey = (row: { userId: string; type: string }) =>
    `${row.userId}:${row.type}`

  const insertedKeys = new Set(
    insertedNotifications.map((row) => expectedNotificationKey(row))
  )
  const missingUserIds = notificationRows
    .filter((row) => !insertedKeys.has(expectedNotificationKey(row)))
    .map((row) => row.userId)

  let allNotifications = insertedNotifications

  if (missingUserIds.length > 0) {
    const existingNotifications = await db
      .select({
        id: schema.notificationEvent.id,
        userId: schema.notificationEvent.userId,
        type: schema.notificationEvent.type,
        messageId: schema.notificationEvent.messageId,
        channelId: schema.notificationEvent.channelId,
        workspaceId: schema.notificationEvent.workspaceId,
        createdAt: schema.notificationEvent.createdAt,
      })
      .from(schema.notificationEvent)
      .where(
        and(
          eq(schema.notificationEvent.messageId, input.message.id),
          inArray(schema.notificationEvent.userId, [
            ...new Set(missingUserIds),
          ]),
          inArray(schema.notificationEvent.type, mentionNotificationTypes)
        )
      )

    const expectedKeys = new Set(
      notificationRows.map((row) => expectedNotificationKey(row))
    )
    const mergedByKey = new Map<
      string,
      (typeof insertedNotifications)[number]
    >()

    for (const notification of insertedNotifications) {
      mergedByKey.set(expectedNotificationKey(notification), notification)
    }

    for (const notification of existingNotifications) {
      const key = expectedNotificationKey(notification)
      if (expectedKeys.has(key) && !mergedByKey.has(key)) {
        mergedByKey.set(key, notification)
      }
    }

    allNotifications = [...mergedByKey.values()]
  }

  const mentionNotifications: Array<UserTargetedPayload<MentionNotification>> =
    allNotifications.flatMap((notification) => {
      if (!isMentionNotificationType(notification.type)) {
        return []
      }

      return [
        {
          userId: notification.userId,
          payload: {
            id: notification.id,
            type: notification.type,
            messageId: notification.messageId ?? input.message.id,
            channelId: notification.channelId ?? input.channel.id,
            workspaceId: notification.workspaceId ?? input.channel.workspaceId,
            createdAt: notification.createdAt.toISOString(),
          },
        },
      ]
    })

  return {
    unreadNotifications,
    messageMentions,
    mentionNotifications,
  }
}
