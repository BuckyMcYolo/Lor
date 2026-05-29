import type {
  MentionNotification,
  UnreadNotification,
} from "@repo/realtime-types"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useSocket } from "@/context/socket-context"
import { apiClient } from "@/lib/api-client"
import { showNotification } from "@/lib/notification-dispatcher"

type NotificationSettings = {
  desktopNotifications: "all_messages" | "mentions_only" | "nothing"
  dmNotifications: "all_messages" | "nothing"
}

/**
 * Fires browser/desktop notifications for incoming messages and mentions
 * based on user's notification preferences.
 * Only fires when the tab is not focused.
 */
export function useBrowserNotifications() {
  const socket = useSocket()
  const { data: settings } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const res = await apiClient.v1["notification-settings"].$get()
      if (!res.ok) throw new Error("Failed to fetch notification settings")
      return res.json() as Promise<NotificationSettings>
    },
  })

  useEffect(() => {
    if (!socket) return

    const onMention = (payload: MentionNotification) => {
      if (document.hasFocus()) return
      if (!settings) return
      if (settings.desktopNotifications === "nothing") return

      // For DM mentions, check dmNotifications setting
      if (
        payload.workspaceId === null &&
        settings.dmNotifications === "nothing"
      ) {
        return
      }

      const mentionType =
        payload.type === "everyone_mention" ? "@everyone" : "a mention"

      showNotification("New Mention", `You received ${mentionType}`, {
        tag: `mention-${payload.messageId}`,
      })
    }

    const onUnread = (payload: UnreadNotification) => {
      if (document.hasFocus()) return
      if (!settings) return
      if (settings.desktopNotifications !== "all_messages") return

      // For DMs, check dmNotifications setting
      if (
        payload.workspaceId === null &&
        settings.dmNotifications === "nothing"
      ) {
        return
      }

      const title = payload.authorName
      const body = payload.contentPreview
        ? payload.channelName
          ? `#${payload.channelName}: ${payload.contentPreview}`
          : payload.contentPreview
        : "Sent an attachment"

      showNotification(title, body, {
        tag: `unread-${payload.channelId}`,
      })
    }

    socket.on("notification:mention", onMention)
    socket.on("notification:unread", onUnread)

    return () => {
      socket.off("notification:mention", onMention)
      socket.off("notification:unread", onUnread)
    }
  }, [socket, settings])
}
