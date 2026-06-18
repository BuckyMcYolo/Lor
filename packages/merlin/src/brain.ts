import { and, asc, db, eq, isNull, schema, sql } from "@repo/db"
import { tool } from "ai"
import { z } from "zod"

// Path-addressed access to Merlin's brain (brain_node tree + brain_edge graph).
// Paths look like "/people/alice"; "/" is the workspace root. See
// reference/merlin-mvp-spec.md §5.

const TREE_DEFAULT_DEPTH = 2
const TREE_MAX_DEPTH = 4

type NodeKind = "folder" | "page"
type Resolved = { id: string; kind: NodeKind; name: string }

function segmentsOf(path: string): string[] {
  return path
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// segment-wise: is `a` a prefix of (or equal to) `b`?
function isPrefix(a: string[], b: string[]): boolean {
  return a.length <= b.length && a.every((seg, i) => seg === b[i])
}

async function findChild(
  workspaceId: string,
  parentId: string | null,
  name: string
): Promise<Resolved | null> {
  const row = await db
    .select({ id: schema.brainNode.id, kind: schema.brainNode.kind })
    .from(schema.brainNode)
    .where(
      and(
        eq(schema.brainNode.workspaceId, workspaceId),
        parentId === null
          ? isNull(schema.brainNode.parentId)
          : eq(schema.brainNode.parentId, parentId),
        eq(schema.brainNode.name, name),
        eq(schema.brainNode.status, "active")
      )
    )
    .limit(1)
    .then((r) => r[0])
  return row ? { id: row.id, kind: row.kind, name } : null
}

async function childrenOf(workspaceId: string, parentId: string | null) {
  return db
    .select({
      id: schema.brainNode.id,
      name: schema.brainNode.name,
      kind: schema.brainNode.kind,
    })
    .from(schema.brainNode)
    .where(
      and(
        eq(schema.brainNode.workspaceId, workspaceId),
        parentId === null
          ? isNull(schema.brainNode.parentId)
          : eq(schema.brainNode.parentId, parentId),
        eq(schema.brainNode.status, "active")
      )
    )
    .orderBy(asc(schema.brainNode.kind), asc(schema.brainNode.name))
}

// Resolve a path to a node. "root" for "/"; null if any segment is missing.
async function resolvePath(
  workspaceId: string,
  path: string
): Promise<Resolved | "root" | null> {
  const segments = segmentsOf(path)
  if (segments.length === 0) return "root"
  let parentId: string | null = null
  let node: Resolved | null = null
  for (const name of segments) {
    const child = await findChild(workspaceId, parentId, name)
    if (!child) return null
    node = child
    parentId = child.id
  }
  return node
}

// Create folders for each segment (mkdir -p); returns the last folder's id.
async function ensureFolderPath(
  workspaceId: string,
  segments: string[]
): Promise<string | null> {
  let parentId: string | null = null
  for (const name of segments) {
    let child: Resolved | null = await findChild(workspaceId, parentId, name)
    if (!child) {
      const created: { id: string } | undefined = await db
        .insert(schema.brainNode)
        .values({ workspaceId, kind: "folder", parentId, name })
        .returning({ id: schema.brainNode.id })
        .then((rows) => rows[0])
      if (!created) throw new Error(`failed to create folder "${name}"`)
      child = { id: created.id, kind: "folder", name }
    } else if (child.kind === "page") {
      throw new Error(`"${name}" is a page, not a folder`)
    }
    parentId = child.id
  }
  return parentId
}

export async function ls(workspaceId: string, path: string) {
  const resolved = await resolvePath(workspaceId, path)
  if (resolved === null) return { error: `no such path: ${path}` }
  if (resolved !== "root" && resolved.kind === "page") {
    return { error: `${path} is a page — use brain_read` }
  }
  const parentId = resolved === "root" ? null : resolved.id
  const entries = await childrenOf(workspaceId, parentId)
  return { path, entries: entries.map((e) => ({ name: e.name, kind: e.kind })) }
}

export async function readPage(workspaceId: string, path: string) {
  const resolved = await resolvePath(workspaceId, path)
  if (resolved === null) return { error: `no such path: ${path}` }
  if (resolved === "root" || resolved.kind === "folder") {
    return { error: `${path} is a folder — use brain_ls` }
  }
  const page = await db
    .select({
      body: schema.brainNode.body,
      metadata: schema.brainNode.metadata,
    })
    .from(schema.brainNode)
    .where(eq(schema.brainNode.id, resolved.id))
    .limit(1)
    .then((r) => r[0])
  return { path, body: page?.body ?? "", metadata: page?.metadata ?? {} }
}

type TreeEntry = { name: string; kind: NodeKind; children?: TreeEntry[] }

async function buildTree(
  workspaceId: string,
  parentId: string | null,
  depth: number
): Promise<TreeEntry[]> {
  const kids = await childrenOf(workspaceId, parentId)
  const out: TreeEntry[] = []
  for (const k of kids) {
    const entry: TreeEntry = { name: k.name, kind: k.kind }
    if (k.kind === "folder" && depth > 1) {
      entry.children = await buildTree(workspaceId, k.id, depth - 1)
    }
    out.push(entry)
  }
  return out
}

export async function tree(workspaceId: string, path: string, depth: number) {
  const resolved = await resolvePath(workspaceId, path)
  if (resolved === null) return { error: `no such path: ${path}` }
  if (resolved !== "root" && resolved.kind === "page") {
    return { error: `${path} is a page — use brain_read` }
  }
  const parentId = resolved === "root" ? null : resolved.id
  const clamped = Math.max(1, Math.min(depth, TREE_MAX_DEPTH))
  return { path, tree: await buildTree(workspaceId, parentId, clamped) }
}

export async function writePage(
  workspaceId: string,
  path: string,
  body: string
): Promise<
  { error: string } | { path: string; action: "created" | "updated" }
> {
  const segments = segmentsOf(path)
  if (segments.length === 0) return { error: "cannot write to the root" }
  const leaf = segments[segments.length - 1] as string
  const parentId = await ensureFolderPath(workspaceId, segments.slice(0, -1))

  const existing = await findChild(workspaceId, parentId, leaf)
  if (existing) {
    if (existing.kind === "folder") return { error: `${path} is a folder` }
    await db
      .update(schema.brainNode)
      .set({ body, version: sql`${schema.brainNode.version} + 1` })
      .where(eq(schema.brainNode.id, existing.id))
    return { path, action: "updated" as const }
  }

  await db
    .insert(schema.brainNode)
    .values({ workspaceId, kind: "page", parentId, name: leaf, body })
  return { path, action: "created" as const }
}

export async function mkdir(workspaceId: string, path: string) {
  const segments = segmentsOf(path)
  if (segments.length === 0) return { error: "the root already exists" }
  await ensureFolderPath(workspaceId, segments)
  return { path, ok: true }
}

export async function move(workspaceId: string, src: string, dst: string) {
  const node = await resolvePath(workspaceId, src)
  if (node === null || node === "root") return { error: `no such path: ${src}` }

  const dstSegments = segmentsOf(dst)
  if (dstSegments.length === 0) return { error: "cannot move to the root" }
  if (isPrefix(segmentsOf(src), dstSegments)) {
    return { error: "cannot move a node into itself" }
  }

  const dstLeaf = dstSegments[dstSegments.length - 1] as string
  const dstParentId = await ensureFolderPath(
    workspaceId,
    dstSegments.slice(0, -1)
  )
  if (await findChild(workspaceId, dstParentId, dstLeaf)) {
    return { error: `${dst} already exists` }
  }

  await db
    .update(schema.brainNode)
    .set({ parentId: dstParentId, name: dstLeaf })
    .where(eq(schema.brainNode.id, node.id))
  return { from: src, to: dst }
}

export async function link(
  workspaceId: string,
  from: string,
  to: string,
  type: (typeof schema.BRAIN_EDGE_TYPES)[number]
) {
  const fromNode = await resolvePath(workspaceId, from)
  const toNode = await resolvePath(workspaceId, to)
  if (fromNode === null || fromNode === "root" || fromNode.kind !== "page") {
    return { error: `${from} is not a page` }
  }
  if (toNode === null || toNode === "root" || toNode.kind !== "page") {
    return { error: `${to} is not a page` }
  }
  await db
    .insert(schema.brainEdge)
    .values({ workspaceId, fromNodeId: fromNode.id, toNodeId: toNode.id, type })
    .onConflictDoNothing()
  return { from, to, type }
}

// Surface op failures to the model as a readable error instead of throwing.
function wrap<T>(fn: () => Promise<T>) {
  return fn().catch((e: unknown) => ({
    error: e instanceof Error ? e.message : "operation failed",
  }))
}

// Bare filesystem names — models have strong priors for ls/read/write/etc.
// These operate on Merlin's brain, not the host filesystem (see descriptions).
// Split read/write so the answer loop gets read-only and write-back gets both.

export function buildBrainReadTools(workspaceId: string) {
  return {
    ls: tool({
      description:
        "List the immediate children (folders and pages) of a brain folder. Path '/' is the root.",
      inputSchema: z.object({
        path: z.string().describe("folder path, e.g. /people"),
      }),
      execute: ({ path }) => wrap(() => ls(workspaceId, path)),
      strict: true,
    }),
    read: tool({
      description: "Read a brain page's contents by path.",
      inputSchema: z.object({
        path: z.string().describe("page path, e.g. /people/alice"),
      }),
      execute: ({ path }) => wrap(() => readPage(workspaceId, path)),
      strict: true,
    }),
    tree: tool({
      description:
        "Show the brain's folder/page structure under a path, nested to a depth (default 2).",
      inputSchema: z.object({
        path: z.string().describe("root path, e.g. / or /services"),
        depth: z.number().int().min(1).max(TREE_MAX_DEPTH).optional(),
      }),
      execute: ({ path, depth }) =>
        wrap(() => tree(workspaceId, path, depth ?? TREE_DEFAULT_DEPTH)),
      strict: true,
    }),
  }
}

export function buildBrainWriteTools(
  workspaceId: string,
  onWrite?: (e: { path: string; action: "created" | "updated" }) => void
) {
  return {
    write: tool({
      description:
        "Create or update a brain page at a path (parent folders are created automatically). Overwrites the page body.",
      inputSchema: z.object({
        path: z.string().describe("page path, e.g. /decisions/auth"),
        body: z.string().describe("the page contents (Markdown)"),
      }),
      execute: ({ path, body }) =>
        wrap(async () => {
          const result = await writePage(workspaceId, path, body)
          if (onWrite && "action" in result) {
            onWrite({ path: result.path, action: result.action })
          }
          return result
        }),
      strict: true,
    }),
    mkdir: tool({
      description: "Create a brain folder (and any missing parent folders).",
      inputSchema: z.object({
        path: z.string().describe("folder path"),
      }),
      execute: ({ path }) => wrap(() => mkdir(workspaceId, path)),
      strict: true,
    }),
    move: tool({
      description: "Move or rename a brain node (folder or page).",
      inputSchema: z.object({
        from: z.string().describe("current path"),
        to: z.string().describe("new path"),
      }),
      execute: ({ from, to }) => wrap(() => move(workspaceId, from, to)),
      strict: true,
    }),
    link: tool({
      description:
        "Create a typed link between two brain pages from the fixed set of edge types.",
      inputSchema: z.object({
        from: z.string().describe("source page path"),
        to: z.string().describe("target page path"),
        type: z.enum(schema.BRAIN_EDGE_TYPES).describe("relationship type"),
      }),
      execute: ({ from, to, type }) =>
        wrap(() => link(workspaceId, from, to, type)),
      strict: true,
    }),
  }
}
