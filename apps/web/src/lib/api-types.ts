import type { Client, InferResponseType } from "@repo/api-client"

// ── Channels ──────────────────────────────────────────

type ChannelsClient = Client["v1"]["guilds"][":guildSlug"]["channels"]

export type ListChannelsResponse = InferResponseType<
  ChannelsClient["$get"],
  200
>
export type Channel = ListChannelsResponse["uncategorized"][number]
export type CategoryWithChannels = ListChannelsResponse["categories"][number]

type ChannelClient =
  Client["v1"]["guilds"][":guildSlug"]["channels"][":channelId"]

export type GetChannelResponse = InferResponseType<ChannelClient["$get"], 200>

// ── Messages ──────────────────────────────────────────

type MessagesClient =
  Client["v1"]["guilds"][":guildSlug"]["channels"][":channelId"]["messages"]

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

// ── Guild Members ──────────────────────────────────────────

type GuildMembersClient = Client["v1"]["guilds"][":guildSlug"]["members"]

export type ListGuildMembersResponse = InferResponseType<
  GuildMembersClient["$get"],
  200
>
export type GuildMemberPresence = ListGuildMembersResponse["members"][number]
