import { anthropic } from "@ai-sdk/anthropic"
import { and, asc, db, eq, or, schema, sql } from "@repo/db"
import {
  generateObject,
  generateText,
  type ModelMessage,
  stepCountIs,
  streamText,
  tool,
} from "ai"
import { z } from "zod"
import { buildBrainReadTools, buildBrainWriteTools, searchBrain } from "./brain"
import { embedText } from "./embeddings"

// Sonnet drives the main loop; Haiku gates the (cheap) write-back salience check.
export const MERLIN_MODEL = "claude-sonnet-4-6"
const MERLIN_GATE_MODEL = "claude-haiku-4-5"

// Cap the tool-use loop. Each step is one model turn (tool calls or final text).
const MAX_STEPS = 12
const SEARCH_DEFAULT_LIMIT = 8
// Brain pages semantically pre-fetched into the answer prompt.
const PREFETCH_LIMIT = 3
const SNIPPET_MAX = 500
const THREAD_MAX = 100

const SYSTEM_PROMPT = `You are Merlin, the knowledge keeper for this team's Lor workspace. You answer questions about the team's work, decisions, history, and people.

You have two kinds of memory:
- Your brain: a filesystem of notes you've saved about this workspace. Browse it with ls / tree and read pages with read. Consult it first — it's your distilled knowledge (it may be sparse early on). Pages list their linked pages (relates_to, caused_by, …); follow a link with read to traverse.
- The team's message history: search it with search_messages (keyword, all channels) and read_thread for full context.

How to answer:
- For questions about THIS team/workspace, check your brain first, then search the message history for anything it doesn't cover. Ground your answer in what you find; note who said it and roughly when. If nothing turns up, say you don't have it in memory yet — never invent specifics.
- For general questions (how-to, definitions, quick help), just answer directly; no lookup needed.

Use your tools silently — don't narrate that you're searching. Gather what you need, then give one clear answer. Be concise. Use Markdown. Speak in the first person; never claim to be human.`

const GATE_QUESTION = `Does the exchange above contain durable team knowledge worth saving to long-term memory — a decision, how something works, who owns or is responsible for what, a resolved problem, or a lasting fact? Answer false for small talk, transient status, or general/how-to questions.`

const WRITEBACK_INSTRUCTION = `You've just answered. Now step back and act as the keeper of this workspace's long-term memory.

Looking only at what was just discussed and what you found: is there durable knowledge here worth saving — a decision, how something works, who owns or is responsible for what, a resolved problem, or a convention/fact that will matter weeks from now?

- If yes: first browse your brain (ls / tree / read) to find where it belongs and whether a page on this already exists. Strongly prefer updating or extending an existing page over creating a near-duplicate. Then write the page (write creates parent folders automatically), and use link if it clearly relates to another page. Keep pages tight, factual, and self-contained.
- If there's nothing durable here — small talk, transient status, or a general question — do nothing.

Page format — begin every page with a short frontmatter block, then the body:
---
summary: one line on what this page is
aliases: [terms or synonyms someone might search for this by]
---
(the markdown body)

Decide for yourself. Don't reply to the user; just maintain memory. End with one short line of what you saved, or "nothing to save".`

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

export type RespondResult = {
  text: string
  // The answer turn's full message history, for the write-back to continue from.
  messages: ModelMessage[]
}

export type WriteBackContext = {
  workspaceId: string
  priorMessages: ModelMessage[]
  // Compact plain-text exchange for the cheap salience gate (no tool blocks).
  gateText: string
}

export type WriteBackCallbacks = {
  onMemoryWritten?: (e: { path: string; action: "created" | "updated" }) => void
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

async function readThread(workspaceId: string, messageId: string) {
  // Scope by workspace so a stray/hallucinated id can't read another tenant's thread.
  const msg = await db
    .select({
      id: schema.message.id,
      threadRootId: schema.message.threadRootId,
    })
    .from(schema.message)
    .innerJoin(schema.channel, eq(schema.message.channelId, schema.channel.id))
    .where(
      and(
        eq(schema.message.id, messageId),
        eq(schema.channel.workspaceId, workspaceId)
      )
    )
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
    .innerJoin(schema.channel, eq(schema.message.channelId, schema.channel.id))
    .innerJoin(schema.user, eq(schema.message.authorId, schema.user.id))
    .where(
      and(
        eq(schema.channel.workspaceId, workspaceId),
        or(
          eq(schema.message.id, rootId),
          eq(schema.message.threadRootId, rootId)
        )
      )
    )
    .orderBy(asc(schema.message.createdAt))
    .limit(THREAD_MAX)

  return rows.map((r) => ({
    author: r.authorName,
    when: r.createdAt.toISOString(),
    text: r.content ?? "",
  }))
}

function buildChatTools(workspaceId: string) {
  return {
    search_messages: tool({
      description:
        "Search the team's message history (all channels) by keyword. Returns matching messages with author, date, channel, and id. Call repeatedly with different keywords to investigate.",
      inputSchema: z.object({
        query: z.string().describe("keywords to search for"),
        limit: z.number().optional().describe("max results, 1–20 (default 8)"),
      }),
      execute: async ({ query, limit }) => {
        try {
          const n = Math.min(Math.max(limit ?? SEARCH_DEFAULT_LIMIT, 1), 20)
          return await searchMessages(workspaceId, query, n)
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
          return await readThread(workspaceId, messageId)
        } catch {
          return { error: "read failed" }
        }
      },
      strict: true,
    }),
  }
}

// Read-only answer loop. onDelta fires per streamed chunk; the returned
// messages let write-back continue the same conversation.
export async function respond(
  ctx: RespondContext,
  { onDelta }: RespondCallbacks
): Promise<RespondResult> {
  const transcript = ctx.conversation
    .map((t) => `${t.authorName}: ${t.content}`)
    .join("\n")

  // Semantic pre-fetch: seed the top matching brain pages. Best-effort —
  // the brain tools remain the fallback.
  const question = ctx.conversation[ctx.conversation.length - 1]?.content ?? ""
  let brainContext = ""
  if (question.trim()) {
    try {
      const hits = await searchBrain(
        ctx.workspaceId,
        await embedText(question),
        PREFETCH_LIMIT
      )
      if (hits.length > 0) {
        brainContext = `\n\nRelevant notes from your brain:\n\n${hits
          .map((h) => {
            const links = h.links.length
              ? `\nLinked: ${h.links
                  .map(
                    (l) =>
                      `${l.type} ${l.direction === "out" ? "→" : "←"} ${l.path}`
                  )
                  .join("; ")}`
              : ""
            return `## ${h.path}\n${h.body}${links}`
          })
          .join("\n\n")}`
      }
    } catch {
      // best-effort; the brain tools remain as fallback
    }
  }

  const userMessage: ModelMessage = {
    role: "user",
    content: `Recent conversation in this channel:\n\n${transcript}${brainContext}\n\n---\nAnswer the most recent message, grounded in the brain notes and conversation above. Use your tools (brain ls/read, message search) for anything they don't cover.`,
  }

  const result = streamText({
    model: anthropic(MERLIN_MODEL),
    system: SYSTEM_PROMPT,
    messages: [userMessage],
    tools: {
      ...buildChatTools(ctx.workspaceId),
      ...buildBrainReadTools(ctx.workspaceId),
    },
    stopWhen: stepCountIs(MAX_STEPS),
  })

  let text = ""
  for await (const delta of result.textStream) {
    text += delta
    await onDelta(delta)
  }

  const response = await result.response
  return { text, messages: [userMessage, ...response.messages] }
}

// Autonomous write-back: the Haiku gate skips trivial exchanges, then a Sonnet
// agent continues the answer's messages (already knows what it found) and
// persists anything durable to the brain.
export async function writeBack(
  ctx: WriteBackContext,
  { onMemoryWritten }: WriteBackCallbacks
): Promise<void> {
  const gate = await generateObject({
    model: anthropic(MERLIN_GATE_MODEL),
    schema: z.object({ worthSaving: z.boolean() }),
    prompt: `${ctx.gateText}\n\n---\n${GATE_QUESTION}`,
  })
  if (!gate.object.worthSaving) return

  await generateText({
    model: anthropic(MERLIN_MODEL),
    system: SYSTEM_PROMPT,
    messages: [
      ...ctx.priorMessages,
      { role: "user", content: WRITEBACK_INSTRUCTION },
    ],
    tools: {
      ...buildChatTools(ctx.workspaceId),
      ...buildBrainReadTools(ctx.workspaceId),
      ...buildBrainWriteTools(ctx.workspaceId, onMemoryWritten),
    },
    stopWhen: stepCountIs(MAX_STEPS),
  })
}
