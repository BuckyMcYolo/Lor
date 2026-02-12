import { z } from "@hono/zod-openapi"

export const waitlistRequestSchema = z.object({
  email: z.string(),
})

export const waitlistSuccessSchema = z.object({
  success: z.literal(true),
})

export const waitlistErrorSchema = z.object({
  error: z.string(),
})
