import type { RealtimeMessageEmbedsUpdated } from "@repo/realtime-types"
import type { QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"
import type { Message } from "@/lib/api-types"
import {
  createOptimisticMessage,
  realtimeMessageToMessage,
} from "@/lib/realtime-adapter"
import type { AppSocket } from "@/lib/socket"

type MessageWithRealtimeShape = ReturnType<typeof realtimeMessageToMessage>

interface MessagesQueryData {
  data: MessageWithRealtimeShape[]
}

interface MessageSenderUser {
  id: string
  name: string
  username?: string | null
  displayUsername?: string | null
  image?: string | null
}

interface UseMessageSendingOptions {
  socket: AppSocket | null
  queryClient: QueryClient
  channelId: string
  currentUser?: MessageSenderUser
}

export function useMessageSending<TData extends MessagesQueryData>({
  socket,
  queryClient,
  channelId,
  currentUser,
}: UseMessageSendingOptions) {
  const pendingNonces = useRef(new Set<string>())

  const updateMessagesInCache = useCallback(
    (
      updater: (
        messages: MessageWithRealtimeShape[]
      ) => MessageWithRealtimeShape[]
    ) => {
      queryClient.setQueryData<TData>(["messages", channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          data: updater(old.data),
        }
      })
    },
    [queryClient, channelId]
  )

  useEffect(() => {
    if (!socket) return

    const handleMessageCreated = (
      message: Parameters<typeof realtimeMessageToMessage>[0]
    ) => {
      if (message.channelId !== channelId) return

      updateMessagesInCache((messages) => {
        if (message.nonce && pendingNonces.current.has(message.nonce)) {
          pendingNonces.current.delete(message.nonce)
          return messages.map((m) =>
            m.id === message.nonce ? realtimeMessageToMessage(message) : m
          )
        }

        if (messages.some((m) => m.id === message.id)) {
          return messages
        }

        return [realtimeMessageToMessage(message), ...messages]
      })
    }

    socket.on("message:created", handleMessageCreated)
    return () => {
      socket.off("message:created", handleMessageCreated)
    }
  }, [socket, channelId, updateMessagesInCache])

  useEffect(() => {
    if (!socket) return

    const handleEmbedsUpdated = (update: RealtimeMessageEmbedsUpdated) => {
      if (update.channelId !== channelId) return

      updateMessagesInCache((messages) =>
        messages.map((m) =>
          m.id === update.messageId ? { ...m, embeds: update.embeds } : m
        )
      )
    }

    socket.on("message:embeds:updated", handleEmbedsUpdated)
    return () => {
      socket.off("message:embeds:updated", handleEmbedsUpdated)
    }
  }, [socket, channelId, updateMessagesInCache])

  const handleSend = useCallback(
    (
      content: string,
      options?: {
        mentions: Message["mentions"]
        referencedMessage?: Message["referencedMessage"]
      }
    ) => {
      if (!socket?.connected || !currentUser) return

      const nonce = crypto.randomUUID()
      pendingNonces.current.add(nonce)

      const author = {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username ?? null,
        displayUsername: currentUser.displayUsername ?? null,
        image: currentUser.image ?? null,
      }

      updateMessagesInCache((messages) => [
        createOptimisticMessage(
          nonce,
          channelId,
          content,
          author,
          options?.mentions ?? [],
          options?.referencedMessage ?? undefined
        ),
        ...messages,
      ])

      const referencedMessageId = options?.referencedMessage?.id
      socket.emit(
        "message:send",
        { channelId, content, nonce, referencedMessageId },
        (result) => {
          if (!result.ok) {
            console.error("[chat] send failed:", result.error)
            pendingNonces.current.delete(nonce)
            updateMessagesInCache((messages) =>
              messages.filter((message) => message.id !== nonce)
            )
            return
          }

          pendingNonces.current.delete(nonce)
          updateMessagesInCache((messages) =>
            messages.map((message) =>
              message.id === nonce
                ? realtimeMessageToMessage(result.message)
                : message
            )
          )
        }
      )
    },
    [socket, currentUser, channelId, updateMessagesInCache]
  )

  return { handleSend }
}
