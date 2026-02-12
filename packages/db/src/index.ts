import * as schema from "@db/schemas/index"
import { env } from "@repo/env/server"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const client = postgres(env.DATABASE_URL)
export const db = drizzle(client, { schema })

export { schema }
