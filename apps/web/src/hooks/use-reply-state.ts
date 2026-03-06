import { useCallback, useState } from "react"
import type { Message } from "@/lib/api-types"

export function useReplyState() {
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  const clearReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  return { replyingTo, setReplyingTo, clearReply }
}
