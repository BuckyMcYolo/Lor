import { z } from "zod"

export const channelRoomPayloadSchema = z.object({
  channelId: z.string().uuid(),
})

export const sendMessagePayloadSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  nonce: z.string().max(100).optional(),
})

export type ChannelRoomPayload = z.infer<typeof channelRoomPayloadSchema>
export type SendMessagePayload = z.infer<typeof sendMessagePayloadSchema>

type OkResult = { ok: true }
type ErrorResult = { ok: false; error: string }

export type JoinLeaveAck = (result: OkResult | ErrorResult) => void

export type RealtimeMessage = {
  id: string
  channelId: string
  content: string | null
  type: string
  createdAt: string
  author: {
    id: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
  }
  nonce?: string
}

export type SendMessageAck = (
  result: { ok: true; message: RealtimeMessage } | ErrorResult
) => void

export interface ClientToServerEvents {
  "channel:join": (payload: ChannelRoomPayload, ack?: JoinLeaveAck) => void
  "channel:leave": (payload: ChannelRoomPayload, ack?: JoinLeaveAck) => void
  "message:send": (payload: SendMessagePayload, ack?: SendMessageAck) => void
}

export interface ServerToClientEvents {
  "presence:ready": (payload: { userId: string }) => void
  "message:created": (payload: RealtimeMessage) => void
}

export type InterServerEvents = Record<string, never>
