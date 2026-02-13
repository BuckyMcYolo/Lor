import { z } from "zod"

/** 20 MB default — keep in sync with server.ts */
const DEFAULT_MAX_FILE_UPLOAD_SIZE = 20 * 1024 * 1024

const addProtocol = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1).transform(addProtocol),
  NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE: z.coerce
    .number()
    .default(DEFAULT_MAX_FILE_UPLOAD_SIZE),
})

export const env = clientSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE:
    process.env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE,
})
