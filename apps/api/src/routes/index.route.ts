import { createRoute, z } from "@hono/zod-openapi"
import { createRouter } from "@/lib/helpers/app/create-app"

const healthCheck = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  hide: true,
  responses: {
    200: {
      description: "Server is running",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("ok"),
          }),
        },
      },
    },
  },
})

const router = createRouter().openapi(healthCheck, (c) => {
  return c.json(
    {
      status: "ok",
    },
    200
  )
})

export default router
