import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { workspaceAuthMiddleware } from "@/middleware/workspace-auth"
import {
  listWorkspaceMembersResponseSchema,
  moderateWorkspaceMemberResponseSchema,
  searchMessagesQuerySchema,
  searchMessagesResponseSchema,
  updateWorkspaceMemberRoleRequestSchema,
  updateWorkspaceMemberRoleResponseSchema,
  updateWorkspaceRequestSchema,
  updateWorkspaceResponseSchema,
  workspaceMemberParamsSchema,
  workspaceSlugParamsSchema,
} from "@/routes/v1/workspaces/schema"

export const listWorkspaceMembers = createRoute({
  path: "/workspaces/{workspaceSlug}/members",
  method: "get",
  summary: "List workspace members with presence",
  description:
    "Returns all workspace members and their current online/offline status.",
  tags: ["Workspaces"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listWorkspaceMembersResponseSchema,
      description: "Workspace members with presence status",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListWorkspaceMembersRoute = typeof listWorkspaceMembers

export const updateWorkspaceMemberRole = createRoute({
  path: "/workspaces/{workspaceSlug}/members/{userId}/role",
  method: "patch",
  summary: "Update a workspace member role",
  description:
    "Updates a workspace member's built-in role. Requires member role update permission and sufficient hierarchy.",
  tags: ["Workspaces"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceMemberParamsSchema,
    body: jsonContent({
      schema: updateWorkspaceMemberRoleRequestSchema,
      description: "Updated built-in workspace role",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: updateWorkspaceMemberRoleResponseSchema,
      description: "Updated workspace member",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type UpdateWorkspaceMemberRoleRoute = typeof updateWorkspaceMemberRole

export const kickWorkspaceMember = createRoute({
  path: "/workspaces/{workspaceSlug}/members/{userId}/kick",
  method: "post",
  summary: "Kick a workspace member",
  description:
    "Removes a member from the workspace. Requires admin or owner role; the owner cannot be kicked, and admins cannot kick other admins.",
  tags: ["Workspaces"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceMemberParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: moderateWorkspaceMemberResponseSchema,
      description: "Member kicked",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type KickWorkspaceMemberRoute = typeof kickWorkspaceMember

export const searchMessages = createRoute({
  path: "/workspaces/{workspaceSlug}/search",
  method: "get",
  summary: "Search messages in a workspace",
  description:
    "Searches messages across all channels in a workspace. Optionally filter by channel.",
  tags: ["Workspaces"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
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

export const updateWorkspace = createRoute({
  path: "/workspaces/{workspaceSlug}",
  method: "patch",
  summary: "Update workspace settings",
  description:
    "Updates workspace name and/or logo. Requires admin or owner role.",
  tags: ["Workspaces"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
    body: jsonContent({
      schema: updateWorkspaceRequestSchema,
      description: "Workspace fields to update",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: updateWorkspaceResponseSchema,
      description: "Updated workspace",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type UpdateWorkspaceRoute = typeof updateWorkspace
