import { db, eq, schema } from "@repo/db"
import { PRESENCE_ONLINE_USERS_SET_KEY } from "@repo/realtime-types"
import { asc } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { getRedisClient } from "@/lib/redis"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type { ListGuildMembersRoute } from "@/routes/v1/guilds/routes"

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
      members: memberRows.map((member) => ({
        userId: member.userId,
        name: member.name,
        username: member.username,
        displayUsername: member.displayUsername,
        image: member.image,
        role: member.role,
        status: onlineUserIds.has(member.userId)
          ? ("online" as const)
          : ("offline" as const),
      })),
    },
    HttpStatusCodes.OK
  )
}
