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
  "http://localhost:3000,http://localhost:3001,tauri://localhost"

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("production"),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  REALTIME_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  REALTIME_CORS_ORIGIN: z.string().default(DEFAULT_REALTIME_CORS_ORIGIN),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  // Embedding provider (OpenAI-compatible). Self-hosters can point the base URL
  // at any compatible endpoint (Ollama, LocalAI, …); the model MUST output
  // 1536-dim vectors to match the brain_node.embedding column.
  OPENAI_API_KEY: z.string().min(1),
  MERLIN_EMBED_MODEL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().default("text-embedding-3-small")
  ),
  MERLIN_EMBED_BASE_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional()
  ),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),
  // GitHub App identity for installation-authed REST (fetch_source). Optional:
  // fetch_source falls back to the stored summary when unset.
  GITHUB_APP_ID: z.string().min(1).optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1).optional(),
  // The GitHub App's public slug (github.com/apps/<slug>), for the install link.
  GITHUB_APP_SLUG: z.string().min(1).optional(),
  NEXT_PUBLIC_SELF_HOSTED: z
    .preprocess((v) => v === "true" || v === "1", z.boolean())
    .default(false),
  MAX_FILE_UPLOAD_SIZE: z.coerce.number().default(DEFAULT_MAX_FILE_UPLOAD_SIZE),
  NEXT_PUBLIC_API_URL: z.string().min(1).transform(addProtocol),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_REGION: z.string().default("auto"),
  S3_PUBLIC_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().default("Lor <noreply@team.lor.chat>"),
  TRUSTED_ORIGINS: z.string().default(""),
  COOKIE_DOMAIN: z.string().default(""),
})

export const env = serverSchema.parse(process.env)
