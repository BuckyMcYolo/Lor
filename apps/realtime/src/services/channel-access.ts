import { and, db, eq, schema } from "@repo/db"

export type AccessibleChannel = {
  id: string
  type: (typeof schema.channel.$inferSelect)["type"]
  guildId: string | null
  memberRole: string | null
  memberIsOwner: boolean
  communicationDisabledUntil: Date | null
  communicationDisabledReason: string | null
}

export async function assertUserCanAccessChannel(
  userId: string,
  channelId: string
): Promise<AccessibleChannel> {
  const channelRecord = await db
    .select({
      id: schema.channel.id,
      type: schema.channel.type,
      guildId: schema.channel.guildId,
    })
    .from(schema.channel)
    .where(eq(schema.channel.id, channelId))
    .limit(1)
    .then((rows) => rows[0])

  if (!channelRecord) {
    throw new Error("Channel not found")
  }

  if (channelRecord.type === "category") {
    throw new Error("Cannot join a category channel")
  }

  if (channelRecord.guildId) {
    const memberRecord = await db
      .select({
        role: schema.guildMember.role,
        communicationDisabledUntil:
          schema.guildMember.communicationDisabledUntil,
        communicationDisabledReason:
          schema.guildMember.communicationDisabledReason,
        ownerId: schema.guild.ownerId,
      })
      .from(schema.guildMember)
      .innerJoin(schema.guild, eq(schema.guild.id, schema.guildMember.guildId))
      .where(
        and(
          eq(schema.guildMember.guildId, channelRecord.guildId),
          eq(schema.guildMember.userId, userId)
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (!memberRecord) {
      throw new Error("Forbidden")
    }

    return {
      ...channelRecord,
      memberRole: memberRecord.role,
      memberIsOwner: memberRecord.ownerId === userId,
      communicationDisabledUntil: memberRecord.communicationDisabledUntil,
      communicationDisabledReason: memberRecord.communicationDisabledReason,
    }
  }

  const dmMemberRecord = await db
    .select({ id: schema.channelMember.id })
    .from(schema.channelMember)
    .where(
      and(
        eq(schema.channelMember.channelId, channelId),
        eq(schema.channelMember.userId, userId)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!dmMemberRecord) {
    throw new Error("Forbidden")
  }

  return {
    ...channelRecord,
    memberRole: null,
    memberIsOwner: false,
    communicationDisabledUntil: null,
    communicationDisabledReason: null,
  }
}
