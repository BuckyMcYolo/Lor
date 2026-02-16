/**
 * Seed a guild with sample channels.
 *
 * Usage:
 *   pnpm --filter @repo/api exec tsx scripts/seed-channels.ts <guild-id>
 */

import { db } from "@repo/db"
import { channel } from "@repo/db/schema"
import { eq } from "drizzle-orm"

const guildId = process.argv[2]
if (!guildId) {
  console.error(
    "Usage: pnpm --filter @repo/api exec tsx scripts/seed-channels.ts <guild-id>"
  )
  process.exit(1)
}

const categories = [
  {
    name: "General",
    channels: [
      { name: "general", type: "text" as const },
      { name: "introductions", type: "text" as const },
      { name: "off-topic", type: "text" as const },
    ],
  },
  {
    name: "Development",
    channels: [
      { name: "frontend", type: "text" as const },
      { name: "backend", type: "text" as const },
      { name: "devops", type: "text" as const },
      { name: "code-review", type: "text" as const },
    ],
  },
  {
    name: "Community",
    channels: [
      { name: "announcements", type: "announcement" as const },
      { name: "feedback", type: "text" as const },
      { name: "showcase", type: "text" as const },
    ],
  },
  {
    name: "Voice",
    channels: [
      { name: "Lounge", type: "voice" as const },
      { name: "Dev Session", type: "voice" as const },
      { name: "Music", type: "voice" as const },
    ],
  },
]

async function seed() {
  // Clear existing channels for this guild
  await db.delete(channel).where(eq(channel.guildId, guildId))
  console.log(`Cleared existing channels for guild ${guildId}`)

  // Uncategorized channels at the top
  const uncategorized = [
    { name: "welcome", type: "text" as const },
    { name: "rules", type: "text" as const },
  ]

  for (let i = 0; i < uncategorized.length; i++) {
    await db.insert(channel).values({
      name: uncategorized[i].name,
      type: uncategorized[i].type,
      guildId,
      position: i,
    })
    console.log(`  # ${uncategorized[i].name}`)
  }

  // Categories with children
  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const cat = categories[catIdx]
    const [categoryRow] = await db
      .insert(channel)
      .values({
        name: cat.name,
        type: "category",
        guildId,
        position: catIdx,
      })
      .returning()

    console.log(`\n  ${cat.name.toUpperCase()}`)

    for (let chIdx = 0; chIdx < cat.channels.length; chIdx++) {
      const ch = cat.channels[chIdx]
      await db.insert(channel).values({
        name: ch.name,
        type: ch.type,
        guildId,
        parentId: categoryRow.id,
        position: chIdx,
      })
      console.log(`    ${ch.type === "voice" ? "🔊" : "#"} ${ch.name}`)
    }
  }

  console.log("\nDone!")
  process.exit(0)
}

seed()
