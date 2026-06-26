import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { db } from "@repo/db"
import {
  channel,
  channelMember,
  workspace,
  workspaceMember,
} from "@repo/db/schema"
import { env } from "@repo/env/server"
import { and, eq } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { assertWorkspacePermission } from "@/lib/permissions"
import { s3Client } from "@/lib/s3"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  AvatarPresignRoute,
  PresignRoute,
  WorkspaceIconPresignRoute,
} from "@/routes/v1/uploads/routes"
import {
  MAX_AVATAR_SIZE,
  MAX_WORKSPACE_ICON_SIZE,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from "@/routes/v1/uploads/schema"

const DM_CHANNEL_TYPES = ["dm", "group_dm"] as const

export const presign: AppRouteHandler<PresignRoute> = async (c) => {
  const user = c.var.user
  const { channelId, filename, contentType, size } = c.req.valid("json")

  if (size > env.MAX_FILE_UPLOAD_SIZE) {
    return c.json(
      { success: false, message: "File too large" },
      HttpStatusCodes.REQUEST_TOO_LONG
    )
  }

  // Fetch the channel to determine access check strategy
  const ch = await db
    .select({
      id: channel.id,
      workspaceId: channel.workspaceId,
      type: channel.type,
    })
    .from(channel)
    .where(eq(channel.id, channelId))
    .limit(1)
    .then((rows) => rows[0])

  if (!ch) {
    return c.json(
      { success: false, message: "Forbidden" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  // Workspace channel — verify workspace membership
  if (ch.workspaceId) {
    const member = await db
      .select({
        id: workspaceMember.id,
        role: workspaceMember.role,
        userId: workspaceMember.userId,
      })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, ch.workspaceId),
          eq(workspaceMember.userId, user.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (!member) {
      return c.json(
        { success: false, message: "Forbidden" },
        HttpStatusCodes.FORBIDDEN
      )
    }
  } else if (
    DM_CHANNEL_TYPES.includes(ch.type as (typeof DM_CHANNEL_TYPES)[number])
  ) {
    // DM/group DM — verify channel membership
    const member = await db
      .select({ id: channelMember.id })
      .from(channelMember)
      .where(
        and(
          eq(channelMember.channelId, channelId),
          eq(channelMember.userId, user.id)
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (!member) {
      return c.json(
        { success: false, message: "Forbidden" },
        HttpStatusCodes.FORBIDDEN
      )
    }
  } else {
    // Unknown channel type with no workspace — reject
    return c.json(
      { success: false, message: "Forbidden" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  const fileId = crypto.randomUUID()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `attachments/${channelId}/${fileId}/${sanitizedFilename}`

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  })

  const fileUrl = `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`

  return c.json({ uploadUrl, fileUrl, key }, HttpStatusCodes.OK)
}

export const avatarPresign: AppRouteHandler<AvatarPresignRoute> = async (c) => {
  const user = c.var.user
  const { filename, contentType, size } = c.req.valid("json")

  if (size > MAX_AVATAR_SIZE) {
    return c.json(
      { success: false, message: "File too large" },
      HttpStatusCodes.REQUEST_TOO_LONG
    )
  }

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `avatars/${user.id}/${crypto.randomUUID()}/${sanitizedFilename}`

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  })

  const fileUrl = `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`

  return c.json({ uploadUrl, fileUrl }, HttpStatusCodes.OK)
}

export const workspaceIconPresign: AppRouteHandler<
  WorkspaceIconPresignRoute
> = async (c) => {
  const user = c.var.user
  const { workspaceId, filename, contentType, size } = c.req.valid("json")

  if (size > MAX_WORKSPACE_ICON_SIZE) {
    return c.json(
      { success: false, message: "File too large" },
      HttpStatusCodes.REQUEST_TOO_LONG
    )
  }

  // Verify workspace exists and user has update permission
  const workspaceRecord = await db
    .select({ ownerId: workspace.ownerId })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1)
    .then((rows) => rows[0])

  if (!workspaceRecord) {
    return c.json(
      { success: false, message: "Forbidden" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  const member = await db
    .select({ role: workspaceMember.role, userId: workspaceMember.userId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, user.id)
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (!member) {
    return c.json(
      { success: false, message: "Forbidden" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  assertWorkspacePermission(member, workspaceRecord, {
    organization: ["update"],
  })

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `workspace-icons/${workspaceId}/${crypto.randomUUID()}/${sanitizedFilename}`

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  })

  const fileUrl = `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`

  return c.json({ uploadUrl, fileUrl }, HttpStatusCodes.OK)
}
