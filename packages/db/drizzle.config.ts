import { env } from "@repo/env/server"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/schemas",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
