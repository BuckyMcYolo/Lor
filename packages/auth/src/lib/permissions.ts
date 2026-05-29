import { createAccessControl } from "better-auth/plugins/access"
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access"

const statement = {
  ...defaultStatements,
  channel: ["create", "update", "delete"],
  message: ["delete", "pin"], // delete/pin others' messages (own messages are always deletable)
  workspaceMember: ["kick", "role:update"],
} as const

const ac = createAccessControl(statement)

const owner = ac.newRole({
  channel: ["create", "update", "delete"],
  message: ["delete", "pin"],
  workspaceMember: ["kick", "role:update"],
  ...ownerAc.statements,
})

const admin = ac.newRole({
  channel: ["create", "update", "delete"],
  message: ["delete", "pin"],
  workspaceMember: ["kick", "role:update"],
  ...adminAc.statements,
})

// Member — basic access only
const member = ac.newRole({
  ...memberAc.statements,
})

const roles = { owner, admin, member }

const workspaceRoleLabels = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
} as const satisfies Record<keyof typeof roles, string>

const workspaceRolePositions = {
  owner: 0,
  admin: 10,
  member: 20,
} as const satisfies Record<keyof typeof roles, number>

const workspaceMessageRateLimitsPerMinute = {
  owner: 120,
  admin: 120,
  member: 30,
} as const satisfies Record<keyof typeof roles, number>

const assignableWorkspaceRoles = [
  "admin",
  "member",
] as const satisfies ReadonlyArray<Exclude<keyof typeof roles, "owner">>

export type WorkspaceRole = keyof typeof roles
export type AssignableWorkspaceRole = (typeof assignableWorkspaceRoles)[number]
export type StatementKey = keyof typeof statement
export type PermissionRequest = {
  [K in StatementKey]?: readonly (typeof statement)[K][number][]
}
export type WorkspaceAuthority = {
  role: WorkspaceRole
  isOwner?: boolean
}

export function normalizeWorkspaceAuthority(
  authority: WorkspaceAuthority
): WorkspaceAuthority & { isOwner: boolean } {
  return {
    ...authority,
    isOwner: authority.role === "owner",
  }
}

export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return Object.hasOwn(roles, value)
}

export function formatWorkspaceRole(role: WorkspaceRole) {
  return workspaceRoleLabels[role]
}

export function getWorkspaceRolePosition(role: WorkspaceRole) {
  return workspaceRolePositions[role]
}

export function getWorkspaceAuthorityPosition(authority: WorkspaceAuthority) {
  const normalizedAuthority = normalizeWorkspaceAuthority(authority)
  if (normalizedAuthority.isOwner) return workspaceRolePositions.owner
  return getWorkspaceRolePosition(normalizedAuthority.role)
}

export function canManageWorkspaceAuthority(
  actor: WorkspaceAuthority,
  target: WorkspaceAuthority
) {
  const normalizedActor = normalizeWorkspaceAuthority(actor)
  const normalizedTarget = normalizeWorkspaceAuthority(target)

  if (normalizedTarget.isOwner) {
    return normalizedActor.isOwner
  }

  return (
    getWorkspaceAuthorityPosition(normalizedActor) <
    getWorkspaceAuthorityPosition(normalizedTarget)
  )
}

export function roleHasPermissions(
  role: WorkspaceRole,
  requestedPermissions: PermissionRequest
) {
  const grantedStatements = roles[role].statements as Record<
    string,
    readonly string[] | undefined
  >

  for (const [resource, actions] of Object.entries(requestedPermissions)) {
    if (!actions || actions.length === 0) continue

    const grantedActions = grantedStatements[resource] ?? []
    const grantedActionSet = new Set(grantedActions)

    for (const action of actions) {
      if (!grantedActionSet.has(action)) {
        return false
      }
    }
  }

  return true
}

export function workspaceAuthorityHasPermissions(
  authority: WorkspaceAuthority,
  requestedPermissions: PermissionRequest
) {
  const normalizedAuthority = normalizeWorkspaceAuthority(authority)
  if (normalizedAuthority.isOwner) return true
  return roleHasPermissions(normalizedAuthority.role, requestedPermissions)
}

export function getWorkspaceMessageRateLimit(role: WorkspaceRole) {
  return workspaceMessageRateLimitsPerMinute[role]
}

export {
  ac,
  admin,
  assignableWorkspaceRoles,
  member,
  owner,
  roles,
  statement,
  workspaceMessageRateLimitsPerMinute,
  workspaceRoleLabels,
  workspaceRolePositions,
}
