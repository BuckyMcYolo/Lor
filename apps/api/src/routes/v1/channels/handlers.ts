import { db } from "@repo/db"
import { channel } from "@repo/db/schema"
import { and, asc, eq, inArray } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { assertGuildPermission } from "@/lib/permissions"
import { fetchMessagePage } from "@/lib/queries/messages"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  CreateChannelRoute,
  DeleteChannelRoute,
  GetChannelRoute,
  ListChannelMessagesRoute,
  ListChannelsRoute,
  ReorderChannelsRoute,
  UpdateChannelRoute,
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
      uncategorized,
      categories: categories.map((cat) => ({
        ...cat,
        channels: categoryMap.get(cat.id) ?? [],
      })),
    },
    HttpStatusCodes.OK
  )
}

export const createChannel: AppRouteHandler<CreateChannelRoute> = async (c) => {
  const guild = c.var.guild
  const member = c.var.member
  const body = c.req.valid("json")

  assertGuildPermission(member, guild, {
    channel: ["create"],
  })

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

  return c.json(newChannel, HttpStatusCodes.CREATED)
}

export const reorderChannels: AppRouteHandler<ReorderChannelsRoute> = async (
  c
) => {
  const guild = c.var.guild
  const member = c.var.member
  const { channels: updates } = c.req.valid("json")

  assertGuildPermission(member, guild, {
    channel: ["update"],
  })

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

export const getChannel: AppRouteHandler<GetChannelRoute> = async (c) => {
  const guild = c.var.guild
  const { channelId } = c.req.valid("param")

  const ch = await db
    .select()
    .from(channel)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .limit(1)
    .then((rows) => rows[0])

  if (!ch) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(ch, HttpStatusCodes.OK)
}

export const updateChannel: AppRouteHandler<UpdateChannelRoute> = async (c) => {
  const guild = c.var.guild
  const member = c.var.member
  const { channelId } = c.req.valid("param")
  const body = c.req.valid("json")

  assertGuildPermission(member, guild, {
    channel: ["update"],
  })

  const updated = await db
    .update(channel)
    .set(body)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .returning()
    .then((rows) => rows[0])

  if (!updated) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(updated, HttpStatusCodes.OK)
}

export const deleteChannel: AppRouteHandler<DeleteChannelRoute> = async (c) => {
  const guild = c.var.guild
  const member = c.var.member
  const { channelId } = c.req.valid("param")

  assertGuildPermission(member, guild, {
    channel: ["delete"],
  })

  const deleted = await db
    .delete(channel)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .returning({ id: channel.id })
    .then((rows) => rows[0])

  if (!deleted) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json({ success: true }, HttpStatusCodes.OK)
}

export const listChannelMessages: AppRouteHandler<
  ListChannelMessagesRoute
> = async (c) => {
  const guild = c.var.guild
  const currentUser = c.var.user
  const { channelId } = c.req.valid("param")
  const { page, perPage } = c.req.valid("query")

  // Verify channel belongs to this guild
  const ch = await db
    .select({ id: channel.id })
    .from(channel)
    .where(and(eq(channel.id, channelId), eq(channel.guildId, guild.id)))
    .limit(1)
    .then((rows) => rows[0])

  if (!ch) {
    return c.json(
      { success: false, message: "Channel not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(
    await fetchMessagePage(channelId, page, perPage, currentUser.id),
    HttpStatusCodes.OK
  )
}
