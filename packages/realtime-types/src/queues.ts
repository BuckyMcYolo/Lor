export const LINK_UNFURL_QUEUE = "link-unfurl"

export type LinkUnfurlJobData = {
  messageId: string
  channelId: string
  content: string
}
