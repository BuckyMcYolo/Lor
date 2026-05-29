import { randomBytes } from "node:crypto"
import { and, db, eq, schema, sql } from "@repo/db"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { assertWorkspacePermission } from "@/lib/permissions"
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
    workspaceId: string
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
    workspaceId: invite.workspaceId,
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

// ── Workspace-scoped Handlers ────────────────────────────────

export const createInvite: AppRouteHandler<CreateInviteRoute> = async (c) => {
  const workspace = c.var.workspace
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
        .insert(schema.workspaceInvite)
        .values({
          workspaceId: workspace.id,
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
  const workspace = c.var.workspace
  const actor = c.var.member

  assertWorkspacePermission(actor, workspace, {
    workspaceMember: ["kick"], // admins+ can view invites (same permission tier as kick)
  })

  const rows = await db
    .select({
      id: schema.workspaceInvite.id,
      code: schema.workspaceInvite.code,
      workspaceId: schema.workspaceInvite.workspaceId,
      inviterId: schema.workspaceInvite.inviterId,
      channelId: schema.workspaceInvite.channelId,
      maxUses: schema.workspaceInvite.maxUses,
      uses: schema.workspaceInvite.uses,
      expiresAt: schema.workspaceInvite.expiresAt,
      createdAt: schema.workspaceInvite.createdAt,
      inviterName: schema.user.name,
      inviterUsername: schema.user.username,
      inviterImage: schema.user.image,
    })
    .from(schema.workspaceInvite)
    .innerJoin(
      schema.user,
      eq(schema.workspaceInvite.inviterId, schema.user.id)
    )
    .where(
      and(
        eq(schema.workspaceInvite.workspaceId, workspace.id),
        sql`(${schema.workspaceInvite.expiresAt} IS NULL OR ${schema.workspaceInvite.expiresAt} > NOW())`,
        sql`(${schema.workspaceInvite.maxUses} IS NULL OR ${schema.workspaceInvite.uses} < ${schema.workspaceInvite.maxUses})`
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
  const workspace = c.var.workspace
  const actor = c.var.member
  const { code } = c.req.valid("param")

  const invite = await db
    .select()
    .from(schema.workspaceInvite)
    .where(
      and(
        eq(schema.workspaceInvite.workspaceId, workspace.id),
        eq(schema.workspaceInvite.code, code)
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
    assertWorkspacePermission(actor, workspace, {
      workspaceMember: ["kick"],
    })
  }

  await db
    .delete(schema.workspaceInvite)
    .where(eq(schema.workspaceInvite.id, invite.id))

  return c.json({ success: true as const }, HttpStatusCodes.OK)
}

// ── Public Handlers (session-only) ───────────────────────

export const previewInvite: AppRouteHandler<PreviewInviteRoute> = async (c) => {
  const user = c.var.user
  const { code } = c.req.valid("param")

  const invite = await db
    .select({
      code: schema.workspaceInvite.code,
      workspaceId: schema.workspaceInvite.workspaceId,
      channelId: schema.workspaceInvite.channelId,
      maxUses: schema.workspaceInvite.maxUses,
      uses: schema.workspaceInvite.uses,
      expiresAt: schema.workspaceInvite.expiresAt,
      workspaceName: schema.workspace.name,
      workspaceSlug: schema.workspace.slug,
      workspaceLogo: schema.workspace.logo,
      inviterName: schema.user.name,
      inviterUsername: schema.user.username,
      inviterImage: schema.user.image,
    })
    .from(schema.workspaceInvite)
    .innerJoin(
      schema.workspace,
      eq(schema.workspaceInvite.workspaceId, schema.workspace.id)
    )
    .innerJoin(
      schema.user,
      eq(schema.workspaceInvite.inviterId, schema.user.id)
    )
    .where(eq(schema.workspaceInvite.code, code))
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
    .from(schema.workspaceMember)
    .where(eq(schema.workspaceMember.workspaceId, invite.workspaceId))
    .then((rows) => rows[0])

  // Check if user is already a member
  const existingMember = await db
    .select({ id: schema.workspaceMember.id })
    .from(schema.workspaceMember)
    .where(
      and(
        eq(schema.workspaceMember.workspaceId, invite.workspaceId),
        eq(schema.workspaceMember.userId, user.id)
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
        workspace: {
          name: invite.workspaceName,
          slug: invite.workspaceSlug,
          logo: invite.workspaceLogo,
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
    .from(schema.workspaceInvite)
    .where(eq(schema.workspaceInvite.code, code))
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

  // Join the workspace in a transaction with race-condition protection
  const result = await db.transaction(async (tx) => {
    // Check if already a member (inside transaction)
    const existingMember = await tx
      .select({ id: schema.workspaceMember.id })
      .from(schema.workspaceMember)
      .where(
        and(
          eq(schema.workspaceMember.workspaceId, invite.workspaceId),
          eq(schema.workspaceMember.userId, user.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (existingMember) {
      const workspace = await tx
        .select({
          id: schema.workspace.id,
          name: schema.workspace.name,
          slug: schema.workspace.slug,
        })
        .from(schema.workspace)
        .where(eq(schema.workspace.id, invite.workspaceId))
        .limit(1)
        .then((rows) => rows[0])
      return { alreadyMember: true as const, workspace }
    }

    // Atomically increment uses only if under the limit
    const updated = await tx
      .update(schema.workspaceInvite)
      .set({ uses: sql`${schema.workspaceInvite.uses} + 1` })
      .where(
        and(
          eq(schema.workspaceInvite.id, invite.id),
          sql`(${schema.workspaceInvite.maxUses} IS NULL OR ${schema.workspaceInvite.uses} < ${schema.workspaceInvite.maxUses})`
        )
      )
      .returning({ id: schema.workspaceInvite.id })

    if (updated.length === 0) {
      return { maxedOut: true as const }
    }

    // Insert membership
    await tx.insert(schema.workspaceMember).values({
      workspaceId: invite.workspaceId,
      userId: user.id,
      role: "member",
      createdAt: new Date(),
    })

    const workspace = await tx
      .select({
        id: schema.workspace.id,
        name: schema.workspace.name,
        slug: schema.workspace.slug,
      })
      .from(schema.workspace)
      .where(eq(schema.workspace.id, invite.workspaceId))
      .limit(1)
      .then((rows) => rows[0])

    return { joined: true as const, workspace }
  })

  if ("maxedOut" in result) {
    return c.json(
      { success: false, message: "This invite has reached its maximum uses" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  const workspaceRecord = result.workspace

  if (!workspaceRecord) {
    return c.json(
      { success: false, message: "Workspace not found" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(
    {
      success: true as const,
      workspace: {
        id: workspaceRecord.id,
        name: workspaceRecord.name,
        slug: workspaceRecord.slug,
      },
    },
    HttpStatusCodes.OK
  )
}
