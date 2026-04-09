import {
  canManageGuildAuthority,
  formatGuildRole,
  type GuildRole,
  roleHasPermissions,
} from "@repo/auth/permissions"

export function canCreateChannels(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    channel: ["create"],
  })
}

export function canManageChannels(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    channel: ["update"],
  })
}

export function canDeleteChannels(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    channel: ["delete"],
  })
}

export function canUpdateGuildMemberRoles(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    guildMember: ["role:update"],
  })
}

export function canKickGuildMembers(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    guildMember: ["kick"],
  })
}

export function canBanGuildMembers(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    guildMember: ["ban"],
  })
}

export function canTimeoutGuildMembers(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    guildMember: ["timeout"],
  })
}

export function canManageGuildMember(
  actorRole: GuildRole,
  targetRole: GuildRole,
  actorIsOwner = false,
  targetIsOwner = false
) {
  return canManageGuildAuthority(
    { role: actorRole, isOwner: actorIsOwner },
    { role: targetRole, isOwner: targetIsOwner }
  )
}

export function canSendInAnnouncement(role: GuildRole): boolean {
  return roleHasPermissions(role, {
    announcement: ["send"],
  })
}

export { formatGuildRole }
