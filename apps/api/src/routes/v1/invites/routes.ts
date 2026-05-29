import { createRoute } from "@hono/zod-openapi"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import jsonContent from "@/lib/helpers/openapi/json-content"
import {
  forbiddenSchema,
  internalServerErrorSchema,
  notFoundSchema,
  unauthorizedSchema,
} from "@/lib/helpers/openapi/schemas"
import { sessionAuthMiddleware } from "@/middleware/session-auth"
import { workspaceAuthMiddleware } from "@/middleware/workspace-auth"
import {
  acceptInviteResponseSchema,
  createInviteRequestSchema,
  createInviteResponseSchema,
  deleteInviteResponseSchema,
  inviteCodeParamsSchema,
  invitePreviewResponseSchema,
  listInvitesResponseSchema,
  workspaceInviteCodeParamsSchema,
  workspaceSlugParamsSchema,
} from "./schema"

// ── Workspace-scoped routes (require workspace membership) ──────

export const createInvite = createRoute({
  path: "/workspaces/{workspaceSlug}/invites",
  method: "post",
  summary: "Create a workspace invite link",
  description:
    "Generates a shareable invite code for the workspace. Any workspace member can create invite links.",
  tags: ["Invites"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
    body: jsonContent({
      schema: createInviteRequestSchema,
      description: "Invite options",
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: createInviteResponseSchema,
      description: "Created invite link",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type CreateInviteRoute = typeof createInvite

export const listInvites = createRoute({
  path: "/workspaces/{workspaceSlug}/invites",
  method: "get",
  summary: "List workspace invite links",
  description:
    "Returns all active invite links for the workspace. Requires admin or higher role.",
  tags: ["Invites"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceSlugParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: listInvitesResponseSchema,
      description: "Active workspace invites",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type ListInvitesRoute = typeof listInvites

export const deleteInvite = createRoute({
  path: "/workspaces/{workspaceSlug}/invites/{code}",
  method: "delete",
  summary: "Revoke a workspace invite link",
  description:
    "Deletes an invite link. Admins+ can delete any invite; members can only delete their own.",
  tags: ["Invites"],
  middleware: [workspaceAuthMiddleware] as const,
  request: {
    params: workspaceInviteCodeParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: deleteInviteResponseSchema,
      description: "Invite revoked",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type DeleteInviteRoute = typeof deleteInvite

// ── Public routes (only require auth session) ──────────

export const previewInvite = createRoute({
  path: "/invites/{code}",
  method: "get",
  summary: "Preview an invite link",
  description:
    "Returns workspace info for an invite code. Used to show a preview before joining.",
  tags: ["Invites"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: inviteCodeParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: invitePreviewResponseSchema,
      description: "Invite preview",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type PreviewInviteRoute = typeof previewInvite

export const acceptInvite = createRoute({
  path: "/invites/{code}/accept",
  method: "post",
  summary: "Accept an invite link",
  description:
    "Joins the workspace associated with the invite code. Checks for bans, expiry, and max uses.",
  tags: ["Invites"],
  middleware: [sessionAuthMiddleware] as const,
  request: {
    params: inviteCodeParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent({
      schema: acceptInviteResponseSchema,
      description: "Successfully joined workspace",
    }),
    [HttpStatusCodes.UNAUTHORIZED]: unauthorizedSchema,
    [HttpStatusCodes.FORBIDDEN]: forbiddenSchema,
    [HttpStatusCodes.NOT_FOUND]: notFoundSchema,
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: internalServerErrorSchema,
  },
})

export type AcceptInviteRoute = typeof acceptInvite
