import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi"
import type { Session } from "@repo/auth"
import type { guild, guildMember } from "@repo/db/schema"
import type { Schema } from "hono"
import type { PinoLogger } from "hono-pino"

export type Guild = typeof guild.$inferSelect
export type GuildMember = typeof guildMember.$inferSelect

export interface AppBindings {
  Variables: {
    logger: PinoLogger
    user: Session["user"]
    session: Session["session"]
    guild: Guild
    member: GuildMember
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
