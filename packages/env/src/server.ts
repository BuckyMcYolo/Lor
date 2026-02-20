import { resolve } from "node:path"
import { config as dotenvConfig } from "dotenv"
import { z } from "zod"

// In development, load .env files. In production, env vars are set by the platform.
if (process.env.NODE_ENV !== "production") {
  dotenvConfig({ path: resolve(process.cwd(), ".env") })
  dotenvConfig({ path: resolve(process.cwd(), "../../.env") })
}

/** Adds a protocol to a URL if missing. Defaults to http:// for localhost/loopback, https:// otherwise. */
const addProtocol = (url: string) => {
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed
  const isLocal =
    trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")
  return isLocal ? `http://${trimmed}` : `https://${trimmed}`
}

/** 20 MB default — keep in sync with client.ts */
const DEFAULT_MAX_FILE_UPLOAD_SIZE = 20 * 1024 * 1024
const DEFAULT_REALTIME_CORS_ORIGIN =
  "http://localhost:3000,http://localhost:3001"

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("production"),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  REALTIME_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  REALTIME_CORS_ORIGIN: z.string().default(DEFAULT_REALTIME_CORS_ORIGIN),
  BETTER_AUTH_SECRET: z.string().min(1),
  SELF_HOSTED: z.coerce.boolean().default(true),
  MAX_FILE_UPLOAD_SIZE: z.coerce.number().default(DEFAULT_MAX_FILE_UPLOAD_SIZE),
  NEXT_PUBLIC_API_URL: z.string().min(1).transform(addProtocol),
})

export const env = serverSchema.parse(process.env)
