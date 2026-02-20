import { and, db, eq, schema } from "@repo/db"

export async function assertUserCanAccessChannel(
  userId: string,
  channelId: string
) {
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
      .select({ id: schema.guildMember.id })
      .from(schema.guildMember)
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

    return channelRecord
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

  return channelRecord
}
