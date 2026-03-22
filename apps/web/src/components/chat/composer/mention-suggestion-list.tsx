import { cn } from "@repo/ui/lib/utils"
import type { SuggestionKeyDownProps } from "@tiptap/suggestion"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react"
import type { MentionCandidate } from "./mention-types"

export interface MentionSuggestionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

export interface MentionSuggestionListProps {
  items: MentionCandidate[]
  command: (item: MentionCandidate) => void
}

export const MentionSuggestionList = forwardRef<
  MentionSuggestionListRef,
  MentionSuggestionListProps
>(function MentionSuggestionList({ items, command }, ref) {
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
    setSelectedIndex((currentIndex) => {
      if (items.length === 0) return 0
      return Math.min(currentIndex, items.length - 1)
    })
  }, [items.length])

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
        No matches
      </div>
    )
  }

  return (
    <div className="max-h-56 overflow-y-auto p-1">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm",
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/70"
          )}
          onMouseDown={(event) => {
            event.preventDefault()
            selectItem(index)
          }}
        >
          @{item.displayUsername ?? item.username ?? item.label}
        </button>
      ))}
    </div>
  )
})
