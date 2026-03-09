import { z } from "@hono/zod-openapi"
import {
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@repo/realtime-types/uploads"

export { ALLOWED_MIME_TYPES, MAX_ATTACHMENTS_PER_MESSAGE }
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

const AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const

export const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2 MB

export const avatarPresignRequestSchema = z.object({
  filename: z.string().min(1).max(256),
  contentType: z
    .string()
    .refine((ct) => (AVATAR_MIME_TYPES as readonly string[]).includes(ct), {
      message: "Unsupported image type",
    }),
  size: z.number().int().min(1).max(MAX_AVATAR_SIZE),
})

export const avatarPresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileUrl: z.string().url(),
})
