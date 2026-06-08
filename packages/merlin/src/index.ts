import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"

// Sonnet drives the main loop; Opus is reserved for hard cases later.
export const MERLIN_MODEL = "claude-sonnet-4-6"

const SYSTEM_PROMPT = `You are Merlin, the knowledge keeper for this team's Lor workspace. You help the team by answering questions about their work, decisions, and history.

Guidelines:
- For questions about THIS workspace, ground your answer in what has actually been said in the conversation. If it isn't there, say you don't have it in memory yet rather than guessing.
- For general questions (how-to, definitions, quick help), answer directly and helpfully.
- Be concise. Use Markdown. Speak in the first person; never claim to be human.`

export type ConversationTurn = {
  authorName: string
  content: string
}

export type RespondCallbacks = {
  onDelta: (delta: string) => void | Promise<void>
}

// First cut: no tools. Merlin answers from the recent conversation only.
// `onDelta` fires per streamed chunk; the full text is returned at the end.
export async function respond(
  conversation: ConversationTurn[],
  { onDelta }: RespondCallbacks
): Promise<{ text: string }> {
  const transcript = conversation
    .map((t) => `${t.authorName}: ${t.content}`)
    .join("\n")

  const result = streamText({
    model: anthropic(MERLIN_MODEL),
    system: SYSTEM_PROMPT,
    prompt: `Recent conversation:\n\n${transcript}\n\n---\nRespond to the most recent message.`,
  })

  let text = ""
  for await (const delta of result.textStream) {
    text += delta
    await onDelta(delta)
  }
  return { text }
}
