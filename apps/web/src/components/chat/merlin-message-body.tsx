import { useMemo } from "react"
import { MerlinToolTrail } from "@/components/chat/merlin-tool-trail"
import { MessageMarkdown } from "@/components/chat/message-markdown"
import type { MerlinToolCallView, Message } from "@/lib/api-types"

// Interleaves Merlin's answer text with its tool-call groups in the order the
// model produced them, using each call's `at` (a character offset into content).
// Consecutive calls at the same offset (no text between them) form one group.

type Segment =
  | { kind: "text"; key: string; text: string }
  | { kind: "tools"; key: string; tools: MerlinToolCallView[] }

function buildSegments(
  content: string,
  toolCalls: MerlinToolCallView[]
): Segment[] {
  const clamp = (n: number) => Math.min(Math.max(n, 0), content.length)
  // Offset defaults to end-of-text for calls without `at` (older messages), so
  // they fall after the answer rather than corrupting the split.
  const withAt = toolCalls
    .map((t) => ({ t, at: clamp(t.at ?? content.length) }))
    .sort((a, b) => a.at - b.at)

  const segments: Segment[] = []
  let cursor = 0
  let i = 0
  while (i < withAt.length) {
    const head = withAt[i]
    if (!head) break
    const at = head.at
    if (at > cursor) {
      segments.push({
        kind: "text",
        key: `text:${cursor}`,
        text: content.slice(cursor, at),
      })
      cursor = at
    }
    const tools: MerlinToolCallView[] = []
    let peek = withAt[i]
    while (peek && peek.at === at) {
      tools.push(peek.t)
      i += 1
      peek = withAt[i]
    }
    segments.push({
      kind: "tools",
      key: `tools:${tools[0]?.toolCallId ?? cursor}`,
      tools,
    })
  }
  if (cursor < content.length) {
    segments.push({
      kind: "text",
      key: `text:${cursor}`,
      text: content.slice(cursor),
    })
  }
  return segments
}

export function MerlinMessageBody({
  content,
  toolCalls,
  streaming,
  mentions,
  onCitationJump,
}: {
  content: string | null
  toolCalls: MerlinToolCallView[]
  streaming?: boolean
  mentions: Message["mentions"]
  onCitationJump?: (messageId: string) => void
}) {
  const segments = useMemo(
    () => buildSegments(content ?? "", toolCalls),
    [content, toolCalls]
  )

  return (
    <>
      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1
        if (seg.kind === "text") {
          return (
            <MessageMarkdown
              key={seg.key}
              content={seg.text}
              mentions={mentions}
              onCitationJump={onCitationJump}
            />
          )
        }
        return (
          <MerlinToolTrail
            key={seg.key}
            toolCalls={seg.tools}
            // Only the trailing group is "live" — earlier groups already settled.
            streaming={streaming && isLast}
          />
        )
      })}
    </>
  )
}
