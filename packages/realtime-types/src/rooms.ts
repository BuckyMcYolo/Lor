export function userRoom(userId: string) {
  return `user:${userId}`
}

export function workspaceRoom(workspaceId: string) {
  return `workspace:${workspaceId}`
}

export function channelRoom(channelId: string) {
  return `channel:${channelId}`
}
