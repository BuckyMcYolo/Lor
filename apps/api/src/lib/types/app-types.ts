import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi"
import type { Session } from "@repo/auth"
import type { workspace, workspaceMember } from "@repo/db/schema"
import type { Schema } from "hono"
import type { PinoLogger } from "hono-pino"

export type Workspace = typeof workspace.$inferSelect
export type WorkspaceMember = typeof workspaceMember.$inferSelect

export interface AppBindings {
  Variables: {
    logger: PinoLogger
    user: Session["user"]
    session: Session["session"]
    workspace: Workspace
    member: WorkspaceMember
  }
}

export type AppOpenAPI<S extends Schema = Record<string, never>> = OpenAPIHono<
  AppBindings,
  S
>

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<
  R,
  AppBindings
>
