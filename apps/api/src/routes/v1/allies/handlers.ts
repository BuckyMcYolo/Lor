import { and, db, eq, inArray, or, schema } from "@repo/db"
import * as HttpStatusCodes from "@/lib/helpers/http/status-codes"
import type { AppRouteHandler } from "@/lib/types/app-types"
import type {
  AcceptAllyRequestRoute,
  DeclineAllyRequestRoute,
  ListAlliesRoute,
  ListAllyRequestsRoute,
  RemoveAllyRoute,
  SendAllyRequestRoute,
} from "./routes"

// ── Helpers ──────────────────────────────────────────────

function toUserResponse(user: {
  id: string
  name: string
  username: string | null
  displayUsername: string | null
  image: string | null
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    displayUsername: user.displayUsername,
    image: user.image,
  }
}

function toAllyRequestResponse(
  request: {
    id: string
    status: "pending" | "accepted" | "declined"
    createdAt: Date
  },
  sender: {
    id: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
  },
  receiver: {
    id: string
    name: string
    username: string | null
    displayUsername: string | null
    image: string | null
  }
) {
  return {
    id: request.id,
    sender: toUserResponse(sender),
    receiver: toUserResponse(receiver),
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  }
}

// ── Handlers ──────────────────────────────────────────────

export const sendAllyRequest: AppRouteHandler<SendAllyRequestRoute> = async (
  c
) => {
  const currentUser = c.var.user
  const { userId: targetUserId } = c.req.valid("json")

  if (currentUser.id === targetUserId) {
    return c.json(
      { success: false, message: "Cannot send an ally request to yourself" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  // Check target user exists
  const targetUser = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      image: schema.user.image,
    })
    .from(schema.user)
    .where(eq(schema.user.id, targetUserId))
    .limit(1)
    .then((rows) => rows[0])

  if (!targetUser) {
    return c.json(
      { success: false, message: "User not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  // Check if either user has blocked the other
  const blockExists = await db
    .select({ id: schema.userBlock.id })
    .from(schema.userBlock)
    .where(
      or(
        and(
          eq(schema.userBlock.blockerId, currentUser.id),
          eq(schema.userBlock.blockedId, targetUserId)
        ),
        and(
          eq(schema.userBlock.blockerId, targetUserId),
          eq(schema.userBlock.blockedId, currentUser.id)
        )
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (blockExists) {
    return c.json(
      { success: false, message: "Unable to send ally request" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  // Check for existing relationship (in either direction)
  const existing = await db
    .select({
      id: schema.allyRequest.id,
      status: schema.allyRequest.status,
      senderId: schema.allyRequest.senderId,
    })
    .from(schema.allyRequest)
    .where(
      or(
        and(
          eq(schema.allyRequest.senderId, currentUser.id),
          eq(schema.allyRequest.receiverId, targetUserId)
        ),
        and(
          eq(schema.allyRequest.senderId, targetUserId),
          eq(schema.allyRequest.receiverId, currentUser.id)
        )
      )
    )
    .limit(1)
    .then((rows) => rows[0])

  if (existing) {
    if (existing.status === "accepted") {
      return c.json(
        { success: false, message: "You are already allies" },
        HttpStatusCodes.BAD_REQUEST
      )
    }
    if (existing.status === "pending") {
      return c.json(
        { success: false, message: "An ally request already exists" },
        HttpStatusCodes.BAD_REQUEST
      )
    }
    // Status is "declined" — replace atomically to avoid race conditions
    const [request] = await db.transaction(async (tx) => {
      await tx
        .delete(schema.allyRequest)
        .where(eq(schema.allyRequest.id, existing.id))
      return tx
        .insert(schema.allyRequest)
        .values({
          senderId: currentUser.id,
          receiverId: targetUserId,
        })
        .returning()
    })

    if (!request) {
      return c.json(
        { success: false, message: "Failed to create ally request" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      )
    }

    const sender = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        username: schema.user.username,
        displayUsername: schema.user.displayUsername,
        image: schema.user.image,
      })
      .from(schema.user)
      .where(eq(schema.user.id, currentUser.id))
      .limit(1)
      .then((rows) => rows[0])

    if (!sender) {
      return c.json(
        { success: false, message: "Failed to fetch user data" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      )
    }

    return c.json(
      {
        success: true,
        request: toAllyRequestResponse(request, sender, targetUser),
      },
      HttpStatusCodes.OK
    )
  }

  const [request] = await db
    .insert(schema.allyRequest)
    .values({
      senderId: currentUser.id,
      receiverId: targetUserId,
    })
    .returning()

  if (!request) {
    return c.json(
      { success: false, message: "Failed to create ally request" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  const sender = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      image: schema.user.image,
    })
    .from(schema.user)
    .where(eq(schema.user.id, currentUser.id))
    .limit(1)
    .then((rows) => rows[0])

  if (!sender) {
    return c.json(
      { success: false, message: "Failed to fetch user data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(
    {
      success: true,
      request: toAllyRequestResponse(request, sender, targetUser),
    },
    HttpStatusCodes.OK
  )
}

export const listAllyRequests: AppRouteHandler<ListAllyRequestsRoute> = async (
  c
) => {
  const currentUser = c.var.user

  const pendingRequests = await db
    .select({
      id: schema.allyRequest.id,
      senderId: schema.allyRequest.senderId,
      receiverId: schema.allyRequest.receiverId,
      status: schema.allyRequest.status,
      createdAt: schema.allyRequest.createdAt,
      senderName: schema.user.name,
      senderUsername: schema.user.username,
      senderDisplayUsername: schema.user.displayUsername,
      senderImage: schema.user.image,
    })
    .from(schema.allyRequest)
    .innerJoin(schema.user, eq(schema.allyRequest.senderId, schema.user.id))
    .where(
      and(
        eq(schema.allyRequest.status, "pending"),
        or(
          eq(schema.allyRequest.senderId, currentUser.id),
          eq(schema.allyRequest.receiverId, currentUser.id)
        )
      )
    )

  // We need receiver info too — fetch separately for the user IDs we need
  const receiverIds = [
    ...new Set(pendingRequests.map((r) => r.receiverId)),
  ].filter((id) => id !== currentUser.id)

  const receivers =
    receiverIds.length > 0
      ? await db
          .select({
            id: schema.user.id,
            name: schema.user.name,
            username: schema.user.username,
            displayUsername: schema.user.displayUsername,
            image: schema.user.image,
          })
          .from(schema.user)
          .where(inArray(schema.user.id, receiverIds))
      : []

  const receiverMap = new Map(receivers.map((r) => [r.id, r]))
  const currentUserInfo = {
    id: currentUser.id,
    name: currentUser.name,
    username: currentUser.username ?? null,
    displayUsername: currentUser.displayUsername ?? null,
    image: currentUser.image ?? null,
  }

  const incoming: ReturnType<typeof toAllyRequestResponse>[] = []
  const outgoing: ReturnType<typeof toAllyRequestResponse>[] = []

  for (const row of pendingRequests) {
    const sender = {
      id: row.senderId,
      name: row.senderName,
      username: row.senderUsername,
      displayUsername: row.senderDisplayUsername,
      image: row.senderImage,
    }

    const receiver =
      row.receiverId === currentUser.id
        ? currentUserInfo
        : receiverMap.get(row.receiverId)

    if (!receiver) continue

    const response = toAllyRequestResponse(
      { id: row.id, status: row.status, createdAt: row.createdAt },
      sender,
      receiver
    )

    if (row.receiverId === currentUser.id) {
      incoming.push(response)
    } else {
      outgoing.push(response)
    }
  }

  return c.json({ incoming, outgoing }, HttpStatusCodes.OK)
}

export const acceptAllyRequest: AppRouteHandler<
  AcceptAllyRequestRoute
> = async (c) => {
  const currentUser = c.var.user
  const { requestId } = c.req.valid("param")

  const request = await db
    .select()
    .from(schema.allyRequest)
    .where(eq(schema.allyRequest.id, requestId))
    .limit(1)
    .then((rows) => rows[0])

  if (!request) {
    return c.json(
      { success: false, message: "Ally request not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  if (request.receiverId !== currentUser.id) {
    return c.json(
      { success: false, message: "Forbidden" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  if (request.status !== "pending") {
    return c.json(
      { success: false, message: "Request is no longer pending" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  const [updated] = await db
    .update(schema.allyRequest)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(
      and(
        eq(schema.allyRequest.id, requestId),
        eq(schema.allyRequest.receiverId, currentUser.id),
        eq(schema.allyRequest.status, "pending")
      )
    )
    .returning()

  if (!updated) {
    return c.json(
      { success: false, message: "Request is no longer pending" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  // Fetch both users for the response
  const [sender, receiver] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        username: schema.user.username,
        displayUsername: schema.user.displayUsername,
        image: schema.user.image,
      })
      .from(schema.user)
      .where(eq(schema.user.id, updated.senderId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        username: schema.user.username,
        displayUsername: schema.user.displayUsername,
        image: schema.user.image,
      })
      .from(schema.user)
      .where(eq(schema.user.id, updated.receiverId))
      .limit(1)
      .then((rows) => rows[0]),
  ])

  if (!sender || !receiver) {
    return c.json(
      { success: false, message: "Failed to fetch user data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }

  return c.json(
    {
      success: true,
      request: toAllyRequestResponse(updated, sender, receiver),
    },
    HttpStatusCodes.OK
  )
}

export const declineAllyRequest: AppRouteHandler<
  DeclineAllyRequestRoute
> = async (c) => {
  const currentUser = c.var.user
  const { requestId } = c.req.valid("param")

  const request = await db
    .select()
    .from(schema.allyRequest)
    .where(eq(schema.allyRequest.id, requestId))
    .limit(1)
    .then((rows) => rows[0])

  if (!request) {
    return c.json(
      { success: false, message: "Ally request not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  if (request.receiverId !== currentUser.id) {
    return c.json(
      { success: false, message: "Forbidden" },
      HttpStatusCodes.FORBIDDEN
    )
  }

  if (request.status !== "pending") {
    return c.json(
      { success: false, message: "Request is no longer pending" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  const updated = await db
    .update(schema.allyRequest)
    .set({ status: "declined", updatedAt: new Date() })
    .where(
      and(
        eq(schema.allyRequest.id, requestId),
        eq(schema.allyRequest.receiverId, currentUser.id),
        eq(schema.allyRequest.status, "pending")
      )
    )
    .returning()

  if (updated.length === 0) {
    return c.json(
      { success: false, message: "Request is no longer pending" },
      HttpStatusCodes.BAD_REQUEST
    )
  }

  return c.json({ success: true }, HttpStatusCodes.OK)
}

export const listAllies: AppRouteHandler<ListAlliesRoute> = async (c) => {
  const currentUser = c.var.user

  // Get all accepted ally requests where current user is sender or receiver
  const acceptedRequests = await db
    .select({
      senderId: schema.allyRequest.senderId,
      receiverId: schema.allyRequest.receiverId,
    })
    .from(schema.allyRequest)
    .where(
      and(
        eq(schema.allyRequest.status, "accepted"),
        or(
          eq(schema.allyRequest.senderId, currentUser.id),
          eq(schema.allyRequest.receiverId, currentUser.id)
        )
      )
    )

  // Extract the ally user IDs (the other person in each pair)
  const allyIds = acceptedRequests.map((r) =>
    r.senderId === currentUser.id ? r.receiverId : r.senderId
  )

  if (allyIds.length === 0) {
    return c.json({ allies: [] }, HttpStatusCodes.OK)
  }

  const allies = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      username: schema.user.username,
      displayUsername: schema.user.displayUsername,
      image: schema.user.image,
    })
    .from(schema.user)
    .where(inArray(schema.user.id, allyIds))

  return c.json({ allies: allies.map(toUserResponse) }, HttpStatusCodes.OK)
}

export const removeAlly: AppRouteHandler<RemoveAllyRoute> = async (c) => {
  const currentUser = c.var.user
  const { userId: allyUserId } = c.req.valid("param")

  const deleted = await db
    .delete(schema.allyRequest)
    .where(
      and(
        eq(schema.allyRequest.status, "accepted"),
        or(
          and(
            eq(schema.allyRequest.senderId, currentUser.id),
            eq(schema.allyRequest.receiverId, allyUserId)
          ),
          and(
            eq(schema.allyRequest.senderId, allyUserId),
            eq(schema.allyRequest.receiverId, currentUser.id)
          )
        )
      )
    )
    .returning()

  if (deleted.length === 0) {
    return c.json(
      { success: false, message: "Ally relationship not found" },
      HttpStatusCodes.NOT_FOUND
    )
  }

  return c.json({ success: true }, HttpStatusCodes.OK)
}
