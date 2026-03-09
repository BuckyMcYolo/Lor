import { z } from "@hono/zod-openapi"

export const ALLOWED_MIME_TYPES = [
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
] as const

export const MAX_ATTACHMENTS_PER_MESSAGE = 10
export const PRESIGNED_URL_EXPIRY_SECONDS = 300

export const presignRequestSchema = z.object({
  channelId: z.string().uuid(),
  filename: z.string().min(1).max(256),
  contentType: z
    .string()
    .refine((ct) => (ALLOWED_MIME_TYPES as readonly string[]).includes(ct), {
      message: "Unsupported file type",
    }),
  size: z.number().int().min(1),
})

export const presignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileUrl: z.string().url(),
  key: z.string(),
})
