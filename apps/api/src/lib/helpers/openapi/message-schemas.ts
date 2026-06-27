import { z } from "@hono/zod-openapi"
import { selectMessageSchema } from "@repo/db/schema"

export const messageAuthorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
})

export const messageReactionSchema = z.object({
  emoji: z.string(),
  count: z.number().int().nonnegative(),
  reactedByCurrentUser: z.boolean(),
  reactors: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    })
  ),
})

const httpsUrlSchema = z.string().regex(/^https?:\/\//i)

export const messageEmbedSchema = z.object({
  type: z.enum(["link", "image", "video", "rich"]),
  url: httpsUrlSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  thumbnail: httpsUrlSchema.optional(),
  siteName: z.string().optional(),
})

export const merlinToolCallSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  label: z.string(),
  at: z.number().optional(),
  detail: z
    .object({
      summary: z.string().optional(),
      items: z
        .array(z.object({ title: z.string(), url: z.string().optional() }))
        .optional(),
    })
    .optional(),
  status: z.enum(["ok", "error"]).optional(),
})

export const referencedMessageSchema = z
  .object({
    id: z.string().uuid(),
    content: z.string().nullable(),
    author: messageAuthorSchema,
  })
  .nullable()

export const threadParticipantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
})

export const threadSummarySchema = z
  .object({
    replyCount: z.number().int().nonnegative(),
    lastReplyAt: z.string(),
    participants: z.array(threadParticipantSchema),
  })
  .nullable()

export const messageWithAuthorSchema = selectMessageSchema.extend({
  author: messageAuthorSchema,
  mentions: z.array(messageAuthorSchema),
  reactions: z.array(messageReactionSchema),
  embeds: z.array(messageEmbedSchema),
  referencedMessage: referencedMessageSchema,
  threadSummary: threadSummarySchema,
  // Only Merlin replies carry these; optional so other message endpoints
  // (DMs, pinned, …) need not supply them.
  merlinToolCalls: z.array(merlinToolCallSchema).optional(),
})

// Cursor-based query: `around`, `before`, `after` are mutually exclusive
// message ids. With none, the latest page is returned.
export const listMessagesQuerySchema = z
  .object({
    around: z.string().uuid().optional(),
    before: z.string().uuid().optional(),
    after: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .superRefine((value, ctx) => {
    const cursors = [value.around, value.before, value.after].filter(
      (v) => v !== undefined
    )
    if (cursors.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "`around`, `before`, and `after` are mutually exclusive — provide at most one",
        path: ["around"],
      })
    }
  })

export const listMessagesResponseSchema = z.object({
  data: z.array(messageWithAuthorSchema),
  beforeCursor: z.string().uuid().nullable(),
  afterCursor: z.string().uuid().nullable(),
  reachedOldest: z.boolean(),
  reachedNewest: z.boolean(),
})
