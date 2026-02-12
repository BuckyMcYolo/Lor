import { createRoute } from "@hono/zod-openapi"
import jsonContent from "@/lib/helpers/openapi/json-content"
import { internalServerErrorSchema } from "@/lib/helpers/openapi/schemas"
import {
  waitlistErrorSchema,
  waitlistRequestSchema,
  waitlistSuccessSchema,
} from "./schema"

export const createWaitlistEntry = createRoute({
  path: "/waitlist",
  method: "post",
  summary: "Join the waitlist",
  description: "Adds an email address to the Townhall waitlist.",
  tags: ["Waitlist"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: waitlistRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonContent({
      schema: waitlistSuccessSchema,
      description: "Successfully joined waitlist",
    }),
    400: jsonContent({
      schema: waitlistErrorSchema,
      description: "Invalid email",
    }),
    409: jsonContent({
      schema: waitlistErrorSchema,
      description: "Email already exists in waitlist",
    }),
    500: internalServerErrorSchema,
  },
})

export type CreateWaitlistEntryRoute = typeof createWaitlistEntry
