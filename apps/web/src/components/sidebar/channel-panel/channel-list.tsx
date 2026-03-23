import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { authClient } from "@repo/auth/client"
import type { GuildRole } from "@repo/auth/permissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { Skeleton } from "@repo/ui/components/skeleton"
import { cn } from "@repo/ui/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  ChevronDown,
  Hash,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Volume2,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useState } from "react"
import { useUnread } from "@/context/unread-context"
import { apiClient } from "@/lib/api-client"
import type { Channel, ListChannelsResponse } from "@/lib/api-types"
import { canDeleteChannels, canManageChannels } from "@/lib/permissions"
import { DeleteChannelDialog } from "./delete-channel-dialog"
import { EditChannelDialog } from "./edit-channel-dialog"

const channelIcons = {
  text: Hash,
  voice: Volume2,
  announcement: Megaphone,
  forum: MessageSquare,
} as const

type ChannelData = ListChannelsResponse

function ChannelIcon({ type }: { type: string }) {
  const Icon = channelIcons[type as keyof typeof channelIcons] ?? Hash
  return <Icon className="size-4 shrink-0 opacity-50" />
}

function ChannelListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-2 px-2 py-[6px]">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center gap-0.5 px-1 pb-1">
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-2 px-2 py-[6px]">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function buildReorderPayload(data: ChannelData) {
  const channels: { id: string; position: number; parentId: string | null }[] =
    []

  data.uncategorized.forEach((ch, i) => {
    channels.push({ id: ch.id, position: i, parentId: null })
  })

  data.categories.forEach((cat, ci) => {
    channels.push({ id: cat.id, position: ci, parentId: null })
    cat.channels.forEach((ch, i) => {
      channels.push({ id: ch.id, position: i, parentId: cat.id })
    })
  })

  return channels
}

export function ChannelList() {
  const { guildSlug, channelId: activeChannelId } = useParams({ strict: false })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ["channels", guildSlug],
    queryFn: async () => {
      const res = await apiClient.v1.guilds[":guildSlug"].channels.$get({
        param: { guildSlug: guildSlug as string },
      })
      if (!res.ok) {
        throw new Error("Failed to fetch channels")
      }
      return res.json()
    },
    enabled: !!guildSlug,
  })

  const reorderMutation = useMutation({
    mutationFn: async (
      channels: { id: string; position: number; parentId: string | null }[]
    ) => {
      const res = await apiClient.v1.guilds[
        ":guildSlug"
      ].channels.reorder.$patch({
        param: { guildSlug: guildSlug as string },
        json: { channels },
      })
      if (!res.ok) {
        throw new Error("Failed to reorder channels")
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["channels", guildSlug] })
    },
  })

  const { data: activeMember } = useQuery({
    queryKey: ["active-guild-member", guildSlug],
    queryFn: async () => {
      const res = await authClient.organization.getActiveMember()
      return res.data
    },
    enabled: !!guildSlug,
  })
  const canManage = activeMember?.role
    ? canManageChannels(activeMember.role as GuildRole)
    : false
  const canDelete = activeMember?.role
    ? canDeleteChannels(activeMember.role as GuildRole)
    : false

  const [activeItem, setActiveItem] = useState<{
    channel: Channel
    isCategory: boolean
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const findChannel = useCallback(
    (id: string): { channel: Channel; isCategory: boolean } | null => {
      if (!data) return null
      for (const ch of data.uncategorized) {
        if (ch.id === id) return { channel: ch, isCategory: false }
      }
      for (const cat of data.categories) {
        if (cat.id === id) return { channel: cat, isCategory: true }
        for (const ch of cat.channels) {
          if (ch.id === id) return { channel: ch, isCategory: false }
        }
      }
      return null
    },
    [data]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const found = findChannel(event.active.id as string)
      setActiveItem(found ? { ...found } : null)
    },
    [findChannel]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!data) return
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeItem = findChannel(active.id as string)
      const overItem = findChannel(over.id as string)
      if (!activeItem || !overItem) return

      // Don't allow dragging categories into other categories
      if (activeItem.isCategory) return

      // Find which container the active item is in
      const activeContainer = activeItem.channel.parentId
      // Determine the target container
      const overContainer = overItem.isCategory
        ? (over.id as string)
        : overItem.channel.parentId

      // If moving between containers, update optimistically
      if (activeContainer !== overContainer) {
        queryClient.setQueryData(
          ["channels", guildSlug],
          (old: ChannelData | undefined) => {
            if (!old) return old
            const newData = structuredClone(old)
            const activeChannel = active.id as string

            // Remove from source
            if (activeContainer === null) {
              newData.uncategorized = newData.uncategorized.filter(
                (ch) => ch.id !== activeChannel
              )
            } else {
              const srcCat = newData.categories.find(
                (c) => c.id === activeContainer
              )
              if (srcCat) {
                srcCat.channels = srcCat.channels.filter(
                  (ch) => ch.id !== activeChannel
                )
              }
            }

            // Find the channel data
            const chData = activeItem.channel

            // Add to destination
            if (overContainer === null) {
              const overIdx = newData.uncategorized.findIndex(
                (ch) => ch.id === over.id
              )
              newData.uncategorized.splice(
                overIdx >= 0 ? overIdx : newData.uncategorized.length,
                0,
                { ...chData, parentId: null }
              )
            } else {
              const destCat = newData.categories.find(
                (c) => c.id === overContainer
              )
              if (destCat) {
                const overIdx = destCat.channels.findIndex(
                  (ch) => ch.id === over.id
                )
                destCat.channels.splice(
                  overIdx >= 0 ? overIdx : destCat.channels.length,
                  0,
                  { ...chData, parentId: overContainer }
                )
              }
            }

            return newData
          }
        )
      }
    },
    [data, findChannel, guildSlug, queryClient]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null)
      const { active, over } = event
      if (!over || !data || active.id === over.id) return

      const draggedItem = findChannel(active.id as string)
      const overItem = findChannel(over.id as string)
      if (!draggedItem || !overItem) return

      let newData: ChannelData | undefined
      queryClient.setQueryData(
        ["channels", guildSlug],
        (old: ChannelData | undefined) => {
          if (!old) return old
          const updated = structuredClone(old)

          if (draggedItem.isCategory && overItem.isCategory) {
            // Reorder categories
            const oldIdx = updated.categories.findIndex(
              (c) => c.id === active.id
            )
            const newIdx = updated.categories.findIndex((c) => c.id === over.id)
            if (oldIdx >= 0 && newIdx >= 0) {
              const moved = updated.categories.splice(oldIdx, 1)[0]
              if (moved) updated.categories.splice(newIdx, 0, moved)
            }
          } else if (!draggedItem.isCategory) {
            // Reorder within same container
            const container = draggedItem.channel.parentId
            if (container === null) {
              const oldIdx = updated.uncategorized.findIndex(
                (c) => c.id === active.id
              )
              const newIdx = updated.uncategorized.findIndex(
                (c) => c.id === over.id
              )
              if (oldIdx >= 0 && newIdx >= 0) {
                const moved = updated.uncategorized.splice(oldIdx, 1)[0]
                if (moved) updated.uncategorized.splice(newIdx, 0, moved)
              }
            } else {
              const cat = updated.categories.find((c) => c.id === container)
              if (cat) {
                const oldIdx = cat.channels.findIndex((c) => c.id === active.id)
                const newIdx = cat.channels.findIndex((c) => c.id === over.id)
                if (oldIdx >= 0 && newIdx >= 0) {
                  const moved = cat.channels.splice(oldIdx, 1)[0]
                  if (moved) cat.channels.splice(newIdx, 0, moved)
                }
              }
            }
          }

          newData = updated
          return updated
        }
      )

      if (newData) {
        reorderMutation.mutate(buildReorderPayload(newData))
      }
    },
    [data, findChannel, guildSlug, queryClient, reorderMutation]
  )

  if (isPending) {
    return <ChannelListSkeleton />
  }

  if (!data) {
    return null
  }

  const isEmpty =
    data.uncategorized.length === 0 && data.categories.length === 0

  if (isEmpty) {
    return (
      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
        <p>No channels yet.</p>
        <p>Create one to get started.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <nav className="space-y-4">
        {/* Uncategorized channels */}
        {data.uncategorized.length > 0 && (
          <SortableContext
            items={data.uncategorized.map((ch) => ch.id)}
            strategy={verticalListSortingStrategy}
            disabled={!canManage}
          >
            <div>
              {data.uncategorized.map((ch) => (
                <SortableChannelItem
                  key={ch.id}
                  channel={ch}
                  active={activeChannelId === ch.id}
                  canManage={canManage}
                  canDelete={canDelete}
                  onClick={() =>
                    navigate({
                      to: "/$guildSlug/$channelId",
                      params: {
                        guildSlug: guildSlug as string,
                        channelId: ch.id,
                      },
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        )}

        {/* Categories with children */}
        <SortableContext
          items={data.categories.map((cat) => cat.id)}
          strategy={verticalListSortingStrategy}
          disabled={!canManage}
        >
          {data.categories.map((cat) => (
            <SortableCategorySection
              key={cat.id}
              id={cat.id}
              name={cat.name ?? ""}
              channels={cat.channels}
              draggingCategory={activeItem?.isCategory ?? false}
              activeChannelId={activeChannelId}
              canManage={canManage}
              canDelete={canDelete}
              onChannelClick={(channelId) =>
                navigate({
                  to: "/$guildSlug/$channelId",
                  params: { guildSlug: guildSlug as string, channelId },
                })
              }
            />
          ))}
        </SortableContext>
      </nav>

      <DragOverlay>
        {activeItem && (
          <div className="rounded-lg bg-background shadow-lg">
            {activeItem.isCategory ? (
              <div className="flex items-center gap-0.5 px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ChevronDown className="size-3 shrink-0" />
                <span className="truncate">
                  {activeItem.channel.name ?? ""}
                </span>
              </div>
            ) : (
              <ChannelItem
                name={activeItem.channel.name ?? ""}
                type={activeItem.channel.type}
              />
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function SortableCategorySection({
  id,
  name,
  channels,
  draggingCategory,
  activeChannelId,
  canManage,
  canDelete,
  onChannelClick,
}: {
  id: string
  name: string
  channels: Channel[]
  draggingCategory: boolean
  activeChannelId?: string
  canManage: boolean
  canDelete: boolean
  onChannelClick?: (channelId: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !canManage })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        {...(canManage ? { ...attributes, ...listeners } : {})}
        className="group flex w-full items-center gap-0.5 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <motion.div
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          <ChevronDown className="size-3 shrink-0" />
        </motion.div>
        <span className="truncate">{name}</span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <SortableContext
              items={channels.map((ch) => ch.id)}
              strategy={verticalListSortingStrategy}
              disabled={!canManage || draggingCategory}
            >
              {channels.map((ch) => (
                <SortableChannelItem
                  key={ch.id}
                  channel={ch}
                  active={activeChannelId === ch.id}
                  canManage={canManage}
                  canDelete={canDelete}
                  onClick={() => onChannelClick?.(ch.id)}
                />
              ))}
            </SortableContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SortableChannelItem({
  channel: ch,
  active = false,
  canManage,
  canDelete,
  onClick,
}: {
  channel: Channel
  active?: boolean
  canManage: boolean
  canDelete: boolean
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ch.id, disabled: !canManage })

  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { getUnreadCount, getMentionCount } = useUnread()
  const unreadCount = active ? 0 : getUnreadCount(ch.id)
  const mentionCount = active ? 0 : getMentionCount(ch.id)
  const hasUnread = unreadCount > 0

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: dnd-kit requires a div here */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: dnd-kit handles keyboard interactions */}
      <div
        ref={setNodeRef}
        style={style}
        onClick={onClick}
        {...(canManage ? { ...attributes, ...listeners } : {})}
        className={cn(
          "group relative flex w-full items-center gap-2 rounded-lg px-2 py-[6px] text-[14px] hover:bg-foreground/[0.06] cursor-pointer",
          active && "bg-foreground/[0.06] font-medium text-foreground",
          !active && hasUnread && "font-medium text-foreground",
          !active && !hasUnread && "text-muted-foreground",
          menuOpen && "bg-foreground/[0.06]"
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        {!active && hasUnread && (
          <div className="absolute left-0 top-1/2 h-2 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground" />
        )}
        <ChannelIcon type={ch.type} />
        <span className="truncate">{ch.name}</span>
        {mentionCount > 0 && (
          <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {mentionCount}
          </span>
        )}
        {canManage && (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "ml-auto flex size-5 items-center justify-center rounded opacity-0 hover:bg-foreground/10 group-hover:opacity-100",
                menuOpen && "opacity-100"
              )}
            >
              <MoreHorizontal className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  setEditOpen(true)
                }}
              >
                Edit Channel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(ch.id)
                  setMenuOpen(false)
                }}
              >
                Copy Channel ID
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      setDeleteOpen(true)
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete Channel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {canManage && (
        <EditChannelDialog
          channel={ch}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      {canDelete && (
        <DeleteChannelDialog
          channel={ch}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </>
  )
}

function ChannelItem({
  name,
  type,
  active = false,
}: {
  name: string
  type: string
  active?: boolean
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-lg px-2 py-[6px] text-[14px]",
        active
          ? "bg-foreground/[0.06] font-medium text-foreground"
          : "text-muted-foreground"
      )}
    >
      <ChannelIcon type={type} />
      <span className="truncate">{name}</span>
    </div>
  )
}
