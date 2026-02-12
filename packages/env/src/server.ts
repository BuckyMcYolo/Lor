import { resolve } from "node:path"
import { config as dotenvConfig } from "dotenv"
import { z } from "zod"

// In development, load .env files. In production, env vars are set by the platform.
if (process.env.NODE_ENV !== "production") {
  dotenvConfig({ path: resolve(process.cwd(), ".env") })
  dotenvConfig({ path: resolve(process.cwd(), "../../.env") })
}

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(8080),
  BETTER_AUTH_SECRET: z.string().min(1),
})

export const env = serverSchema.parse(process.env)
