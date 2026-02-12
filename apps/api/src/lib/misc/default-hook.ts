import type { Hook } from "@hono/zod-openapi"
import type { AppBindings } from "@/lib/types/app-types"

// biome-ignore lint/suspicious/noExplicitAny: Hook generics require any for untyped route params
const defaultHook: Hook<any, AppBindings, any, any> = (result, c) => {
  if (!result.success) {
    return c.json(
      {
        success: false,
        error: result.error,
      },
      422
    )
  }
}

export default defaultHook
