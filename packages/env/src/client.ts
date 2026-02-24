import { z } from "zod"

/** 20 MB default — keep in sync with server.ts */
const DEFAULT_MAX_FILE_UPLOAD_SIZE = 20 * 1024 * 1024

/** Adds a protocol to a URL if missing. Defaults to http:// for localhost/loopback, https:// otherwise. Preserves ws:// and wss:// schemes. */
const addProtocol = (url: string) => {
  const trimmed = url.trim()
  if (/^(https?|wss?):\/\//i.test(trimmed)) return trimmed
  const isLocal =
    trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")
  return isLocal ? `http://${trimmed}` : `https://${trimmed}`
}

const clientSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("production"),
  NEXT_PUBLIC_API_URL: z.string().min(1).transform(addProtocol),
  NEXT_PUBLIC_REALTIME_URL: z.string().min(1).transform(addProtocol),
  NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE: z.coerce
    .number()
    .default(DEFAULT_MAX_FILE_UPLOAD_SIZE),
})

export const env = clientSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
  NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE:
    process.env.NEXT_PUBLIC_MAX_FILE_UPLOAD_SIZE,
})
