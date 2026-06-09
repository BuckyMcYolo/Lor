export const LINK_UNFURL_QUEUE = "link-unfurl"

export type LinkUnfurlJobData = {
  messageId: string
  channelId: string
  urls: string[]
}

export const MERLIN_RESPOND_QUEUE = "merlin-respond"

// merlinMessageId = the empty placeholder message the worker streams into.
export type MerlinRespondJobData = {
  merlinMessageId: string
  channelId: string
  threadRootId: string | null
  triggerMessageId: string
}
