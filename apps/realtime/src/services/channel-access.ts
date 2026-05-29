import { and, db, eq, schema } from "@repo/db"

export type AccessibleChannel = {
  id: string
  name: string | null
  type: (typeof schema.channel.$inferSelect)["type"]
  workspaceId: string | null
  memberRole: string | null
  memberIsOwner: boolean
}

export async function assertUserCanAccessChannel(
  userId: string,
  channelId: string
): Promise<AccessibleChannel> {
  const channelRecord = await db
    .select({
      id: schema.channel.id,
      name: schema.channel.name,
      type: schema.channel.type,
      workspaceId: schema.channel.workspaceId,
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

  if (channelRecord.workspaceId) {
    const memberRecord = await db
      .select({
        role: schema.workspaceMember.role,
        ownerId: schema.workspace.ownerId,
      })
      .from(schema.workspaceMember)
      .innerJoin(
        schema.workspace,
        eq(schema.workspace.id, schema.workspaceMember.workspaceId)
      )
      .where(
        and(
          eq(schema.workspaceMember.workspaceId, channelRecord.workspaceId),
          eq(schema.workspaceMember.userId, userId)
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
  }
}
