export const LINK_UNFURL_QUEUE = "link-unfurl"

export type LinkUnfurlJobData = {
  messageId: string
  channelId: string
  urls: string[]
}

export const MERLIN_RESPOND_QUEUE = "merlin-respond"

// merlinMessageId = the empty placeholder message the worker streams into.
// threadRootId = where the reply is posted (Merlin's chosen placement).
// contextThreadRootId = where the trigger lived (null = main channel); the
// worker reads conversation context from here, which differs from threadRootId
// when Merlin routes a channel mention into a fresh thread.
export type MerlinRespondJobData = {
  merlinMessageId: string
  channelId: string
  threadRootId: string | null
  contextThreadRootId: string | null
  triggerMessageId: string
}
