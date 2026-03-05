import { cn } from "@repo/ui/lib/utils"
import type { SuggestionKeyDownProps } from "@tiptap/suggestion"
import { Code2 } from "lucide-react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react"

export interface SlashCommandItem {
  id: string
  label: string
  description: string
  language?: string
  search?: string
}

export interface SlashCommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

export interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

function CommandIcon({ id }: { id: SlashCommandItem["id"] }) {
  if (id.startsWith("code-block")) {
    return <Code2 className="size-4" />
  }

  return null
}

export const SlashCommandList = forwardRef<
  SlashCommandListRef,
  SlashCommandListProps
>(function SlashCommandList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index]
      if (!item) return false
      command(item)
      return true
    },
    [items, command]
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false

        if (event.key === "ArrowDown") {
          event.preventDefault()
          setSelectedIndex((currentIndex) => (currentIndex + 1) % items.length)
          return true
        }

        if (event.key === "ArrowUp") {
          event.preventDefault()
          setSelectedIndex(
            (currentIndex) => (currentIndex + items.length - 1) % items.length
          )
          return true
        }

        if (event.key === "Enter") {
          event.preventDefault()
          return selectItem(selectedIndex)
        }

        return false
      },
    }),
    [items.length, selectedIndex, selectItem]
  )

  if (items.length === 0) {
    return (
      <div className="px-2 py-1.5 text-sm text-muted-foreground">
        No commands
      </div>
    )
  }

  return (
    <div className="max-h-60 overflow-y-auto p-1">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left",
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/70"
          )}
          onMouseDown={(event) => {
            event.preventDefault()
            selectItem(index)
          }}
        >
          <span className="mt-0.5 text-muted-foreground">
            <CommandIcon id={item.id} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{item.label}</span>
            <span className="block text-xs text-muted-foreground">
              {item.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
})
