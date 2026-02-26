import { z } from "@hono/zod-openapi"
import { guildSlugParamsSchema } from "@/routes/v1/channels/schema"

export { guildSlugParamsSchema }

export const guildMemberPresenceSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  image: z.string().nullable(),
  role: z.string(),
  status: z.enum(["online", "offline"]),
})

export const listGuildMembersResponseSchema = z.object({
  guildId: z.string().uuid(),
  guildSlug: z.string(),
  guildName: z.string(),
  members: z.array(guildMemberPresenceSchema),
})
