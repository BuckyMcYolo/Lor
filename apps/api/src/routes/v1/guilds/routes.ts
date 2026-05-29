import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { guildAuthMiddleware } from "@/middleware/guild-auth"
import {
  guildMemberParamsSchema,
  guildSlugParamsSchema,
  listGuildMembersResponseSchema,
  moderateGuildMemberResponseSchema,
  searchMessagesQuerySchema,
  searchMessagesResponseSchema,
  updateGuildMemberRoleRequestSchema,
  updateGuildMemberRoleResponseSchema,
  updateGuildRequestSchema,
  updateGuildResponseSchema,
} from "./schema"

export const listGuildMembers = createRoute({
  path: "/guilds/{guildSlug}/members",
  method: "get",
  summary: "List guild members with presence",
  description:
    "Returns all guild members and their current online/offline status.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildSlugParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listGuildMembersResponseSchema,
      description: "Guild members with presence status",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListGuildMembersRoute = typeof listGuildMembers

export const updateGuildMemberRole = createRoute({
  path: "/guilds/{guildSlug}/members/{userId}/role",
  method: "patch",
  summary: "Update a guild member role",
  description:
    "Updates a guild member's built-in role. Requires member role update permission and sufficient hierarchy.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildMemberParamsSchema,
    body: jsonContent({
      schema: updateGuildMemberRoleRequestSchema,
      description: "Updated built-in guild role",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: updateGuildMemberRoleResponseSchema,
      description: "Updated guild member",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type UpdateGuildMemberRoleRoute = typeof updateGuildMemberRole

export const kickGuildMember = createRoute({
  path: "/guilds/{guildSlug}/members/{userId}/kick",
  method: "post",
  summary: "Kick a guild member",
  description:
    "Removes a member from the guild. Requires admin or owner role; the owner cannot be kicked, and admins cannot kick other admins.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildMemberParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: moderateGuildMemberResponseSchema,
      description: "Member kicked",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type KickGuildMemberRoute = typeof kickGuildMember

export const searchMessages = createRoute({
  path: "/guilds/{guildSlug}/search",
  method: "get",
  summary: "Search messages in a guild",
  description:
    "Searches messages across all channels in a guild. Optionally filter by channel.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildSlugParamsSchema,
    query: searchMessagesQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: searchMessagesResponseSchema,
      description: "Search results",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type SearchMessagesRoute = typeof searchMessages

export const updateGuild = createRoute({
  path: "/guilds/{guildSlug}",
  method: "patch",
  summary: "Update guild settings",
  description: "Updates guild name and/or logo. Requires admin or owner role.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildSlugParamsSchema,
    body: jsonContent({
      schema: updateGuildRequestSchema,
      description: "Guild fields to update",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: updateGuildResponseSchema,
      description: "Updated guild",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type UpdateGuildRoute = typeof updateGuild
