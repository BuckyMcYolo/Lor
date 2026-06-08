import { relations } from "drizzle-orm"
import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core"
import { workspace } from "./workspaces"

// Merlin's brain: a filesystem tree (parent_id) and a typed graph (brain_edge)
// over the same page nodes. Tree = where a page lives; edges = what it relates
// to. See reference/merlin-mvp-spec.md §5.

export const brainNodeKindEnum = pgEnum("brain_node_kind", ["folder", "page"])
export const brainNodeStatusEnum = pgEnum("brain_node_status", [
  "active",
  "archived",
])

export const brainNode = pgTable(
  "brain_node",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    kind: brainNodeKindEnum("kind").notNull(),
    // null parent = top-level node
    parentId: uuid("parent_id").references((): AnyPgColumn => brainNode.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    // page-only payload (null on folders)
    body: text("body"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    // text-embedding-3-small; null until embedded. cosine ops.
    embedding: vector("embedding", { dimensions: 1536 }),
    // decay = archive, never delete; version bumps on body update
    status: brainNodeStatusEnum("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // unique siblings; NULLS NOT DISTINCT so top-level names can't collide.
    // backing index also serves ls() on (workspace_id, parent_id).
    unique("brain_node_parent_name_uq")
      .on(table.workspaceId, table.parentId, table.name)
      .nullsNotDistinct(),
    index("brain_node_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
)

// Typed edges between pages. `type` is free text (taxonomy-as-data):
// supersedes | relates_to | caused_by | decided_in | …
export const brainEdge = pgTable(
  "brain_edge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    fromNodeId: uuid("from_node_id")
      .notNull()
      .references(() => brainNode.id, { onDelete: "cascade" }),
    toNodeId: uuid("to_node_id")
      .notNull()
      .references(() => brainNode.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("brain_edge_from_to_type_uidx").on(
      table.fromNodeId,
      table.toNodeId,
      table.type
    ),
    index("brain_edge_workspace_from_idx").on(
      table.workspaceId,
      table.fromNodeId
    ),
    index("brain_edge_workspace_to_idx").on(table.workspaceId, table.toNodeId),
  ]
)

export const brainNodeRelations = relations(brainNode, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [brainNode.workspaceId],
    references: [workspace.id],
  }),
  parent: one(brainNode, {
    fields: [brainNode.parentId],
    references: [brainNode.id],
    relationName: "brainNodeParent",
  }),
  children: many(brainNode, { relationName: "brainNodeParent" }),
  outgoingEdges: many(brainEdge, { relationName: "brainEdgeFrom" }),
  incomingEdges: many(brainEdge, { relationName: "brainEdgeTo" }),
}))

export const brainEdgeRelations = relations(brainEdge, ({ one }) => ({
  workspace: one(workspace, {
    fields: [brainEdge.workspaceId],
    references: [workspace.id],
  }),
  fromNode: one(brainNode, {
    fields: [brainEdge.fromNodeId],
    references: [brainNode.id],
    relationName: "brainEdgeFrom",
  }),
  toNode: one(brainNode, {
    fields: [brainEdge.toNodeId],
    references: [brainNode.id],
    relationName: "brainEdgeTo",
  }),
}))

export type BrainNode = typeof brainNode.$inferSelect
export type NewBrainNode = typeof brainNode.$inferInsert
export type BrainEdge = typeof brainEdge.$inferSelect
export type NewBrainEdge = typeof brainEdge.$inferInsert
