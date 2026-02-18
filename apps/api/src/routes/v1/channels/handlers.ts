import { db } from "@repo/db"
import { channel } from "@repo/db/schema"
import { and, asc, eq, inArray } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  CreateChannelRoute,
  ListChannelsRoute,
  ReorderChannelsRoute,
} from "./routes"

export const listChannels: AppRouteHandler<ListChannelsRoute> = async (c) => {
  const guild = c.var.guild

  const channels = await db
    .select()
    .from(channel)
    .where(eq(channel.guildId, guild.id))
    .orderBy(asc(channel.position))

  const categoryMap = new Map<string, typeof channels>()
  const categories: typeof channels = []
  const uncategorized: typeof channels = []

  for (const ch of channels) {
    if (ch.type === "category") {
      categories.push(ch)
      categoryMap.set(ch.id, [])
    }
  }

  for (const ch of channels) {
    if (ch.type === "category") continue
    const parent = ch.parentId ? categoryMap.get(ch.parentId) : undefined
    if (parent) {
      parent.push(ch)
    } else {
      uncategorized.push(ch)
    }
  }

  return c.json(
    {
      success: true,
      data: {
        uncategorized,
        categories: categories.map((cat) => ({
          ...cat,
          channels: categoryMap.get(cat.id) ?? [],
        })),
      },
    },
    HttpStatusCodes.OK
  )
}

export const createChannel: AppRouteHandler<CreateChannelRoute> = async (c) => {
  const guild = c.var.guild
  const body = c.req.valid("json")

  const newChannel = await db
    .insert(channel)
    .values({
      ...body,
      guildId: guild.id,
    })
    .returning()
    .then((rows) => rows[0])

  if (!newChannel) {
    return c.json(
      { success: false, message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json({ success: true, data: newChannel }, HttpStatusCodes.CREATED)
}

export const reorderChannels: AppRouteHandler<ReorderChannelsRoute> = async (
  c
) => {
  const guild = c.var.guild
  const { channels: updates } = c.req.valid("json")

  const channelIds = updates.map((u) => u.id)
  const uniqueChannelIds = [...new Set(channelIds)]

  // Verify all channels belong to this guild
  const existing = await db
    .select({ id: channel.id })
    .from(channel)
    .where(
      and(eq(channel.guildId, guild.id), inArray(channel.id, uniqueChannelIds))
    )

  if (existing.length !== uniqueChannelIds.length) {
    return c.json(
      { success: false, message: "One or more channels not found in guild" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  await db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .update(channel)
        .set({ position: update.position, parentId: update.parentId })
        .where(and(eq(channel.id, update.id), eq(channel.guildId, guild.id)))
    }
  })

  return c.json({ success: true }, HttpStatusCodes.OK)
}
