import {
  getGuildAuthorityPosition,
  getGuildRolePosition,
} from "@repo/auth/permissions"
import { and, count, db, desc, eq, ilike, inArray, schema } from "@repo/db"
import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import { asc } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import {
  assertCanManageGuildMember,
  assertGuildPermission,
} from "@/lib/permissions"
import { getRedisClient } from "@/lib/redis"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  BanGuildMemberRoute,
  ClearGuildMemberTimeoutRoute,
  KickGuildMemberRoute,
  ListGuildMembersRoute,
  SearchMessagesRoute,
  TimeoutGuildMemberRoute,
  UpdateGuildMemberRoleRoute,
} from "@/routes/v1/guilds/routes"

const PRESENCE_MEMBERSHIP_CHUNK_SIZE = 250

async function listOnlineUserIds(userIds: string[]) {
  if (userIds.length === 0) return new Set<string>()

  try {
    const redis = await getRedisClient()
    const membership: boolean[] = []

    for (
      let index = 0;
      index < userIds.length;
      index += PRESENCE_MEMBERSHIP_CHUNK_SIZE
    ) {
      const chunk = userIds.slice(index, index + PRESENCE_MEMBERSHIP_CHUNK_SIZE)
      const chunkMembership = await redis.smIsMember(
        PRESENCE_ONLINE_USERS_SET_KEY,
        chunk
      )
      membership.push(...chunkMembership)
    }

    const onlineIds = userIds.filter((_, index) => membership[index] === true)

    return new Set(onlineIds)
  } catch (error) {
    console.error("[api] failed to read presence from redis:", error)
    return new Set<string>()
  }
}

function toGuildMemberPresence(
  member: {
    userId: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
    role: string
    communicationDisabledUntil: Date | null
    communicationDisabledReason: string | null
  },
  ownerId: string,
  onlineUserIds: Set<string>
) {
  return {
    userId: member.userId,
    name: member.name,
    username: member.username,
    displayUsername: member.displayUsername,
    image: member.image,
    role: member.role,
    isOwner: ownerId === member.userId,
    status: onlineUserIds.has(member.userId)
      ? ("online" as const)
      : ("offline" as const),
    communicationDisabledUntil:
      member.communicationDisabledUntil?.toISOString() ?? null,
    communicationDisabledReason: member.communicationDisabledReason,
  }
}

async function getGuildMemberRow(guildId: string, userId: string) {
  return db
    .select({
      userId: schema.guildMember.userId,
      role: schema.guildMember.role,
      communicationDisabledUntil: schema.guildMember.communicationDisabledUntil,
      communicationDisabledReason:
        schema.guildMember.communicationDisabledReason,
      name: schema.user.name,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      image: schema.user.image,
    })
    .from(schema.guildMember)
    .innerJoin(schema.user, eq(schema.guildMember.userId, schema.user.id))
    .where(
      and(
        eq(schema.guildMember.guildId, guildId),
        eq(schema.guildMember.userId, userId)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

export const listGuildMembers: AppRouteHandler<ListGuildMembersRoute> = async (
  c
) => {
  const guild = c.var.guild

  const memberRows = await db
    .select({
      userId: schema.guildMember.userId,
      role: schema.guildMember.role,
      communicationDisabledUntil: schema.guildMember.communicationDisabledUntil,
      communicationDisabledReason:
        schema.guildMember.communicationDisabledReason,
      name: schema.user.name,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      image: schema.user.image,
    })
    .from(schema.guildMember)
    .innerJoin(schema.user, eq(schema.guildMember.userId, schema.user.id))
    .where(eq(schema.guildMember.guildId, guild.id))
    .orderBy(asc(schema.user.name))

  const userIds = memberRows.map((row) => row.userId)
  const onlineUserIds = await listOnlineUserIds(userIds)

  return c.json(
    {
      guildId: guild.id,
      guildSlug: guild.slug,
      guildName: guild.name,
      ownerId: guild.ownerId,
      members: memberRows.map((member) =>
        toGuildMemberPresence(member, guild.ownerId, onlineUserIds)
      ),
    },
    HttpStatusCodes.OK
  )
}

export const updateGuildMemberRole: AppRouteHandler<
  UpdateGuildMemberRoleRoute
> = async (c) => {
  const guild = c.var.guild
  const actor = c.var.member
  const { userId } = c.req.valid("param")
  const { role } = c.req.valid("json")

  const actorAuthority = assertGuildPermission(actor, guild, {
    guildMember: ["role:update"],
  })

  const target = await getGuildMemberRow(guild.id, userId)

  if (!target) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  assertCanManageGuildMember(actor, target, guild)

  if (
    !actorAuthority.isOwner &&
    getGuildRolePosition(role) <= getGuildAuthorityPosition(actorAuthority)
  ) {
    return c.json(
      { success: false, message: "You cannot assign that role" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  await db
    .update(schema.guildMember)
    .set({ role })
    .where(
      and(
        eq(schema.guildMember.guildId, guild.id),
        eq(schema.guildMember.userId, userId)
      )
    )

  const updatedMember = await getGuildMemberRow(guild.id, userId)

  if (!updatedMember) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const onlineUserIds = await listOnlineUserIds([updatedMember.userId])

  return c.json(
    {
      success: true as const,
      member: toGuildMemberPresence(
        updatedMember,
        guild.ownerId,
        onlineUserIds
      ),
    },
    HttpStatusCodes.OK
  )
}

export const kickGuildMember: AppRouteHandler<KickGuildMemberRoute> = async (
  c
) => {
  const guild = c.var.guild
  const actor = c.var.member
  const { userId } = c.req.valid("param")

  assertGuildPermission(actor, guild, {
    guildMember: ["kick"],
  })

  const target = await getGuildMemberRow(guild.id, userId)

  if (!target) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  assertCanManageGuildMember(actor, target, guild)

  await db
    .delete(schema.guildMember)
    .where(
      and(
        eq(schema.guildMember.guildId, guild.id),
        eq(schema.guildMember.userId, userId)
      )
    )

  return c.json({ success: true as const }, HttpStatusCodes.OK)
}

export const banGuildMember: AppRouteHandler<BanGuildMemberRoute> = async (
  c
) => {
  const guild = c.var.guild
  const actor = c.var.member
  const { userId } = c.req.valid("param")
  const { reason, expiresAt } = c.req.valid("json")

  assertGuildPermission(actor, guild, {
    guildMember: ["ban"],
  })

  const target = await getGuildMemberRow(guild.id, userId)

  if (!target) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  assertCanManageGuildMember(actor, target, guild)

  const expiresAtDate = expiresAt ? new Date(expiresAt) : null
  const banTimestamp = new Date()

  const ban = await db.transaction(async (tx) => {
    const insertedBan = await tx
      .insert(schema.guildBan)
      .values({
        createdAt: banTimestamp,
        guildId: guild.id,
        userId,
        bannedBy: actor.userId,
        reason: reason ?? null,
        expiresAt: expiresAtDate,
        revokedAt: null,
        revokeReason: null,
      })
      .onConflictDoUpdate({
        target: [schema.guildBan.guildId, schema.guildBan.userId],
        set: {
          createdAt: banTimestamp,
          bannedBy: actor.userId,
          reason: reason ?? null,
          expiresAt: expiresAtDate,
          revokedAt: null,
          revokeReason: null,
        },
      })
      .returning({
        userId: schema.guildBan.userId,
        guildId: schema.guildBan.guildId,
        bannedBy: schema.guildBan.bannedBy,
        reason: schema.guildBan.reason,
        expiresAt: schema.guildBan.expiresAt,
        createdAt: schema.guildBan.createdAt,
        revokedAt: schema.guildBan.revokedAt,
      })
      .then((rows) => rows[0])

    await tx
      .delete(schema.guildMember)
      .where(
        and(
          eq(schema.guildMember.guildId, guild.id),
          eq(schema.guildMember.userId, userId)
        )
      )

    return insertedBan
  })

  if (!ban) {
    return c.json(
      { success: false, message: "Failed to create guild ban" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(
    {
      success: true as const,
      ban: {
        ...ban,
        reason: ban.reason ?? null,
        expiresAt: ban.expiresAt?.toISOString() ?? null,
        createdAt: ban.createdAt.toISOString(),
        revokedAt: ban.revokedAt?.toISOString() ?? null,
      },
    },
    HttpStatusCodes.OK
  )
}

export const timeoutGuildMember: AppRouteHandler<
  TimeoutGuildMemberRoute
> = async (c) => {
  const guild = c.var.guild
  const actor = c.var.member
  const { userId } = c.req.valid("param")
  const { durationMinutes, reason } = c.req.valid("json")

  assertGuildPermission(actor, guild, {
    guildMember: ["timeout"],
  })

  const target = await getGuildMemberRow(guild.id, userId)

  if (!target) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  assertCanManageGuildMember(actor, target, guild)

  const communicationDisabledUntil = new Date(
    Date.now() + durationMinutes * 60 * 1000
  )

  await db
    .update(schema.guildMember)
    .set({
      communicationDisabledUntil,
      communicationDisabledBy: actor.userId,
      communicationDisabledReason: reason ?? null,
    })
    .where(
      and(
        eq(schema.guildMember.guildId, guild.id),
        eq(schema.guildMember.userId, userId)
      )
    )

  const updatedMember = await getGuildMemberRow(guild.id, userId)

  if (!updatedMember) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const onlineUserIds = await listOnlineUserIds([updatedMember.userId])

  return c.json(
    {
      success: true as const,
      member: toGuildMemberPresence(
        updatedMember,
        guild.ownerId,
        onlineUserIds
      ),
    },
    HttpStatusCodes.OK
  )
}

export const clearGuildMemberTimeout: AppRouteHandler<
  ClearGuildMemberTimeoutRoute
> = async (c) => {
  const guild = c.var.guild
  const actor = c.var.member
  const { userId } = c.req.valid("param")

  assertGuildPermission(actor, guild, {
    guildMember: ["timeout"],
  })

  const target = await getGuildMemberRow(guild.id, userId)

  if (!target) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  assertCanManageGuildMember(actor, target, guild)

  await db
    .update(schema.guildMember)
    .set({
      communicationDisabledUntil: null,
      communicationDisabledBy: null,
      communicationDisabledReason: null,
    })
    .where(
      and(
        eq(schema.guildMember.guildId, guild.id),
        eq(schema.guildMember.userId, userId)
      )
    )

  const updatedMember = await getGuildMemberRow(guild.id, userId)

  if (!updatedMember) {
    return c.json(
      { success: false, message: "Guild member not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  const onlineUserIds = await listOnlineUserIds([updatedMember.userId])

  return c.json(
    {
      success: true as const,
      member: toGuildMemberPresence(
        updatedMember,
        guild.ownerId,
        onlineUserIds
      ),
    },
    HttpStatusCodes.OK
  )
}

// ── Search ──────────────────────────────────────────────

export const searchMessages: AppRouteHandler<SearchMessagesRoute> = async (
  c
) => {
  const guild = c.var.guild
  const { query, channelId, page, perPage } = c.req.valid("query")
  const offset = (page - 1) * perPage

  const guildChannels = await db
    .select({
      id: schema.channel.id,
      name: schema.channel.name,
    })
    .from(schema.channel)
    .where(
      and(
        eq(schema.channel.guildId, guild.id),
        inArray(schema.channel.type, ["text", "announcement", "forum"])
      )
    )

  const emptyResult = {
    itemsTotal: 0,
    currentPage: page,
    nextPage: null,
    prevPage: null,
    data: [],
  }

  if (guildChannels.length === 0) {
    return c.json(emptyResult, HttpStatusCodes.OK)
  }

  const channelMap = new Map(guildChannels.map((ch) => [ch.id, ch.name]))
  const searchChannelIds = channelId
    ? guildChannels.filter((ch) => ch.id === channelId).map((ch) => ch.id)
    : guildChannels.map((ch) => ch.id)

  if (searchChannelIds.length === 0) {
    return c.json(emptyResult, HttpStatusCodes.OK)
  }

  const searchPattern = `%${query}%`
  const whereConditions = and(
    inArray(schema.message.channelId, searchChannelIds),
    ilike(schema.message.content, searchPattern)
  )

  const [countResult, messages] = await Promise.all([
    db.select({ total: count() }).from(schema.message).where(whereConditions),
    db
      .select({
        id: schema.message.id,
        content: schema.message.content,
        createdAt: schema.message.createdAt,
        channelId: schema.message.channelId,
        author: {
          id: schema.user.id,
          name: schema.user.name,
          username: schema.user.username,
          displayUsername: schema.user.displayUsername,
          image: schema.user.image,
        },
      })
      .from(schema.message)
      .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
      .where(whereConditions)
      .orderBy(desc(schema.message.createdAt))
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
        channelName: channelMap.get(msg.channelId) ?? "unknown",
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
