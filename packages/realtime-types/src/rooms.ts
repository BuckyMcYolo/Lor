export function userRoom(userId: string) {
  return `user:${userId}`
}

export function guildRoom(guildId: string) {
  return `guild:${guildId}`
}

export function channelRoom(channelId: string) {
  return `channel:${channelId}`
}
