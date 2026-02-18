/**
 * Seed DM conversations for a user.
 *
 * Usage:
 *   pnpm --filter @repo/api exec tsx scripts/seed-dms.ts <user-id>
 */

import { db } from "@repo/db"
import { channel, channelMember, message, user } from "@repo/db/schema"
import { eq, inArray } from "drizzle-orm"

const userId = process.argv[2]
if (!userId) {
  console.error(
    "Usage: pnpm --filter @repo/api exec tsx scripts/seed-dms.ts <user-id>"
  )
  process.exit(1)
}

const fakeUsers = [
  { name: "Alice Chen", username: "alice", email: "alice@fake.local" },
  { name: "Bob Martinez", username: "bobm", email: "bob@fake.local" },
  { name: "Charlie Kim", username: "charliek", email: "charlie@fake.local" },
  { name: "Dana Patel", username: "danap", email: "dana@fake.local" },
  { name: "Eli Thompson", username: "elit", email: "eli@fake.local" },
  { name: "Fay Nakamura", username: "fayn", email: "fay@fake.local" },
  { name: "Gus Rivera", username: "gusr", email: "gus@fake.local" },
  { name: "Hana Okonkwo", username: "hanao", email: "hana@fake.local" },
]

const lastMessages = [
  "Hey, are you free to chat?",
  "Thanks for the help earlier!",
  "Did you see the new update?",
  "Let me know when you're online",
  "lol that was hilarious",
  "Sure, I'll send it over tomorrow",
  "Can you review my PR when you get a chance?",
  "GG, that was a close one",
]

const groupDms = [
  {
    name: "Weekend Plans",
    members: ["alice", "bobm", "charliek"],
    messages: [
      { from: "alice", content: "Anyone free Saturday?" },
      { from: "bobm", content: "I'm down, what are you thinking?" },
      { from: "charliek", content: "Same, let me know the plan" },
    ],
  },
  {
    name: "Dev Team",
    members: ["danap", "elit", "fayn", "gusr"],
    messages: [
      { from: "gusr", content: "standup in 5" },
      { from: "elit", content: "be there" },
      { from: "fayn", content: "omw" },
      { from: "danap", content: "👍" },
    ],
  },
  {
    name: "Book Club",
    members: ["hanao", "alice", "danap"],
    messages: [
      { from: "hanao", content: "finished chapter 12, no spoilers please!" },
      { from: "alice", content: "same, that ending tho" },
      { from: "danap", content: "meeting Thursday still?" },
    ],
  },
  {
    name: "Game Night",
    members: ["bobm", "charliek", "elit", "gusr", "fayn"],
    messages: [
      { from: "charliek", content: "who's playing tonight?" },
      { from: "bobm", content: "in" },
      { from: "elit", content: "🎮 let's go" },
      { from: "gusr", content: "starting at 9?" },
      { from: "fayn", content: "works for me" },
    ],
  },
]

async function seed() {
  // Verify the target user exists
  const [targetUser] = await db.select().from(user).where(eq(user.id, userId))
  if (!targetUser) {
    console.error(`User ${userId} not found`)
    process.exit(1)
  }
  console.log(`Seeding DMs for ${targetUser.name} (${targetUser.email})\n`)

  // Clean up previous seed data
  const existingFake = await db
    .select({ id: user.id })
    .from(user)
    .where(
      inArray(
        user.email,
        fakeUsers.map((u) => u.email)
      )
    )
  if (existingFake.length > 0) {
    const fakeIds = existingFake.map((u) => u.id)
    // Deleting users cascades to channel_member and messages
    await db.delete(user).where(inArray(user.id, fakeIds))
    // Clean up orphaned DM channels with no members
    const orphaned = await db
      .select({ id: channel.id })
      .from(channel)
      .where(eq(channel.type, "dm"))
    for (const ch of orphaned) {
      const members = await db
        .select({ id: channelMember.id })
        .from(channelMember)
        .where(eq(channelMember.channelId, ch.id))
      if (members.length === 0) {
        await db.delete(channel).where(eq(channel.id, ch.id))
      }
    }
    console.log("Cleared previous seed data")
  }

  // Create fake users and DM channels
  for (let i = 0; i < fakeUsers.length; i++) {
    const fake = fakeUsers[i]

    const [fakeUser] = await db
      .insert(user)
      .values({
        name: fake.name,
        email: fake.email,
        username: fake.username,
        displayUsername: fake.username,
        emailVerified: true,
      })
      .returning()

    // Create DM channel
    const [dmChannel] = await db
      .insert(channel)
      .values({
        type: "dm",
        guildId: null,
        position: 0,
      })
      .returning()

    // Add both users as members
    await db.insert(channelMember).values([
      { channelId: dmChannel.id, userId },
      { channelId: dmChannel.id, userId: fakeUser.id },
    ])

    // Add a last message from the fake user
    const minutesAgo = (fakeUsers.length - i) * 15
    const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000)
    await db.insert(message).values({
      channelId: dmChannel.id,
      authorId: fakeUser.id,
      content: lastMessages[i],
      type: "default",
      createdAt,
    })

    // Update channel updatedAt to match message time for correct sort order
    await db
      .update(channel)
      .set({ updatedAt: createdAt })
      .where(eq(channel.id, dmChannel.id))

    console.log(`  ${fake.name} (@${fake.username}): "${lastMessages[i]}"`)
  }

  console.log(`\nCreated ${fakeUsers.length} DM conversations`)

  // Build a map of username → user id for group DM membership
  const seededUsers = await db
    .select({ id: user.id, username: user.username })
    .from(user)
    .where(
      inArray(
        user.username,
        fakeUsers.map((u) => u.username)
      )
    )
  const usernameToId = Object.fromEntries(
    seededUsers.map((u) => [u.username, u.id])
  )

  // Create group DMs
  for (let i = 0; i < groupDms.length; i++) {
    const group = groupDms[i]
    const minutesAgo = (groupDms.length - i) * 30 + fakeUsers.length * 15

    const [dmChannel] = await db
      .insert(channel)
      .values({
        type: "group_dm",
        name: group.name,
        guildId: null,
        ownerId: userId,
        position: 0,
      })
      .returning()

    // Add the target user + all named members
    const memberIds = [
      userId,
      ...group.members
        .map((username) => usernameToId[username])
        .filter(Boolean),
    ]
    await db.insert(channelMember).values(
      memberIds.map((memberId) => ({
        channelId: dmChannel.id,
        userId: memberId,
      }))
    )

    // Insert messages with staggered timestamps
    for (let j = 0; j < group.messages.length; j++) {
      const msg = group.messages[j]
      const authorId = usernameToId[msg.from]
      if (!authorId) continue
      const msgTime = new Date(
        Date.now() - minutesAgo * 60 * 1000 + j * 2 * 60 * 1000
      )
      await db.insert(message).values({
        channelId: dmChannel.id,
        authorId,
        content: msg.content,
        type: "default",
        createdAt: msgTime,
      })
    }

    // Set channel updatedAt to last message time
    const lastMsgTime = new Date(
      Date.now() -
        minutesAgo * 60 * 1000 +
        (group.messages.length - 1) * 2 * 60 * 1000
    )
    await db
      .update(channel)
      .set({ updatedAt: lastMsgTime })
      .where(eq(channel.id, dmChannel.id))

    console.log(
      `  Group "${group.name}" (${memberIds.length} members): "${group.messages[group.messages.length - 1].content}"`
    )
  }

  console.log(`\nCreated ${groupDms.length} group DM conversations`)
  process.exit(0)
}

seed()
