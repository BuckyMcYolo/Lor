export type GuildMembersSidebarView = {
  type: "guild-members"
  guildSlug: string
  channelId: string
}

export type ThreadSidebarView = {
  type: "thread"
  guildSlug: string
  channelId: string
  threadId: string
}

export type AttachmentsSidebarView = {
  type: "attachments"
  guildSlug: string
  channelId: string
}

export type RightSidebarView =
  | GuildMembersSidebarView
  | ThreadSidebarView
  | AttachmentsSidebarView
