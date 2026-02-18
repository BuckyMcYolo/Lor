import { db } from "@repo/db"
import { channel, channelMember, message, user } from "@repo/db/schema"
import { and, count, desc, eq, inArray } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type { ListDMsRoute } from "./routes"

const emptyPage = (page: number) => ({
  itemsTotal: 0,
  currentPage: page,
  nextPage: null,
  prevPage: null,
  data: [],
})

export const listDMs: AppRouteHandler<ListDMsRoute> = async (c) => {
  const currentUser = c.var.user
  const { page, perPage } = c.req.valid("query")
  const offset = (page - 1) * perPage

  const dmFilter = and(
    eq(channelMember.userId, currentUser.id),
    inArray(channel.type, ["dm", "group_dm"])
  )

  // Query 1: Count + fetch paginated DM channels
  const [countResult, dmChannels] = await Promise.all([
    db
      .select({ total: count() })
      .from(channel)
      .innerJoin(channelMember, eq(channelMember.channelId, channel.id))
      .where(dmFilter),
    db
      .select({
        id: channel.id,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        name: channel.name,
        topic: channel.topic,
        type: channel.type,
        guildId: channel.guildId,
        parentId: channel.parentId,
        position: channel.position,
        ownerId: channel.ownerId,
        rateLimitPerUser: channel.rateLimitPerUser,
      })
      .from(channel)
      .innerJoin(channelMember, eq(channelMember.channelId, channel.id))
      .where(dmFilter)
      .orderBy(desc(channel.updatedAt))
      .limit(perPage)
      .offset(offset),
  ])

  const itemsTotal = countResult[0]?.total ?? 0

  if (dmChannels.length === 0) {
    return c.json(emptyPage(page), HttpStatusCodes.OK)
  }

  // Query 2: Latest message + author for this page's channels
  // Uses DISTINCT ON to get one row per channel (the most recent message)
  const dmChannelIds = dmChannels.map((ch) => ch.id)

  const latestMessages = await db
    .select({
      channelId: message.channelId,
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorUsername: user.username,
      authorDisplayUsername: user.displayUsername,
      authorImage: user.image,
    })
    .from(message)
    .innerJoin(user, eq(message.authorId, user.id))
    .where(inArray(message.channelId, dmChannelIds))
    .orderBy(message.channelId, desc(message.createdAt))
    .then((rows) => {
      // Keep only the first (most recent) message per channel
      const seen = new Set<string>()
      return rows.filter((row) => {
        if (seen.has(row.channelId)) return false
        seen.add(row.channelId)
        return true
      })
    })

  const lastMessageByChannel = new Map(
    latestMessages.map((msg) => [
      msg.channelId,
      {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        author: {
          id: msg.authorId,
          name: msg.authorName,
          username: msg.authorUsername,
          displayUsername: msg.authorDisplayUsername,
          image: msg.authorImage,
        },
      },
    ])
  )

  // Query 3: Members for each DM channel (excluding the current user)
  const members = await db
    .select({
      channelId: channelMember.channelId,
      id: user.id,
      name: user.name,
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
    })
    .from(channelMember)
    .innerJoin(user, eq(channelMember.userId, user.id))
    .where(inArray(channelMember.channelId, dmChannelIds))

  const membersByChannel = new Map<
    string,
    {
      id: string
      name: string
      username: string | null
      displayUsername: string | null
      image: string | null
    }[]
  >()
  for (const m of members) {
    if (m.id === currentUser.id) continue
    const list = membersByChannel.get(m.channelId) ?? []
    list.push({
      id: m.id,
      name: m.name,
      username: m.username,
      displayUsername: m.displayUsername,
      image: m.image,
    })
    membersByChannel.set(m.channelId, list)
  }

  const totalPages = Math.ceil(itemsTotal / perPage)

  const data = dmChannels.map((ch) => ({
    ...ch,
    members: membersByChannel.get(ch.id) ?? [],
    lastMessage: lastMessageByChannel.get(ch.id) ?? null,
  }))

  return c.json(
    {
      itemsTotal,
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      data,
    },
    HttpStatusCodes.OK
  )
}
