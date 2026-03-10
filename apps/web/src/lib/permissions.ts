import { authClient } from "@repo/auth/client"
import type { GuildRole } from "@repo/auth/permissions"

export function canManageChannels(role: GuildRole): boolean {
  return authClient.organization.checkRolePermission({
    permissions: { channel: ["update"] },
    role,
  })
}

export function canDeleteChannels(role: GuildRole): boolean {
  return authClient.organization.checkRolePermission({
    permissions: { channel: ["delete"] },
    role,
  })
}
