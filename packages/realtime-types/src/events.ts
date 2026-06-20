import { z } from "zod"

export type PresenceStatus = "online" | "offline" | "idle" | "dnd"
export const PRESENCE_ONLINE_USERS_SET_KEY = "presence:online-users"

export const presenceSubscribePayloadSchema = z.object({
  workspaceId: z.string().uuid(),
})

export const channelRoomPayloadSchema = z.object({
  channelId: z.string().uuid(),
})

export const threadRoomPayloadSchema = z.object({
  threadRootId: z.string().uuid(),
})

export const attachmentPayloadSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1).max(256),
  size: z.number().int().min(1),
  contentType: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export const sendMessagePayloadSchema = z
  .object({
    channelId: z.string().uuid(),
    content: z.string().trim().max(2000).optional(),
    nonce: z.string().max(100).optional(),
    referencedMessageId: z.string().uuid().optional(),
    threadRootId: z.string().uuid().optional(),
    attachments: z.array(attachmentPayloadSchema).max(10).optional(),
  })
  .refine(
    (data) =>
      (data.content && data.content.length > 0) ||
      (data.attachments && data.attachments.length > 0),
    { message: "Message must have content or at least one attachment" }
  )

export const toggleMessageReactionPayloadSchema = z.object({
  channelId: z.string().uuid(),
  messageId: z.string().uuid(),
  emoji: z.string().trim().min(1).max(64),
})

export const deleteMessagePayloadSchema = z.object({
  channelId: z.string().uuid(),
  messageId: z.string().uuid(),
})

export const editMessagePayloadSchema = z.object({
  channelId: z.string().uuid(),
  messageId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
})

export const markChannelReadPayloadSchema = z.object({
  channelId: z.string().uuid(),
  lastReadMessageId: z.string().uuid().optional(),
})

export type ChannelRoomPayload = z.infer<typeof channelRoomPayloadSchema>
export type ThreadRoomPayload = z.infer<typeof threadRoomPayloadSchema>
export type SendMessagePayload = z.infer<typeof sendMessagePayloadSchema>
export type ToggleMessageReactionPayload = z.infer<
  typeof toggleMessageReactionPayloadSchema
>
export type DeleteMessagePayload = z.infer<typeof deleteMessagePayloadSchema>
export type EditMessagePayload = z.infer<typeof editMessagePayloadSchema>
export type MarkChannelReadPayload = z.infer<
  typeof markChannelReadPayloadSchema
>
export type PresenceSubscribePayload = z.infer<
  typeof presenceSubscribePayloadSchema
>

type OkResult = { ok: true }
type ErrorResult = { ok: false; error: string }

export type JoinLeaveAck = (result: OkResult | ErrorResult) => void

export type RealtimeMessageType =
  | "default"
  | "reply"
  | "system_join"
  | "system_leave"
  | "system_pin"
  | "channel_name_change"

export type RealtimeAuthor = {
  id: string
  name: string
  username: string | null
  displayUsername: string | null
  image: string | null
}

export type RealtimeMessageMention = RealtimeAuthor

export type RealtimeMessageReaction = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
  reactors: Array<{ id: string; name: string }>
}

export type RealtimeAttachment = {
  url: string
  filename: string
  size: number
  contentType: string
  width?: number
  height?: number
}

export type RealtimeEmbed = {
  type: "link" | "image" | "video" | "rich"
  url: string
  title?: string
  description?: string
  thumbnail?: string
  siteName?: string
}

export type RealtimeReferencedMessage = {
  id: string
  content: string | null
  author: RealtimeAuthor
}

export type RealtimeMessage = {
  id: string
  channelId: string
  // message:send currently emits non-null content; null is reserved for
  // system/attachment-only message shapes from persisted history.
  content: string | null
  type: RealtimeMessageType
  pinned: boolean
  createdAt: string
  author: RealtimeAuthor
  mentions: RealtimeMessageMention[]
  reactions: RealtimeMessageReaction[]
  attachments: RealtimeAttachment[]
  embeds: RealtimeEmbed[]
  referencedMessage: RealtimeReferencedMessage | null
  threadRootId?: string | null
  editedAt?: string
  nonce?: string
}

export type RealtimeMessagePinToggled = {
  channelId: string
  messageId: string
  pinned: boolean
}

export type RealtimeMessageEmbedsUpdated = {
  channelId: string
  messageId: string
  embeds: RealtimeEmbed[]
}

export type RealtimeMessageReactionUpdated = {
  channelId: string
  messageId: string
  emoji: string
  count: number
  actorUserId: string
  actorName: string
  reactedByActor: boolean
}

// Lightweight update for the channel-feed footer when a thread gets a reply.
// Carries enough for the receiver to refresh the root's threadSummary without
// re-fetching the channel feed. `replyCount: 0` + `lastReplyAt: null` signals
// the thread is now empty (last reply deleted) so the footer can be cleared.
export type RealtimeMessageThreadUpdated = {
  channelId: string
  threadRootId: string
  replyCount: number
  lastReplyAt: string | null
  participants: Array<{
    id: string
    name: string
    displayUsername: string | null
    image: string | null
  }>
}

export type SendMessageAck = (
  result: { ok: true; message: RealtimeMessage } | ErrorResult
) => void

export type DeleteMessageAck = (result: OkResult | ErrorResult) => void
export type EditMessageAck = (result: OkResult | ErrorResult) => void

export type ToggleMessageReactionAck = (
  result: { ok: true; update: RealtimeMessageReactionUpdated } | ErrorResult
) => void

export type ChannelReadState = {
  channelId: string
  lastReadMessageId: string | null
  lastReadAt: string
  unreadCount: number
  mentionCount: number
}

export type MarkChannelReadAck = (
  result: { ok: true; state: ChannelReadState } | ErrorResult
) => void

export type PresenceSnapshot = {
  workspaceId: string
  onlineUserIds: string[]
}

export type PresenceSubscribeAck = (
  result: { ok: true; snapshot: PresenceSnapshot } | ErrorResult
) => void

export type PresenceUserUpdate = {
  workspaceId: string
  userId: string
  status: PresenceStatus
}

export type UnreadNotification = {
  channelId: string
  workspaceId: string | null
  messageId: string
  unreadCountDelta: number
  authorName: string
  contentPreview: string | null
  channelName: string | null
}

export type MentionNotification = {
  id: string
  type: "direct_mention" | "everyone_mention"
  messageId: string
  channelId: string
  workspaceId: string | null
  createdAt: string
}

export type NotificationBootstrap = {
  readStates: Array<{
    channelId: string
    unreadCount: number
    mentionCount: number
    lastReadMessageId: string | null
  }>
}

export const workspaceMemberJoinedPayloadSchema = z.object({
  workspaceId: z.string().uuid(),
})

export type WorkspaceMemberJoinedPayload = z.infer<
  typeof workspaceMemberJoinedPayloadSchema
>

export type WorkspaceMemberJoinedEvent = {
  workspaceId: string
  userId: string
  name: string
  username: string | null
  image: string | null
}

export type WorkspaceMemberJoinedAck = (result: OkResult | ErrorResult) => void

export const typingStartPayloadSchema = z.object({
  channelId: z.string().uuid(),
})

export type TypingStartPayload = z.infer<typeof typingStartPayloadSchema>

export type TypingIndicatorEvent = {
  channelId: string
  userId: string
  name: string
}

export interface ClientToServerEvents {
  "presence:subscribe": (
    payload: PresenceSubscribePayload,
    ack?: PresenceSubscribeAck
  ) => void
  "channel:join": (payload: ChannelRoomPayload, ack?: JoinLeaveAck) => void
  "channel:leave": (payload: ChannelRoomPayload, ack?: JoinLeaveAck) => void
  "thread:join": (payload: ThreadRoomPayload, ack?: JoinLeaveAck) => void
  "thread:leave": (payload: ThreadRoomPayload, ack?: JoinLeaveAck) => void
  "message:send": (payload: SendMessagePayload, ack?: SendMessageAck) => void
  "message:delete": (
    payload: DeleteMessagePayload,
    ack?: DeleteMessageAck
  ) => void
  "message:edit": (payload: EditMessagePayload, ack?: EditMessageAck) => void
  "message:reaction:toggle": (
    payload: ToggleMessageReactionPayload,
    ack?: ToggleMessageReactionAck
  ) => void
  "channel:mark-read": (
    payload: MarkChannelReadPayload,
    ack?: MarkChannelReadAck
  ) => void
  "workspace:member:joined": (
    payload: WorkspaceMemberJoinedPayload,
    ack?: WorkspaceMemberJoinedAck
  ) => void
  "typing:start": (payload: TypingStartPayload) => void
}

export interface ServerToClientEvents {
  "presence:ready": (payload: {
    userId: string
    rooms: {
      user: string
      workspaces: string[]
    }
  }) => void
  "presence:user:update": (payload: PresenceUserUpdate) => void
  "message:created": (payload: RealtimeMessage) => void
  "message:deleted": (payload: { channelId: string; messageId: string }) => void
  "message:updated": (payload: {
    channelId: string
    messageId: string
    content: string
    editedAt: string
  }) => void
  "message:reaction:updated": (payload: RealtimeMessageReactionUpdated) => void
  "message:embeds:updated": (payload: RealtimeMessageEmbedsUpdated) => void
  // Merlin streaming its reply into an existing (placeholder) message.
  // delta = new text chunk; done = final chunk (content now persisted in DB).
  // threadRootId is set when Merlin's reply lives in a thread (else null), so
  // the client patches the right message cache.
  "message:stream": (payload: {
    channelId: string
    threadRootId: string | null
    messageId: string
    delta: string
    done: boolean
  }) => void
  // Merlin saved/updated a brain page during write-back (messageId = its reply).
  "merlin:memory": (payload: {
    channelId: string
    threadRootId: string | null
    messageId: string
    path: string
    action: "created" | "updated"
  }) => void
  "message:pin:toggled": (payload: RealtimeMessagePinToggled) => void
  "message:thread:updated": (payload: RealtimeMessageThreadUpdated) => void
  "notification:bootstrap": (payload: NotificationBootstrap) => void
  "notification:unread": (payload: UnreadNotification) => void
  "notification:mention": (payload: MentionNotification) => void
  "channel:read-state": (payload: ChannelReadState) => void
  "workspace:member:joined": (payload: WorkspaceMemberJoinedEvent) => void
  "typing:update": (payload: TypingIndicatorEvent) => void
}

export type InterServerEvents = Record<string, never>
