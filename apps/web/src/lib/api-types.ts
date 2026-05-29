import type { Client, InferResponseType } from "@repo/api-client"

// ── Channels ──────────────────────────────────────────

type ChannelsClient = Client["v1"]["workspaces"][":workspaceSlug"]["channels"]

export type ListChannelsResponse = InferResponseType<
  ChannelsClient["$get"],
  200
>
export type Channel = ListChannelsResponse["uncategorized"][number]
export type CategoryWithChannels = ListChannelsResponse["categories"][number]

type ChannelClient =
  Client["v1"]["workspaces"][":workspaceSlug"]["channels"][":channelId"]

export type GetChannelResponse = InferResponseType<ChannelClient["$get"], 200>

// ── Messages ──────────────────────────────────────────

type MessagesClient =
  Client["v1"]["workspaces"][":workspaceSlug"]["channels"][":channelId"]["messages"]

export type ListMessagesResponse = InferResponseType<
  MessagesClient["$get"],
  200
>
export type Message = ListMessagesResponse["data"][number]
export type MessageAuthor = Message["author"]

// ── DMs ──────────────────────────────────────────

type DMsClient = Client["v1"]["dms"]

export type ListDMsResponse = InferResponseType<DMsClient["$get"], 200>
export type DM = ListDMsResponse["data"][number]
export type DMember = DM["members"][number]

type DMClient = Client["v1"]["dms"][":dmId"]

export type GetDMResponse = InferResponseType<DMClient["$get"], 200>

type DMMessagesClient = Client["v1"]["dms"][":dmId"]["messages"]

export type ListDMMessagesResponse = InferResponseType<
  DMMessagesClient["$get"],
  200
>

// ── Workspace Invites ──────────────────────────────────────────

type WorkspaceInvitesClient =
  Client["v1"]["workspaces"][":workspaceSlug"]["invites"]

export type ListWorkspaceInvitesResponse = InferResponseType<
  WorkspaceInvitesClient["$get"],
  200
>
export type WorkspaceInvite = ListWorkspaceInvitesResponse["invites"][number]

type InvitePreviewClient = Client["v1"]["invites"][":code"]

export type InvitePreviewResponse = InferResponseType<
  InvitePreviewClient["$get"],
  200
>

// ── Users ──────────────────────────────────────────

type UserProfileClient = Client["v1"]["users"][":userId"]

export type GetUserProfileResponse = InferResponseType<
  UserProfileClient["$get"],
  200
>
export type UserProfile = GetUserProfileResponse["user"]

// ── Workspace Members ──────────────────────────────────────────

type WorkspaceMembersClient =
  Client["v1"]["workspaces"][":workspaceSlug"]["members"]

export type ListWorkspaceMembersResponse = InferResponseType<
  WorkspaceMembersClient["$get"],
  200
>
export type WorkspaceMemberPresence =
  ListWorkspaceMembersResponse["members"][number]
