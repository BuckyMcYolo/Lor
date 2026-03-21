import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { user } from "./users"

export const allyRequestStatusEnum = pgEnum("ally_request_status", [
  "pending",
  "accepted",
  "declined",
])

export const allyRequest = pgTable(
  "ally_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: allyRequestStatusEnum("status").notNull().default("pending"),
  },
  (table) => [
    uniqueIndex("allyRequest_sender_receiver_uidx").on(
      table.senderId,
      table.receiverId
    ),
    index("allyRequest_receiverId_idx").on(table.receiverId),
    index("allyRequest_senderId_idx").on(table.senderId),
    index("allyRequest_status_idx").on(table.status),
  ]
)

export const selectAllyRequestSchema = createSelectSchema(allyRequest)
export const insertAllyRequestSchema = createInsertSchema(allyRequest).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const allyRequestRelations = relations(allyRequest, ({ one }) => ({
  sender: one(user, {
    relationName: "allyRequestSender",
    fields: [allyRequest.senderId],
    references: [user.id],
  }),
  receiver: one(user, {
    relationName: "allyRequestReceiver",
    fields: [allyRequest.receiverId],
    references: [user.id],
  }),
}))
