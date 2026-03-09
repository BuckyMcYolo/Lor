import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { db } from "@repo/db"
import { channel, channelMember, guildMember } from "@repo/db/schema"
import { env } from "@repo/env/server"
import { and, eq } from "drizzle-orm"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import { s3Client } from "@/lib/s3"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type { PresignRoute } from "./routes"
import { PRESIGNED_URL_EXPIRY_SECONDS } from "./schema"

const DM_CHANNEL_TYPES = ["dm", "group_dm"] as const

export const presign: AppRouteHandler<PresignRoute> = async (c) => {
  const user = c.var.user
  const { channelId, filename, contentType, size } = c.req.valid("json")

  if (size > env.MAX_FILE_UPLOAD_SIZE) {
    return c.json(
      { success: false, message: "File too large" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  // Fetch the channel to determine access check strategy
  const ch = await db
    .select({ id: channel.id, guildId: channel.guildId, type: channel.type })
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

  // Guild channel — verify guild membership
  if (ch.guildId) {
    const member = await db
      .select({ id: guildMember.id })
      .from(guildMember)
      .where(
        and(
          eq(guildMember.guildId, ch.guildId),
          eq(guildMember.userId, user.id)
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
  }

  // DM/group DM — verify channel membership
  if (DM_CHANNEL_TYPES.includes(ch.type as (typeof DM_CHANNEL_TYPES)[number])) {
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
