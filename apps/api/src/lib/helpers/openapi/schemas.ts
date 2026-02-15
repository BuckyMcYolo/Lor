import { z } from "@hono/zod-openapi"
import jsonContent from "./json-content"

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
