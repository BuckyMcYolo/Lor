import { relations, sql } from "drizzle-orm"
import {
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { user } from "./users"

export const userBlock = pgTable(
  "user_block",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("userBlock_blocker_blocked_uidx").on(
      table.blockerId,
      table.blockedId
    ),
    index("userBlock_blockerId_idx").on(table.blockerId),
    index("userBlock_blockedId_idx").on(table.blockedId),
    check(
      "user_block_no_self_block",
      sql`${table.blockerId} <> ${table.blockedId}`
    ),
  ]
)

export const selectUserBlockSchema = createSelectSchema(userBlock)
export const insertUserBlockSchema = createInsertSchema(userBlock).omit({
  id: true,
  createdAt: true,
})

export const userBlockRelations = relations(userBlock, ({ one }) => ({
  blocker: one(user, {
    relationName: "userBlockBlocker",
    fields: [userBlock.blockerId],
    references: [user.id],
  }),
  blocked: one(user, {
    relationName: "userBlockBlocked",
    fields: [userBlock.blockedId],
    references: [user.id],
  }),
}))
