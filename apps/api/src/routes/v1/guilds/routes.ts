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
  banGuildMemberRequestSchema,
  banGuildMemberResponseSchema,
  guildMemberParamsSchema,
  guildSlugParamsSchema,
  listGuildMembersResponseSchema,
  moderateGuildMemberResponseSchema,
  searchMessagesQuerySchema,
  searchMessagesResponseSchema,
  timeoutGuildMemberRequestSchema,
  timeoutGuildMemberResponseSchema,
  updateGuildMemberRoleRequestSchema,
  updateGuildMemberRoleResponseSchema,
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
    "Removes a member from the guild. Requires member kick permission and sufficient hierarchy.",
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

export const banGuildMember = createRoute({
  path: "/guilds/{guildSlug}/members/{userId}/ban",
  method: "post",
  summary: "Ban a guild member",
  description:
    "Bans a member from the guild and removes their active membership. Requires member ban permission and sufficient hierarchy.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildMemberParamsSchema,
    body: jsonContent({
      schema: banGuildMemberRequestSchema,
      description: "Ban metadata",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: banGuildMemberResponseSchema,
      description: "Member banned",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type BanGuildMemberRoute = typeof banGuildMember

export const timeoutGuildMember = createRoute({
  path: "/guilds/{guildSlug}/members/{userId}/timeout",
  method: "post",
  summary: "Time out a guild member",
  description:
    "Temporarily disables a guild member's ability to communicate. Requires member timeout permission and sufficient hierarchy.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildMemberParamsSchema,
    body: jsonContent({
      schema: timeoutGuildMemberRequestSchema,
      description: "Timeout duration and optional reason",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: timeoutGuildMemberResponseSchema,
      description: "Timed out guild member",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type TimeoutGuildMemberRoute = typeof timeoutGuildMember

export const clearGuildMemberTimeout = createRoute({
  path: "/guilds/{guildSlug}/members/{userId}/timeout",
  method: "delete",
  summary: "Clear a guild member timeout",
  description:
    "Restores a timed out member's ability to communicate. Requires member timeout permission and sufficient hierarchy.",
  tags: ["Guilds"],
  middleware: [guildAuthMiddleware] as const,
  request: {
    params: guildMemberParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: timeoutGuildMemberResponseSchema,
      description: "Updated guild member",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ClearGuildMemberTimeoutRoute = typeof clearGuildMemberTimeout

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
