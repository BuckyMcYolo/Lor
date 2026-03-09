import { env } from "@repo/env/client"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import type { Message } from "@/lib/api-types"

const MAX_ATTACHMENTS = 10

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-tar",
])

export type PendingAttachment = {
  id: string
  file: File
  filename: string
  contentType: string
  size: number
  width?: number
  height?: number
  status: "uploading" | "done" | "error"
  previewUrl?: string
  url?: string
}

async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    bitmap.close()
    return { width, height }
  } catch {
    return null
  }
}

async function uploadFile(
  channelId: string,
  attachment: PendingAttachment
): Promise<{ url: string } | null> {
  const presignRes = await apiClient.v1.uploads.presign.$post({
    json: {
      channelId,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
    },
  })

  if (!presignRes.ok) return null

  const { uploadUrl, fileUrl } = await presignRes.json()

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: attachment.file,
    headers: {
      "Content-Type": attachment.contentType,
    },
  })

  if (!uploadRes.ok) return null

  return { url: fileUrl }
}

export function useFileUpload(channelId: string) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])

  const addFiles = useCallback(
    async (files: File[]) => {
      // Validate files first (before touching state)
      const maxSize = env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE
      const maxMB = Math.round(maxSize / 1024 / 1024)
      const validated: File[] = []
      for (const f of files) {
        if (!ALLOWED_MIME_TYPES.has(f.type)) {
          toast.error("Unsupported file type", { description: f.name })
        } else if (f.size > maxSize) {
          toast.error(`File exceeds ${maxMB}MB limit`, { description: f.name })
        } else {
          validated.push(f)
        }
      }

      if (validated.length === 0) return

      // Build PendingAttachment objects for validated files
      const prepared: PendingAttachment[] = await Promise.all(
        validated.map(async (file) => {
          const dims = await getImageDimensions(file)
          const previewUrl = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined
          return {
            id: crypto.randomUUID(),
            file,
            filename: file.name,
            contentType: file.type,
            size: file.size,
            width: dims?.width,
            height: dims?.height,
            status: "uploading" as const,
            previewUrl,
          }
        })
      )

      // Atomically check remaining slots and append
      let accepted: PendingAttachment[] = []
      setAttachments((prev) => {
        const remaining = MAX_ATTACHMENTS - prev.length
        accepted = prepared.slice(0, remaining)
        if (prepared.length > remaining) {
          toast.error(
            `You can only attach up to ${MAX_ATTACHMENTS} files per message`
          )
        }
        if (accepted.length === 0) return prev
        return [...prev, ...accepted]
      })

      if (accepted.length === 0) return

      // Upload each file immediately in parallel
      await Promise.all(
        accepted.map(async (attachment) => {
          try {
            const result = await uploadFile(channelId, attachment)
            if (result) {
              setAttachments((prev) =>
                prev.map((a) =>
                  a.id === attachment.id
                    ? { ...a, status: "done" as const, url: result.url }
                    : a
                )
              )
            } else {
              setAttachments((prev) =>
                prev.map((a) =>
                  a.id === attachment.id
                    ? { ...a, status: "error" as const }
                    : a
                )
              )
            }
          } catch {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === attachment.id ? { ...a, status: "error" as const } : a
              )
            )
          }
        })
      )
    },
    [channelId]
  )

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      for (const a of prev) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
      }
      return []
    })
  }, [])

  const getUploadedAttachments = useCallback((): NonNullable<
    Message["attachments"]
  > => {
    return attachments
      .filter(
        (a): a is PendingAttachment & { url: string } =>
          a.status === "done" && !!a.url
      )
      .map((a) => ({
        url: a.url,
        filename: a.filename,
        size: a.size,
        contentType: a.contentType,
        width: a.width,
        height: a.height,
      }))
  }, [attachments])

  const isUploading = attachments.some((a) => a.status === "uploading")
  const hasError = attachments.some((a) => a.status === "error")

  return {
    attachments,
    addFiles,
    removeAttachment,
    clearAttachments,
    getUploadedAttachments,
    isUploading,
    hasError,
  }
}
