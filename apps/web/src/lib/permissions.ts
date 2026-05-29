import {
  canManageWorkspaceAuthority,
  formatWorkspaceRole as formatWorkspaceRoleHelper,
  isWorkspaceRole,
  type PermissionRequest,
  type WorkspaceAuthority,
  workspaceAuthorityHasPermissions,
} from "@repo/auth/permissions"

function toAuthority(
  member: { userId: string; role: string },
  workspace: { ownerId: string }
): WorkspaceAuthority | null {
  if (!isWorkspaceRole(member.role)) return null
  return {
    role: member.role,
    isOwner: workspace.ownerId === member.userId,
  }
}

export function isOwner(
  member: { userId: string },
  workspace: { ownerId: string }
): boolean {
  return member.userId === workspace.ownerId
}

export function isAdmin(member: { role: string }): boolean {
  return member.role === "admin"
}

export function isAdminOrOwner(
  member: { userId: string; role: string },
  workspace: { ownerId: string }
): boolean {
  return isOwner(member, workspace) || isAdmin(member)
}

export function formatWorkspaceRole(role: string): string {
  if (isWorkspaceRole(role)) return formatWorkspaceRoleHelper(role)
  return "Member"
}

function hasPermissions(
  member: { userId: string; role: string },
  workspace: { ownerId: string },
  requestedPermissions: PermissionRequest
): boolean {
  const authority = toAuthority(member, workspace)
  if (!authority) return false
  return workspaceAuthorityHasPermissions(authority, requestedPermissions)
}

export function canManageChannels(
  member: { userId: string; role: string },
  workspace: { ownerId: string }
): boolean {
  return hasPermissions(member, workspace, { channel: ["update"] })
}

export function canCreateChannels(
  member: { userId: string; role: string },
  workspace: { ownerId: string }
): boolean {
  return hasPermissions(member, workspace, { channel: ["create"] })
}

export function canDeleteChannels(
  member: { userId: string; role: string },
  workspace: { ownerId: string }
): boolean {
  return hasPermissions(member, workspace, { channel: ["delete"] })
}

export function canPinMessages(
  member: { userId: string; role: string },
  workspace: { ownerId: string }
): boolean {
  return hasPermissions(member, workspace, { message: ["pin"] })
}

export function canKickWorkspaceMembers(
  member: { userId: string; role: string },
  workspace: { ownerId: string }
): boolean {
  return hasPermissions(member, workspace, { workspaceMember: ["kick"] })
}

export function canManageWorkspaceMember(
  actor: { userId: string; role: string },
  target: { userId: string; role: string },
  workspace: { ownerId: string }
): boolean {
  if (actor.userId === target.userId) return false
  const actorAuthority = toAuthority(actor, workspace)
  const targetAuthority = toAuthority(target, workspace)
  if (!actorAuthority || !targetAuthority) return false
  return canManageWorkspaceAuthority(actorAuthority, targetAuthority)
}
