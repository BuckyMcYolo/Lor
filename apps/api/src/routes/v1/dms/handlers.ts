import { db } from "@repo/db"
import {
  allyRequest,
  channel,
  channelMember,
  message,
  user,
  userBlock,
  userPrivacySettings,
} from "@repo/db/schema"
import { and, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { fetchMessagePage } from "@/lib/queries/messages"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  CreateDMRoute,
  GetDMRoute,
  ListDMMessagesRoute,
  ListDMsRoute,
  SearchDMMessagesRoute,
} from "./routes"

const emptyPage = (page: number) => ({
  itemsTotal: 0,
  currentPage: page,
  nextPage: null,
  prevPage: null,
  data: [],
})

const DM_CHANNEL_TYPES = ["dm", "group_dm"] as const

async function fetchDMMembershipChannel(dmId: string, userId: string) {
  return db
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
    .where(
      and(
        eq(channel.id, dmId),
        eq(channelMember.userId, userId),
        inArray(channel.type, DM_CHANNEL_TYPES)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export const createDM: AppRouteHandler<CreateDMRoute> = async (c) => {
  const currentUser = c.var.user
  const { userIds } = c.req.valid("json")

  // Deduplicate and remove self
  const targetUserIds = [...new Set(userIds)].filter(
    (id) => id !== currentUser.id
  )

  if (targetUserIds.length === 0) {
    return c.json(
      { success: false, message: "Cannot create a DM with yourself" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  // Check if any target user has a block relationship with the current user
  const blockRows = await db
    .select({ id: userBlock.id })
    .from(userBlock)
    .where(
      or(
        and(
          eq(userBlock.blockerId, currentUser.id),
          inArray(userBlock.blockedId, targetUserIds)
        ),
        and(
          inArray(userBlock.blockerId, targetUserIds),
          eq(userBlock.blockedId, currentUser.id)
        )
      )
    )
    .limit(1)

  if (blockRows.length > 0) {
    return c.json(
      { success: false, message: "Unable to create conversation" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  // Fetch target users' privacy settings
  const targetPrivacyRows = await db
    .select({
      userId: userPrivacySettings.userId,
      dmPrivacy: userPrivacySettings.dmPrivacy,
    })
    .from(userPrivacySettings)
    .where(inArray(userPrivacySettings.userId, targetUserIds))

  const privacyByUserId = new Map(
    targetPrivacyRows.map((r) => [r.userId, r.dmPrivacy])
  )

  // Check if any target user has DMs set to "no_one"
  const noOneIds = targetUserIds.filter(
    (id) => privacyByUserId.get(id) === "no_one"
  )
  if (noOneIds.length > 0) {
    return c.json(
      { success: false, message: "This user is not accepting direct messages" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  // For users with "allies_only" privacy, verify ally relationship
  const alliesOnlyIds = targetUserIds.filter(
    (id) => privacyByUserId.get(id) === "allies_only"
  )

  if (alliesOnlyIds.length > 0) {
    const allyRows = await db
      .select({
        senderId: allyRequest.senderId,
        receiverId: allyRequest.receiverId,
      })
      .from(allyRequest)
      .where(
        and(
          eq(allyRequest.status, "accepted"),
          or(
            and(
              eq(allyRequest.senderId, currentUser.id),
              inArray(allyRequest.receiverId, alliesOnlyIds)
            ),
            and(
              inArray(allyRequest.senderId, alliesOnlyIds),
              eq(allyRequest.receiverId, currentUser.id)
            )
          )
        )
      )

    const allyUserIds = new Set(
      allyRows.map((r) =>
        r.senderId === currentUser.id ? r.receiverId : r.senderId
      )
    )

    const nonAllyIds = alliesOnlyIds.filter((id) => !allyUserIds.has(id))
    if (nonAllyIds.length > 0) {
      return c.json(
        {
          success: false,
          message: "This user only accepts DMs from allies",
        },
        HttpStatusCodes.FORBIDDEN
      )
    }
  }

  const allMemberIds = [currentUser.id, ...targetUserIds].sort()
  const isDirect = targetUserIds.length === 1

  // For 1-on-1 DMs, check if one already exists
  if (isDirect) {
    const candidates = await db
      .select({
        channelId: channelMember.channelId,
      })
      .from(channelMember)
      .innerJoin(channel, eq(channel.id, channelMember.channelId))
      .where(
        and(eq(channel.type, "dm"), inArray(channelMember.userId, allMemberIds))
      )
      .groupBy(channelMember.channelId)
      .having(sql`count(*) = ${allMemberIds.length}`)

    // Verify the channel has exactly 2 members (not more)
    for (const candidate of candidates) {
      const totalMembers = await db
        .select({ total: count() })
        .from(channelMember)
        .where(eq(channelMember.channelId, candidate.channelId))
        .then((rows) => rows[0]?.total ?? 0)

      if (totalMembers === allMemberIds.length) {
        return returnDMResponse(c, candidate.channelId, currentUser.id, false)
      }
    }
  }

  // Create new DM/group DM in a transaction to prevent races
  const newChannelId = await db.transaction(async (tx) => {
    // Re-check for 1:1 DMs inside the transaction
    if (isDirect) {
      const candidates = await tx
        .select({ channelId: channelMember.channelId })
        .from(channelMember)
        .innerJoin(channel, eq(channel.id, channelMember.channelId))
        .where(
          and(
            eq(channel.type, "dm"),
            inArray(channelMember.userId, allMemberIds)
          )
        )
        .groupBy(channelMember.channelId)
        .having(sql`count(*) = ${allMemberIds.length}`)

      for (const candidate of candidates) {
        const totalMembers = await tx
          .select({ total: count() })
          .from(channelMember)
          .where(eq(channelMember.channelId, candidate.channelId))
          .then((rows) => rows[0]?.total ?? 0)

        if (totalMembers === allMemberIds.length) {
          return candidate.channelId
        }
      }
    }

    const now = new Date()
    const [newChannel] = await tx
      .insert(channel)
      .values({
        type: isDirect ? "dm" : "group_dm",
        guildId: null,
        ownerId: isDirect ? null : currentUser.id,
        position: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!newChannel) {
      throw new Error("Failed to create DM channel")
    }

    await tx.insert(channelMember).values(
      allMemberIds.map((userId) => ({
        channelId: newChannel.id,
        userId,
      }))
    )

    return newChannel.id
  })

  return returnDMResponse(c, newChannelId, currentUser.id, true)
}

async function returnDMResponse(
  c: Parameters<AppRouteHandler<CreateDMRoute>>[0],
  channelId: string,
  currentUserId: string,
  created: boolean
) {
  const [ch, members] = await Promise.all([
    db
      .select()
      .from(channel)
      .where(eq(channel.id, channelId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        displayUsername: user.displayUsername,
        image: user.image,
      })
      .from(channelMember)
      .innerJoin(user, eq(channelMember.userId, user.id))
      .where(
        and(
          eq(channelMember.channelId, channelId),
          ne(channelMember.userId, currentUserId)
        )
      ),
  ])

  if (!ch) {
    return c.json(
      { success: false, message: "Failed to fetch DM" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(
    {
      success: true,
      dm: { ...ch, members, lastMessage: null },
      created,
    },
    HttpStatusCodes.OK
  )
}

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
    .where(
      and(
        inArray(channelMember.channelId, dmChannelIds),
        ne(channelMember.userId, currentUser.id)
      )
    )

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

export const getDM: AppRouteHandler<GetDMRoute> = async (c) => {
  const currentUser = c.var.user
  const { dmId } = c.req.valid("param")

  // Verify the channel exists and the user is a member.
  const ch = await fetchDMMembershipChannel(dmId, currentUser.id)

  if (!ch) {
    return c.json(
      { success: false, message: "DM not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const [members, latestMessages] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        displayUsername: user.displayUsername,
        image: user.image,
      })
      .from(channelMember)
      .innerJoin(user, eq(channelMember.userId, user.id))
      .where(
        and(
          eq(channelMember.channelId, ch.id),
          ne(channelMember.userId, currentUser.id)
        )
      ),
    db
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
      .where(eq(message.channelId, ch.id))
      .orderBy(desc(message.createdAt))
      .limit(1),
  ])

  const lastMessageRow = latestMessages[0]
  const lastMessage = lastMessageRow
    ? {
        id: lastMessageRow.id,
        content: lastMessageRow.content,
        createdAt: lastMessageRow.createdAt.toISOString(),
        author: {
          id: lastMessageRow.authorId,
          name: lastMessageRow.authorName,
          username: lastMessageRow.authorUsername,
          displayUsername: lastMessageRow.authorDisplayUsername,
          image: lastMessageRow.authorImage,
        },
      }
    : null

  return c.json(
    {
      ...ch,
      members,
      lastMessage,
    },
    HttpStatusCodes.OK
  )
}

export const listDMMessages: AppRouteHandler<ListDMMessagesRoute> = async (
  c
) => {
  const currentUser = c.var.user
  const { dmId } = c.req.valid("param")
  const { page, perPage } = c.req.valid("query")

  // Verify the channel exists and the user is a member.
  const ch = await fetchDMMembershipChannel(dmId, currentUser.id)

  if (!ch) {
    return c.json(
      { success: false, message: "DM not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(
    await fetchMessagePage(ch.id, page, perPage, currentUser.id),
    HttpStatusCodes.OK
  )
}

// ── Search ──────────────────────────────────────────────

export const searchDMMessages: AppRouteHandler<SearchDMMessagesRoute> = async (
  c
) => {
  const currentUser = c.var.user
  const { query, page, perPage, dmId } = c.req.valid("query")
  const offset = (page - 1) * perPage

  // Get all DM channel IDs the user is a member of
  const dmChannels = await db
    .select({
      id: channel.id,
      name: channel.name,
      type: channel.type,
    })
    .from(channelMember)
    .innerJoin(channel, eq(channelMember.channelId, channel.id))
    .where(
      and(
        eq(channelMember.userId, currentUser.id),
        inArray(channel.type, ["dm", "group_dm"]),
        dmId ? eq(channel.id, dmId) : undefined
      )
    )

  if (dmChannels.length === 0) {
    return c.json(emptyPage(page), HttpStatusCodes.OK)
  }

  const dmChannelIds = dmChannels.map((ch) => ch.id)

  // For DMs, get member names to use as channel labels
  const dmMembers = await db
    .select({
      channelId: channelMember.channelId,
      name: user.name,
      userId: user.id,
    })
    .from(channelMember)
    .innerJoin(user, eq(channelMember.userId, user.id))
    .where(inArray(channelMember.channelId, dmChannelIds))

  const membersByChannel = new Map<string, typeof dmMembers>()
  for (const m of dmMembers) {
    const list = membersByChannel.get(m.channelId) ?? []
    list.push(m)
    membersByChannel.set(m.channelId, list)
  }

  const channelNameMap = new Map<string, string>()
  for (const ch of dmChannels) {
    if (ch.type === "group_dm" && ch.name) {
      channelNameMap.set(ch.id, ch.name)
    } else {
      const others = (membersByChannel.get(ch.id) ?? []).filter(
        (m) => m.userId !== currentUser.id
      )
      channelNameMap.set(ch.id, others.map((m) => m.name).join(", ") || "DM")
    }
  }

  const escaped = query.replace(/[%_\\]/g, (ch) => `\\${ch}`)
  const searchPattern = `%${escaped}%`
  const whereConditions = and(
    inArray(message.channelId, dmChannelIds),
    ilike(message.content, searchPattern)
  )

  const [countResult, messages] = await Promise.all([
    db.select({ total: count() }).from(message).where(whereConditions),
    db
      .select({
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        channelId: message.channelId,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          displayUsername: user.displayUsername,
          image: user.image,
        },
      })
      .from(message)
      .innerJoin(user, eq(message.authorId, user.id))
      .where(whereConditions)
      .orderBy(desc(message.createdAt))
      .limit(perPage)
      .offset(offset),
  ])

  const itemsTotal = countResult[0]?.total ?? 0
  const totalPages = Math.ceil(itemsTotal / perPage)

  return c.json(
    {
      itemsTotal,
      currentPage: page,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      data: messages.map((msg) => ({
        id: msg.id,
        content: msg.content ?? "",
        createdAt: msg.createdAt.toISOString(),
        channelId: msg.channelId,
        channelName: channelNameMap.get(msg.channelId) ?? "DM",
        author: {
          id: msg.author.id,
          name: msg.author.name,
          username: msg.author.username,
          displayUsername: msg.author.displayUsername,
          image: msg.author.image,
        },
      })),
    },
    HttpStatusCodes.OK
  )
}
