import { z } from "@hono/zod-openapi"
import type { ZodType } from "zod"
import jsonContent from "./json-content"

// ── Pagination ──────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
})

export const paginatedResponseSchema = <T extends ZodType>(itemSchema: T) =>
  z.object({
    itemsTotal: z.number(),
    currentPage: z.number(),
    nextPage: z.number().nullable(),
    prevPage: z.number().nullable(),
    data: z.array(itemSchema),
  })

const errorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
})

export const unauthorizedSchema = jsonContent({
  schema: errorSchema.openapi({
    example: { success: false, message: "Unauthorized" },
  }),
  description: "Unauthorized",
})

export const forbiddenSchema = jsonContent({
  schema: errorSchema.openapi({
    example: { success: false, message: "Forbidden" },
  }),
  description: "Forbidden",
})

export const payloadTooLargeSchema = jsonContent({
  schema: errorSchema.openapi({
    example: { success: false, message: "File too large" },
  }),
  description: "Payload too large",
})

export const notFoundSchema = jsonContent({
  schema: errorSchema.openapi({
    example: { success: false, message: "Not found" },
  }),
  description: "Not found",
})

export const internalServerErrorSchema = jsonContent({
  schema: z
    .object({
      success: z.boolean(),
      message: z.string(),
    })
    .openapi({
      example: {
        success: false,
        message: "Internal server error",
      },
    }),
  description: "Internal server error",
})
