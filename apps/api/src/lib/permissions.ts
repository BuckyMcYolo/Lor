import { auth } from "@repo/auth"
import {
  canManageWorkspaceAuthority,
  isWorkspaceRole,
  type PermissionRequest,
  type StatementKey,
  type WorkspaceAuthority,
  workspaceAuthorityHasPermissions,
} from "@repo/auth/permissions"
import { HTTPException } from "hono/http-exception"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { Workspace, WorkspaceMember } from "@/lib/types/app-types"

// ── Type-Safe Permission Types ──────────────────────────────────────

export type { StatementKey }

export type PermissionForStatement<T extends StatementKey> = NonNullable<
  PermissionRequest[T]
>[number]

function toWorkspaceAuthority(
  member: Pick<WorkspaceMember, "role" | "userId">,
  workspace: Pick<Workspace, "ownerId">
): WorkspaceAuthority {
  if (!isWorkspaceRole(member.role)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: `Unknown workspace role: ${member.role}`,
    })
  }

  return {
    role: member.role,
    isOwner: workspace.ownerId === member.userId,
  }
}

// ── Permission Check ──────────────────────────────────────

/**
 * Checks if the current user has the specified permissions in their active workspace.
 * Uses better-auth's hasPermission API and throws HTTPException(403) when the
 * requested permission is missing.
 *
 * @example
 * await checkPermission(c.req.raw.headers, "channel", ["update"])
 *
 * // If the permission is missing, checkPermission(...) throws
 * // HTTPException(403) from the internal !result.success branch.
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

export function assertWorkspacePermission(
  member: Pick<WorkspaceMember, "role" | "userId">,
  workspace: Pick<Workspace, "ownerId">,
  requestedPermissions: PermissionRequest
) {
  const authority = toWorkspaceAuthority(member, workspace)

  if (!workspaceAuthorityHasPermissions(authority, requestedPermissions)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "You do not have permission to perform this action",
    })
  }

  return authority
}

export function assertCanManageWorkspaceMember(
  actor: Pick<WorkspaceMember, "role" | "userId">,
  target: Pick<WorkspaceMember, "role" | "userId">,
  workspace: Pick<Workspace, "ownerId">
) {
  if (actor.userId === target.userId) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "You cannot moderate yourself",
    })
  }

  const actorAuthority = toWorkspaceAuthority(actor, workspace)
  const targetAuthority = toWorkspaceAuthority(target, workspace)

  if (!canManageWorkspaceAuthority(actorAuthority, targetAuthority)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "You cannot moderate this member",
    })
  }

  return {
    actorAuthority,
    targetAuthority,
  }
}
