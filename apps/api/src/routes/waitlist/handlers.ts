import { db } from "@repo/db"
import { waitlist } from "@repo/db/schema"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type { CreateWaitlistEntryRoute } from "./routes"

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const createWaitlistEntry: AppRouteHandler<
  CreateWaitlistEntryRoute
> = async (c) => {
  const body = c.req.valid("json")
  const email = body.email.trim().toLowerCase()

  if (!emailRegex.test(email)) {
    return c.json({ error: "A valid email is required" }, 400)
  }

  try {
    await db.insert(waitlist).values({ email })
    return c.json({ success: true }, 200)
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return c.json({ error: "This email is already on the waitlist" }, 409)
    }
    throw err
  }
}
