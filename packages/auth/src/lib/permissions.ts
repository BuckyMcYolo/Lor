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
  message: ["delete"], // delete others' messages (own messages are always deletable)
  guildMember: ["kick", "ban", "timeout", "role:update"],
} as const

const ac = createAccessControl(statement)

const owner = ac.newRole({
  channel: ["create", "update", "delete"],
  message: ["delete"],
  guildMember: ["kick", "ban", "timeout", "role:update"],
  ...ownerAc.statements,
})

const admin = ac.newRole({
  channel: ["create", "update", "delete"],
  message: ["delete"],
  guildMember: ["kick", "ban", "timeout", "role:update"],
  ...adminAc.statements,
})

// Warden (moderator) — can create/update channels and moderate messages/members
const warden = ac.newRole({
  channel: ["create", "update"],
  message: ["delete"],
  guildMember: ["kick", "ban", "timeout"],
  ...memberAc.statements,
})

// Member (citizen) — basic access only, displayed as "Citizen" in UI
const member = ac.newRole({
  ...memberAc.statements,
})

const roles = { owner, admin, warden, member }

const guildRoleLabels = {
  owner: "Owner",
  admin: "Admin",
  warden: "Warden",
  member: "Citizen",
} as const satisfies Record<keyof typeof roles, string>

const guildRolePositions = {
  owner: 0,
  admin: 10,
  warden: 20,
  member: 30,
} as const satisfies Record<keyof typeof roles, number>

const guildMessageRateLimitsPerMinute = {
  owner: 120,
  admin: 120,
  warden: 60,
  member: 30,
} as const satisfies Record<keyof typeof roles, number>

const assignableGuildRoles = [
  "admin",
  "warden",
  "member",
] as const satisfies ReadonlyArray<Exclude<keyof typeof roles, "owner">>

export type GuildRole = keyof typeof roles
export type AssignableGuildRole = (typeof assignableGuildRoles)[number]
export type StatementKey = keyof typeof statement
export type PermissionRequest = {
  [K in StatementKey]?: readonly (typeof statement)[K][number][]
}
export type GuildAuthority = {
  role: GuildRole
  isOwner?: boolean
}

export function normalizeGuildAuthority(
  authority: GuildAuthority
): GuildAuthority & { isOwner: boolean } {
  return {
    ...authority,
    isOwner: authority.role === "owner",
  }
}

export function isGuildRole(value: string): value is GuildRole {
  return Object.hasOwn(roles, value)
}

export function formatGuildRole(role: GuildRole) {
  return guildRoleLabels[role]
}

export function getGuildRolePosition(role: GuildRole) {
  return guildRolePositions[role]
}

export function getGuildAuthorityPosition(authority: GuildAuthority) {
  const normalizedAuthority = normalizeGuildAuthority(authority)
  if (normalizedAuthority.isOwner) return guildRolePositions.owner
  return getGuildRolePosition(normalizedAuthority.role)
}

export function canManageGuildAuthority(
  actor: GuildAuthority,
  target: GuildAuthority
) {
  const normalizedActor = normalizeGuildAuthority(actor)
  const normalizedTarget = normalizeGuildAuthority(target)

  if (normalizedTarget.isOwner) {
    return normalizedActor.isOwner
  }

  return (
    getGuildAuthorityPosition(normalizedActor) <
    getGuildAuthorityPosition(normalizedTarget)
  )
}

export function roleHasPermissions(
  role: GuildRole,
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

export function guildAuthorityHasPermissions(
  authority: GuildAuthority,
  requestedPermissions: PermissionRequest
) {
  const normalizedAuthority = normalizeGuildAuthority(authority)
  if (normalizedAuthority.isOwner) return true
  return roleHasPermissions(normalizedAuthority.role, requestedPermissions)
}

export function getGuildMessageRateLimit(role: GuildRole) {
  return guildMessageRateLimitsPerMinute[role]
}

export {
  ac,
  admin,
  assignableGuildRoles,
  guildMessageRateLimitsPerMinute,
  guildRoleLabels,
  guildRolePositions,
  member,
  owner,
  roles,
  statement,
  warden,
}
