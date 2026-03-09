const EVERYONE_MENTION_ID = "everyone"

export const TIPTAP_MARKDOWN_MENTION_REGEX = /\[@[^\]]*?\bid="([^"]+)"[^\]]*]/g
export const STORED_MENTION_REGEX =
  /<@([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>/gi

export function toStoredMarkdown(markdown: string) {
  return (
    markdown
      .replace(/\u00A0/g, " ")
      // Strip ++…++ wrappers the Markdown extension generates for unrecognised marks (e.g. Link)
      // TipTap outputs either ++[url](url)++ or ++bareUrl++
      .replace(/\+\+\[([^\]]+)\]\([^)]+\)\+\+/g, "$1")
      .replace(/\+\+([\s\S]+?)\+\+/g, "$1")
      .replace(TIPTAP_MARKDOWN_MENTION_REGEX, (_match, mentionId: string) => {
        if (mentionId.toLowerCase() === EVERYONE_MENTION_ID) {
          return "@everyone"
        }

        return `<@${mentionId}>`
      })
  )
}

export function extractMentionIds(content: string) {
  const mentionIds = new Set<string>()

  for (const match of content.matchAll(STORED_MENTION_REGEX)) {
    const mentionId = match[1]
    if (mentionId) {
      mentionIds.add(mentionId)
    }
  }

  return Array.from(mentionIds)
}
