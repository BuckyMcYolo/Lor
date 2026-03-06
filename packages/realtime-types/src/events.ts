import { z } from "zod"

export type PresenceStatus = "online" | "offline" | "idle" | "dnd"
export const PRESENCE_ONLINE_USERS_SET_KEY = "presence:online-users"

export const presenceSubscribePayloadSchema = z.object({
  guildId: z.string().uuid(),
})

export const channelRoomPayloadSchema = z.object({
  channelId: z.string().uuid(),
})

export const sendMessagePayloadSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  nonce: z.string().max(100).optional(),
  referencedMessageId: z.string().uuid().optional(),
})

export const toggleMessageReactionPayloadSchema = z.object({
  channelId: z.string().uuid(),
  messageId: z.string().uuid(),
  emoji: z.string().trim().min(1).max(64),
})

export const markChannelReadPayloadSchema = z.object({
  channelId: z.string().uuid(),
  lastReadMessageId: z.string().uuid().optional(),
})

export type ChannelRoomPayload = z.infer<typeof channelRoomPayloadSchema>
export type SendMessagePayload = z.infer<typeof sendMessagePayloadSchema>
export type ToggleMessageReactionPayload = z.infer<
  typeof toggleMessageReactionPayloadSchema
>
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

export type RealtimeMessageMention = {
  id: string
  name: string
  username: string | null
  displayUsername: string | null
  image: string | null
}

export type RealtimeMessageReaction = {
  emoji: string
  count: number
  reactedByCurrentUser: boolean
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
  author: {
    id: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
  }
}

export type RealtimeMessage = {
  id: string
  channelId: string
  // message:send currently emits non-null content; null is reserved for
  // system/attachment-only message shapes from persisted history.
  content: string | null
  type: RealtimeMessageType
  createdAt: string
  author: {
    id: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
  }
  mentions: RealtimeMessageMention[]
  reactions: RealtimeMessageReaction[]
  embeds: RealtimeEmbed[]
  referencedMessage: RealtimeReferencedMessage | null
  nonce?: string
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
  reactedByActor: boolean
}

export type SendMessageAck = (
  result: { ok: true; message: RealtimeMessage } | ErrorResult
) => void

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
  guildId: string
  onlineUserIds: string[]
}

export type PresenceSubscribeAck = (
  result: { ok: true; snapshot: PresenceSnapshot } | ErrorResult
) => void

export type PresenceUserUpdate = {
  guildId: string
  userId: string
  status: PresenceStatus
}

export type UnreadNotification = {
  channelId: string
  guildId: string | null
  messageId: string
  unreadCountDelta: number
}

export type MentionNotification = {
  id: string
  type: "direct_mention" | "everyone_mention"
  messageId: string
  channelId: string
  guildId: string | null
  createdAt: string
}

export interface ClientToServerEvents {
  "presence:subscribe": (
    payload: PresenceSubscribePayload,
    ack?: PresenceSubscribeAck
  ) => void
  "channel:join": (payload: ChannelRoomPayload, ack?: JoinLeaveAck) => void
  "channel:leave": (payload: ChannelRoomPayload, ack?: JoinLeaveAck) => void
  "message:send": (payload: SendMessagePayload, ack?: SendMessageAck) => void
  "message:reaction:toggle": (
    payload: ToggleMessageReactionPayload,
    ack?: ToggleMessageReactionAck
  ) => void
  "channel:mark-read": (
    payload: MarkChannelReadPayload,
    ack?: MarkChannelReadAck
  ) => void
}

export interface ServerToClientEvents {
  "presence:ready": (payload: {
    userId: string
    rooms: {
      user: string
      guilds: string[]
    }
  }) => void
  "presence:user:update": (payload: PresenceUserUpdate) => void
  "message:created": (payload: RealtimeMessage) => void
  "message:reaction:updated": (payload: RealtimeMessageReactionUpdated) => void
  "message:embeds:updated": (payload: RealtimeMessageEmbedsUpdated) => void
  "notification:unread": (payload: UnreadNotification) => void
  "notification:mention": (payload: MentionNotification) => void
  "channel:read-state": (payload: ChannelReadState) => void
}

export type InterServerEvents = Record<string, never>
