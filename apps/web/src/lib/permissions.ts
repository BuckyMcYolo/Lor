import {
  canManageGuildAuthority,
  formatGuildRole as formatGuildRoleHelper,
  type GuildAuthority,
  guildAuthorityHasPermissions,
  isGuildRole,
  type PermissionRequest,
} from "@repo/auth/permissions"

function toAuthority(
  member: { userId: string; role: string },
  guild: { ownerId: string }
): GuildAuthority | null {
  if (!isGuildRole(member.role)) return null
  return {
    role: member.role,
    isOwner: guild.ownerId === member.userId,
  }
}

export function isOwner(
  member: { userId: string },
  guild: { ownerId: string }
): boolean {
  return member.userId === guild.ownerId
}

export function isAdmin(member: { role: string }): boolean {
  return member.role === "admin"
}

export function isAdminOrOwner(
  member: { userId: string; role: string },
  guild: { ownerId: string }
): boolean {
  return isOwner(member, guild) || isAdmin(member)
}

export function formatGuildRole(role: string): string {
  if (isGuildRole(role)) return formatGuildRoleHelper(role)
  return "Member"
}

function hasPermissions(
  member: { userId: string; role: string },
  guild: { ownerId: string },
  requestedPermissions: PermissionRequest
): boolean {
  const authority = toAuthority(member, guild)
  if (!authority) return false
  return guildAuthorityHasPermissions(authority, requestedPermissions)
}

export function canManageChannels(
  member: { userId: string; role: string },
  guild: { ownerId: string }
): boolean {
  return hasPermissions(member, guild, { channel: ["update"] })
}

export function canCreateChannels(
  member: { userId: string; role: string },
  guild: { ownerId: string }
): boolean {
  return hasPermissions(member, guild, { channel: ["create"] })
}

export function canDeleteChannels(
  member: { userId: string; role: string },
  guild: { ownerId: string }
): boolean {
  return hasPermissions(member, guild, { channel: ["delete"] })
}

export function canPinMessages(
  member: { userId: string; role: string },
  guild: { ownerId: string }
): boolean {
  return hasPermissions(member, guild, { message: ["pin"] })
}

export function canKickGuildMembers(
  member: { userId: string; role: string },
  guild: { ownerId: string }
): boolean {
  return hasPermissions(member, guild, { guildMember: ["kick"] })
}

export function canManageGuildMember(
  actor: { userId: string; role: string },
  target: { userId: string; role: string },
  guild: { ownerId: string }
): boolean {
  if (actor.userId === target.userId) return false
  const actorAuthority = toAuthority(actor, guild)
  const targetAuthority = toAuthority(target, guild)
  if (!actorAuthority || !targetAuthority) return false
  return canManageGuildAuthority(actorAuthority, targetAuthority)
}
