import {
  getGuildAuthorityPosition,
  getGuildRolePosition,
} from "@repo/auth/permissions"
import { and, count, db, desc, eq, ilike, inArray, schema } from "@repo/db"
import { env } from "@repo/env/server"
import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import { asc } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { logger } from "@/lib/logger"
import {
  assertCanManageGuildMember,
  assertGuildPermission,
} from "@/lib/permissions"
import { getRedisClient } from "@/lib/redis"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  KickGuildMemberRoute,
  ListGuildMembersRoute,
  SearchMessagesRoute,
  UpdateGuildMemberRoleRoute,
  UpdateGuildRoute,
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
    logger.error({ err: error }, "Failed to read presence from Redis")
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
  }
}

async function getGuildMemberRow(guildId: string, userId: string) {
  return db
    .select({
      userId: schema.guildMember.userId,
      role: schema.guildMember.role,
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

// ── Guild Settings ─────────────────────────────────────

export const updateGuild: AppRouteHandler<UpdateGuildRoute> = async (c) => {
  const guild = c.var.guild
  const actor = c.var.member

  assertGuildPermission(actor, guild, {
    organization: ["update"],
  })

  const body = c.req.valid("json")

  const guildIconPrefix = `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/guild-icons/${guild.id}/`
  if (body.logo && !body.logo.startsWith(guildIconPrefix)) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
      message: "Invalid logo URL",
    })
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.logo !== undefined) updates.logo = body.logo

  if (Object.keys(updates).length === 0) {
    return c.json(
      {
        success: true as const,
        guild: {
          id: guild.id,
          name: guild.name,
          slug: guild.slug,
          logo: guild.logo,
        },
      },
      HttpStatusCodes.OK
    )
  }

  const [updated] = await db
    .update(schema.guild)
    .set(updates)
    .where(eq(schema.guild.id, guild.id))
    .returning({
      id: schema.guild.id,
      name: schema.guild.name,
      slug: schema.guild.slug,
      logo: schema.guild.logo,
    })

  if (!updated) {
    return c.json(
      { success: false, message: "Guild not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json(
    {
      success: true as const,
      guild: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logo: updated.logo,
      },
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

  const escaped = query.replace(/[%_\\]/g, (ch) => `\\${ch}`)
  const searchPattern = `%${escaped}%`
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
