import { randomBytes } from "node:crypto"
import { and, db, eq, schema, sql } from "@repo/db"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { assertGuildPermission } from "@/lib/permissions"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  AcceptInviteRoute,
  CreateInviteRoute,
  DeleteInviteRoute,
  ListInvitesRoute,
  PreviewInviteRoute,
} from "./routes"

// ── Helpers ──────────────────────────────────────────────

const CODE_LENGTH = 8
const MAX_CODE_RETRIES = 3

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = randomBytes(CODE_LENGTH)
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[(bytes[i] as number) % chars.length]
  }
  return code
}

function isInviteExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return expiresAt.getTime() <= Date.now()
}

function isInviteMaxedOut(uses: number, maxUses: number | null): boolean {
  if (maxUses === null) return false
  return uses >= maxUses
}

function toInviteResponse(
  invite: {
    id: string
    code: string
    guildId: string
    inviterId: string
    channelId: string | null
    maxUses: number | null
    uses: number
    expiresAt: Date | null
    createdAt: Date
  },
  inviter: {
    name: string
    username: string | null
    image: string | null
  }
) {
  return {
    id: invite.id,
    code: invite.code,
    guildId: invite.guildId,
    inviterId: invite.inviterId,
    channelId: invite.channelId,
    maxUses: invite.maxUses,
    uses: invite.uses,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
    inviter: {
      name: inviter.name,
      username: inviter.username,
      image: inviter.image,
    },
  }
}

// ── Guild-scoped Handlers ────────────────────────────────

export const createInvite: AppRouteHandler<CreateInviteRoute> = async (c) => {
  const guild = c.var.guild
  const user = c.var.user
  const { channelId, maxUses, expiresInMinutes } = c.req.valid("json")

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
    : null

  let invite = null
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateInviteCode()
    try {
      const rows = await db
        .insert(schema.guildInvite)
        .values({
          guildId: guild.id,
          code,
          inviterId: user.id,
          channelId: channelId ?? null,
          maxUses: maxUses ?? null,
          expiresAt,
        })
        .returning()

      invite = rows[0]
      break
    } catch (error) {
      // Unique constraint violation on code — retry with new code
      const isUniqueViolation =
        error instanceof Error && "code" in error && error.code === "23505"
      if (!isUniqueViolation || attempt === MAX_CODE_RETRIES - 1) {
        throw error
      }
    }
  }

  if (!invite) {
    return c.json(
      { success: false, message: "Failed to generate invite code" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(
    {
      success: true as const,
      invite: toInviteResponse(invite, {
        name: user.name,
        username: user.username ?? null,
        image: user.image ?? null,
      }),
    },
    HttpStatusCodes.OK
  )
}

export const listInvites: AppRouteHandler<ListInvitesRoute> = async (c) => {
  const guild = c.var.guild
  const actor = c.var.member

  assertGuildPermission(actor, guild, {
    guildMember: ["kick"], // admins+ can view invites (same permission tier as kick)
  })

  const rows = await db
    .select({
      id: schema.guildInvite.id,
      code: schema.guildInvite.code,
      guildId: schema.guildInvite.guildId,
      inviterId: schema.guildInvite.inviterId,
      channelId: schema.guildInvite.channelId,
      maxUses: schema.guildInvite.maxUses,
      uses: schema.guildInvite.uses,
      expiresAt: schema.guildInvite.expiresAt,
      createdAt: schema.guildInvite.createdAt,
      inviterName: schema.user.name,
      inviterUsername: schema.user.username,
      inviterImage: schema.user.image,
    })
    .from(schema.guildInvite)
    .innerJoin(schema.user, eq(schema.guildInvite.inviterId, schema.user.id))
    .where(
      and(
        eq(schema.guildInvite.guildId, guild.id),
        sql`(${schema.guildInvite.expiresAt} IS NULL OR ${schema.guildInvite.expiresAt} > NOW())`,
        sql`(${schema.guildInvite.maxUses} IS NULL OR ${schema.guildInvite.uses} < ${schema.guildInvite.maxUses})`
      )
    )

  const invites = rows.map((row) =>
    toInviteResponse(row, {
      name: row.inviterName,
      username: row.inviterUsername,
      image: row.inviterImage,
    })
  )

  return c.json({ success: true as const, invites }, HttpStatusCodes.OK)
}

export const deleteInvite: AppRouteHandler<DeleteInviteRoute> = async (c) => {
  const guild = c.var.guild
  const actor = c.var.member
  const { code } = c.req.valid("param")

  const invite = await db
    .select()
    .from(schema.guildInvite)
    .where(
      and(
        eq(schema.guildInvite.guildId, guild.id),
        eq(schema.guildInvite.code, code)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!invite) {
    return c.json(
      { success: false, message: "Invite not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  // Non-admin members can only delete their own invites
  if (invite.inviterId !== actor.userId) {
    assertGuildPermission(actor, guild, {
      guildMember: ["kick"],
    })
  }

  await db
    .delete(schema.guildInvite)
    .where(eq(schema.guildInvite.id, invite.id))

  return c.json({ success: true as const }, HttpStatusCodes.OK)
}

// ── Public Handlers (session-only) ───────────────────────

export const previewInvite: AppRouteHandler<PreviewInviteRoute> = async (c) => {
  const user = c.var.user
  const { code } = c.req.valid("param")

  const invite = await db
    .select({
      code: schema.guildInvite.code,
      guildId: schema.guildInvite.guildId,
      channelId: schema.guildInvite.channelId,
      maxUses: schema.guildInvite.maxUses,
      uses: schema.guildInvite.uses,
      expiresAt: schema.guildInvite.expiresAt,
      guildName: schema.guild.name,
      guildSlug: schema.guild.slug,
      guildLogo: schema.guild.logo,
      inviterName: schema.user.name,
      inviterUsername: schema.user.username,
      inviterImage: schema.user.image,
    })
    .from(schema.guildInvite)
    .innerJoin(schema.guild, eq(schema.guildInvite.guildId, schema.guild.id))
    .innerJoin(schema.user, eq(schema.guildInvite.inviterId, schema.user.id))
    .where(eq(schema.guildInvite.code, code))
    .limit(1)
    .then((rows) => rows[0])

  if (!invite) {
    return c.json(
      { success: false, message: "Invite not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  // Get member count
  const memberCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.guildMember)
    .where(eq(schema.guildMember.guildId, invite.guildId))
    .then((rows) => rows[0])

  // Check if user is already a member
  const existingMember = await db
    .select({ id: schema.guildMember.id })
    .from(schema.guildMember)
    .where(
      and(
        eq(schema.guildMember.guildId, invite.guildId),
        eq(schema.guildMember.userId, user.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  // Get channel info if present
  let channelInfo = null
  if (invite.channelId) {
    channelInfo = await db
      .select({ id: schema.channel.id, name: schema.channel.name })
      .from(schema.channel)
      .where(eq(schema.channel.id, invite.channelId))
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  const isExpired =
    isInviteExpired(invite.expiresAt) ||
    isInviteMaxedOut(invite.uses, invite.maxUses)

  return c.json(
    {
      success: true as const,
      invite: {
        code: invite.code,
        guild: {
          name: invite.guildName,
          slug: invite.guildSlug,
          logo: invite.guildLogo,
          memberCount: memberCountResult?.count ?? 0,
        },
        channel: channelInfo,
        inviter: {
          name: invite.inviterName,
          username: invite.inviterUsername,
          image: invite.inviterImage,
        },
        isExpired,
        isMember: !!existingMember,
      },
    },
    HttpStatusCodes.OK
  )
}

export const acceptInvite: AppRouteHandler<AcceptInviteRoute> = async (c) => {
  const user = c.var.user
  const { code } = c.req.valid("param")

  const invite = await db
    .select()
    .from(schema.guildInvite)
    .where(eq(schema.guildInvite.code, code))
    .limit(1)
    .then((rows) => rows[0])

  if (!invite) {
    return c.json(
      { success: false, message: "Invite not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  // Check expired / maxed out
  if (isInviteExpired(invite.expiresAt)) {
    return c.json(
      { success: false, message: "This invite has expired" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  if (isInviteMaxedOut(invite.uses, invite.maxUses)) {
    return c.json(
      { success: false, message: "This invite has reached its maximum uses" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  // Join the guild in a transaction with race-condition protection
  const result = await db.transaction(async (tx) => {
    // Check if already a member (inside transaction)
    const existingMember = await tx
      .select({ id: schema.guildMember.id })
      .from(schema.guildMember)
      .where(
        and(
          eq(schema.guildMember.guildId, invite.guildId),
          eq(schema.guildMember.userId, user.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (existingMember) {
      const guild = await tx
        .select({
          id: schema.guild.id,
          name: schema.guild.name,
          slug: schema.guild.slug,
        })
        .from(schema.guild)
        .where(eq(schema.guild.id, invite.guildId))
        .limit(1)
        .then((rows) => rows[0])
      return { alreadyMember: true as const, guild }
    }

    // Atomically increment uses only if under the limit
    const updated = await tx
      .update(schema.guildInvite)
      .set({ uses: sql`${schema.guildInvite.uses} + 1` })
      .where(
        and(
          eq(schema.guildInvite.id, invite.id),
          sql`(${schema.guildInvite.maxUses} IS NULL OR ${schema.guildInvite.uses} < ${schema.guildInvite.maxUses})`
        )
      )
      .returning({ id: schema.guildInvite.id })

    if (updated.length === 0) {
      return { maxedOut: true as const }
    }

    // Insert membership
    await tx.insert(schema.guildMember).values({
      guildId: invite.guildId,
      userId: user.id,
      role: "member",
      createdAt: new Date(),
    })

    const guild = await tx
      .select({
        id: schema.guild.id,
        name: schema.guild.name,
        slug: schema.guild.slug,
      })
      .from(schema.guild)
      .where(eq(schema.guild.id, invite.guildId))
      .limit(1)
      .then((rows) => rows[0])

    return { joined: true as const, guild }
  })

  if ("maxedOut" in result) {
    return c.json(
      { success: false, message: "This invite has reached its maximum uses" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  const guildRecord = result.guild

  if (!guildRecord) {
    return c.json(
      { success: false, message: "Guild not found" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(
    {
      success: true as const,
      guild: {
        id: guildRecord.id,
        name: guildRecord.name,
        slug: guildRecord.slug,
      },
    },
    HttpStatusCodes.OK
  )
}
