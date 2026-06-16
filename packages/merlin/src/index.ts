import { anthropic } from "@ai-sdk/anthropic"
import { and, asc, db, eq, or, schema, sql } from "@repo/db"
import { stepCountIs, streamText, tool } from "ai"
import { z } from "zod"

// Sonnet drives the main loop; Opus is reserved for hard cases later.
export const MERLIN_MODEL = "claude-sonnet-4-6"

// Cap the tool-use loop. Each step is one model turn (tool calls or final text).
const MAX_STEPS = 8
const SEARCH_DEFAULT_LIMIT = 8
const SNIPPET_MAX = 500
const THREAD_MAX = 100

const SYSTEM_PROMPT = `You are Merlin, the knowledge keeper for this team's Lor workspace. You answer questions about the team's work, decisions, history, and people.

You have tools to search the team's message history:
- search_messages: keyword search across all channels. Call it (often several times, with different keywords) to find what was actually said.
- read_thread: read the full thread around a message you found.

How to answer:
- For questions about THIS team/workspace, ground your answer in what you find with the tools. Note who said it and roughly when. If your searches turn up nothing relevant, say you don't have it in memory yet — never invent specifics.
- For general questions (how-to, definitions, quick help), just answer directly; no search needed.
- Use your tools silently — don't narrate that you're searching. Gather what you need, then give one clear answer.
- Be concise. Use Markdown. Speak in the first person; never claim to be human.`

export type ConversationTurn = {
  authorName: string
  content: string
}

export type RespondContext = {
  // Merlin only runs in workspace channels; search is workspace-scoped.
  workspaceId: string
  conversation: ConversationTurn[]
}

export type RespondCallbacks = {
  onDelta: (delta: string) => void | Promise<void>
}

async function searchMessages(
  workspaceId: string,
  query: string,
  limit: number
) {
  const tsv = sql`to_tsvector('english', coalesce(${schema.message.content}, ''))`
  const tsq = sql`websearch_to_tsquery('english', ${query})`

  const rows = await db
    .select({
      messageId: schema.message.id,
      channelId: schema.message.channelId,
      content: schema.message.content,
      createdAt: schema.message.createdAt,
      authorName: schema.user.name,
    })
    .from(schema.message)
    .innerJoin(schema.channel, eq(schema.message.channelId, schema.channel.id))
    .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
    .where(
      and(eq(schema.channel.workspaceId, workspaceId), sql`${tsv} @@ ${tsq}`)
    )
    .orderBy(sql`ts_rank(${tsv}, ${tsq}) desc`)
    .limit(limit)

  return rows.map((r) => ({
    messageId: r.messageId,
    channelId: r.channelId,
    author: r.authorName,
    when: r.createdAt.toISOString(),
    text: (r.content ?? "").slice(0, SNIPPET_MAX),
  }))
}

async function readThread(messageId: string) {
  const msg = await db
    .select({
      id: schema.message.id,
      threadRootId: schema.message.threadRootId,
    })
    .from(schema.message)
    .where(eq(schema.message.id, messageId))
    .limit(1)
    .then((r) => r[0])
  if (!msg) return []

  const rootId = msg.threadRootId ?? msg.id
  const rows = await db
    .select({
      content: schema.message.content,
      createdAt: schema.message.createdAt,
      authorName: schema.user.name,
    })
    .from(schema.message)
    .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
    .where(
      or(eq(schema.message.id, rootId), eq(schema.message.threadRootId, rootId))
    )
    .orderBy(asc(schema.message.createdAt))
    .limit(THREAD_MAX)

  return rows.map((r) => ({
    author: r.authorName,
    when: r.createdAt.toISOString(),
    text: r.content ?? "",
  }))
}

function buildTools(workspaceId: string) {
  return {
    search_messages: tool({
      description:
        "Search the team's message history (all channels) by keyword. Returns matching messages with author, date, channel, and id. Call repeatedly with different keywords to investigate.",
      inputSchema: z.object({
        query: z.string().describe("keywords to search for"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("max results (default 8)"),
      }),
      execute: async ({ query, limit }) => {
        try {
          return await searchMessages(
            workspaceId,
            query,
            limit ?? SEARCH_DEFAULT_LIMIT
          )
        } catch {
          return { error: "search failed" }
        }
      },
      strict: true,
    }),
    read_thread: tool({
      description:
        "Read the full thread (root message + all replies) a message belongs to. Use after search_messages to get full context around a hit.",
      inputSchema: z.object({
        messageId: z.string().describe("a message id from search_messages"),
      }),
      execute: async ({ messageId }) => {
        try {
          return await readThread(messageId)
        } catch {
          return { error: "read failed" }
        }
      },
      strict: true,
    }),
  }
}

// `onDelta` fires per streamed chunk of the final answer; the full text is
// returned at the end. Merlin may call its tools across multiple steps first.
export async function respond(
  ctx: RespondContext,
  { onDelta }: RespondCallbacks
): Promise<{ text: string }> {
  const transcript = ctx.conversation
    .map((t) => `${t.authorName}: ${t.content}`)
    .join("\n")

  const result = streamText({
    model: anthropic(MERLIN_MODEL),
    system: SYSTEM_PROMPT,
    prompt: `Recent conversation in this channel:\n\n${transcript}\n\n---\nAnswer the most recent message. Search the team's history with your tools if you need more than the recent messages above.`,
    tools: buildTools(ctx.workspaceId),
    stopWhen: stepCountIs(MAX_STEPS),
  })

  let text = ""
  for await (const delta of result.textStream) {
    text += delta
    await onDelta(delta)
  }
  return { text }
}
