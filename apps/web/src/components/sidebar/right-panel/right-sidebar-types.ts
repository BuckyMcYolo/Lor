export type WorkspaceMembersSidebarView = {
  type: "workspace-members"
  workspaceSlug: string
  channelId: string
}

export type ThreadSidebarView = {
  type: "thread"
  workspaceSlug: string
  channelId: string
  threadId: string
}

export type AttachmentsSidebarView = {
  type: "attachments"
  workspaceSlug: string
  channelId: string
}

export type PinnedMessagesSidebarView = {
  type: "pinned-messages"
  workspaceSlug: string
  channelId: string
}

export type RightSidebarView =
  | WorkspaceMembersSidebarView
  | ThreadSidebarView
  | AttachmentsSidebarView
  | PinnedMessagesSidebarView
