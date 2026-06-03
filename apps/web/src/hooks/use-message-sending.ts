import type { RealtimeMessageEmbedsUpdated } from "@repo/realtime-types"
import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"
import type { Message } from "@/lib/api-types"
import { updateMessagesAcrossPages } from "@/lib/message-cache-utils"
import {
  createOptimisticMessage,
  realtimeMessageToMessage,
} from "@/lib/realtime-adapter"
import type { AppSocket } from "@/lib/socket"

type MessageWithRealtimeShape = ReturnType<typeof realtimeMessageToMessage>

interface MessagePage {
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

export function useMessageSending({
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
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return updateMessagesAcrossPages(old, updater)
        }
      )
    },
    [queryClient, channelId]
  )

  const prependToFirstPage = useCallback(
    (message: MessageWithRealtimeShape) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        ["messages", channelId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0 ? { ...page, data: [message, ...page.data] } : page
            ),
          }
        }
      )
    },
    [queryClient, channelId]
  )

  // Own-nonce reconciliation only; live messages from others live in useChannelMessages.
  useEffect(() => {
    if (!socket) return

    const handleMessageCreated = (
      message: Parameters<typeof realtimeMessageToMessage>[0]
    ) => {
      if (message.channelId !== channelId) return
      if (!message.nonce || !pendingNonces.current.has(message.nonce)) return

      pendingNonces.current.delete(message.nonce)
      updateMessagesInCache((messages) =>
        messages.map((m) =>
          m.id === message.nonce ? realtimeMessageToMessage(message) : m
        )
      )
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
        attachments?: Message["attachments"]
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

      prependToFirstPage(
        createOptimisticMessage(
          nonce,
          channelId,
          content || null,
          author,
          options?.mentions ?? [],
          options?.referencedMessage ?? undefined,
          options?.attachments ?? []
        )
      )

      const referencedMessageId = options?.referencedMessage?.id
      const attachments = options?.attachments ?? undefined
      socket.emit(
        "message:send",
        {
          channelId,
          content: content || undefined,
          nonce,
          referencedMessageId,
          attachments,
        },
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
    [socket, currentUser, channelId, prependToFirstPage, updateMessagesInCache]
  )

  return { handleSend, pendingNonces }
}
