import { auth } from "@repo/auth"
import {
  canManageGuildAuthority,
  type GuildAuthority,
  guildAuthorityHasPermissions,
  isGuildRole,
  type PermissionRequest,
  type statement,
} from "@repo/auth/permissions"
import { HTTPException } from "hono/http-exception"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { Guild, GuildMember } from "@/lib/types/app-types"

// ── Type-Safe Permission Types ──────────────────────────────────────

export type StatementKey = keyof typeof statement

export type PermissionForStatement<T extends StatementKey> =
  (typeof statement)[T][number]

function toGuildAuthority(
  member: Pick<GuildMember, "role" | "userId">,
  guild: Pick<Guild, "ownerId">
): GuildAuthority {
  if (!isGuildRole(member.role)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: `Unknown guild role: ${member.role}`,
    })
  }

  return {
    role: member.role,
    isOwner: guild.ownerId === member.userId,
  }
}

// ── Permission Check ──────────────────────────────────────

/**
 * Checks if the current user has the specified permissions in their active guild.
 * Uses better-auth's hasPermission API.
 *
 * Throws an HTTPException with 403 if the user lacks the required permissions.
 *
 * @example
 * const allowed = await checkPermission(c.req.raw.headers, "channel", ["update"])
 * if (!allowed) throw new HTTPException(403)
 */
export async function checkPermission<
  TResource extends StatementKey,
  TPermissions extends readonly PermissionForStatement<TResource>[],
>(headers: Headers, resource: TResource, permissions: TPermissions) {
  const result = await auth.api.hasPermission({
    headers,
    body: {
      permissions: {
        [resource]: [...permissions],
      },
    },
  })

  if (!result.success) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: `You do not have permission to ${permissions.join("/")} ${resource}`,
    })
  }

  return true
}

export function assertGuildPermission(
  member: Pick<GuildMember, "role" | "userId">,
  guild: Pick<Guild, "ownerId">,
  requestedPermissions: PermissionRequest
) {
  const authority = toGuildAuthority(member, guild)

  if (!guildAuthorityHasPermissions(authority, requestedPermissions)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "You do not have permission to perform this action",
    })
  }

  return authority
}

export function assertCanManageGuildMember(
  actor: Pick<GuildMember, "role" | "userId">,
  target: Pick<GuildMember, "role" | "userId">,
  guild: Pick<Guild, "ownerId">
) {
  if (actor.userId === target.userId) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "You cannot moderate yourself",
    })
  }

  const actorAuthority = toGuildAuthority(actor, guild)
  const targetAuthority = toGuildAuthority(target, guild)

  if (!canManageGuildAuthority(actorAuthority, targetAuthority)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "You cannot moderate this member",
    })
  }

  return {
    actorAuthority,
    targetAuthority,
  }
}

export function isCommunicationDisabled(
  member: Pick<GuildMember, "communicationDisabledUntil">
) {
  if (!member.communicationDisabledUntil) return false
  return member.communicationDisabledUntil.getTime() > Date.now()
}

export function assertMemberCanCommunicate(
  member: Pick<GuildMember, "communicationDisabledUntil">
) {
  if (!isCommunicationDisabled(member)) return

  throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
    message: "You are temporarily timed out and cannot send messages",
  })
}
