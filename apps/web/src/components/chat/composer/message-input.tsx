import { Button } from "@repo/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover"
import { cn } from "@repo/ui/lib/utils"
import Mention, { type MentionOptions } from "@tiptap/extension-mention"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { SuggestionProps } from "@tiptap/suggestion"
import { FileUp, ImagePlus, Link2, Plus, Send, Smile } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Message } from "@/lib/api-types"
import type { ChatContext } from "../header"
import {
  MentionSuggestionList,
  type MentionSuggestionListProps,
  type MentionSuggestionListRef,
} from "./mention-suggestion-list"
import type { MentionCandidate } from "./mention-types"

const MAX_MENTION_RESULTS = 8
const MAX_MESSAGE_LENGTH = 2000
const POPUP_HORIZONTAL_PADDING = 8
const POPUP_VERTICAL_PADDING = 8
const POPUP_GAP = 6
const TIPTAP_MARKDOWN_MENTION_REGEX = /\[@[^\]]*?\bid="([^"]+)"[^\]]*]/g
const STORED_MENTION_REGEX =
  /<@([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>/gi
const ATTACHMENT_ACTIONS = [
  { id: "upload-file", label: "Upload File", icon: FileUp },
  { id: "upload-image", label: "Upload Image", icon: ImagePlus },
  { id: "attach-link", label: "Attach Link", icon: Link2 },
] as const

interface MessageInputProps {
  context: ChatContext
  onSend: (content: string, options?: { mentions: Message["mentions"] }) => void
  isSending?: boolean
  currentUserId?: string
  mentionCandidates?: MentionCandidate[]
}

function toStoredMarkdown(markdown: string) {
  return markdown
    .replace(/\u00A0/g, " ")
    .replace(TIPTAP_MARKDOWN_MENTION_REGEX, "<@$1>")
}

function extractMentionIds(content: string) {
  const mentionIds = new Set<string>()

  for (const match of content.matchAll(STORED_MENTION_REGEX)) {
    const mentionId = match[1]
    if (mentionId) {
      mentionIds.add(mentionId)
    }
  }

  return Array.from(mentionIds)
}

function createMentionSuggestion(
  getMentionCandidates: () => MentionCandidate[]
): MentionOptions<MentionCandidate>["suggestion"] {
  return {
    char: "@",
    items: ({ query }) => {
      const normalized = query.trim().toLowerCase()
      const results = getMentionCandidates().filter((candidate) => {
        if (!normalized) return true
        return (
          candidate.label.toLowerCase().includes(normalized) ||
          candidate.search?.toLowerCase().includes(normalized)
        )
      })
      return results.slice(0, MAX_MENTION_RESULTS)
    },
    render: () => {
      let popup: HTMLDivElement | null = null
      let currentProps: SuggestionProps<
        MentionCandidate,
        MentionCandidate
      > | null = null
      let reactRenderer: ReactRenderer<
        MentionSuggestionListRef,
        MentionSuggestionListProps
      > | null = null

      const positionPopup = () => {
        const clientRect = currentProps?.clientRect?.()
        if (!popup || !clientRect) return

        const popupWidth = popup.offsetWidth || 240
        const popupHeight = popup.offsetHeight || 240
        const maxLeft = Math.max(
          POPUP_HORIZONTAL_PADDING,
          window.innerWidth - popupWidth - POPUP_HORIZONTAL_PADDING
        )
        const left = Math.min(
          Math.max(POPUP_HORIZONTAL_PADDING, clientRect.left),
          maxLeft
        )
        const top = Math.max(
          POPUP_VERTICAL_PADDING,
          clientRect.top - popupHeight - POPUP_GAP
        )

        popup.style.left = `${left}px`
        popup.style.top = `${top}px`
      }

      const cleanup = () => {
        window.removeEventListener("resize", positionPopup)
        window.removeEventListener("scroll", positionPopup, true)
        reactRenderer?.destroy()
        reactRenderer = null
        popup?.remove()
        popup = null
        currentProps = null
      }

      return {
        onStart: (props) => {
          cleanup()
          currentProps = props

          popup = document.createElement("div")
          popup.className =
            "fixed z-50 w-60 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
          popup.dataset.mentionSuggestionOpen = "true"
          document.body.append(popup)

          reactRenderer = new ReactRenderer(MentionSuggestionList, {
            editor: props.editor,
            props: {
              items: props.items,
              command: props.command,
            },
          })

          popup.append(reactRenderer.element)
          window.addEventListener("resize", positionPopup)
          window.addEventListener("scroll", positionPopup, true)
          positionPopup()
        },
        onUpdate: (props) => {
          currentProps = props
          reactRenderer?.updateProps({
            items: props.items,
            command: props.command,
          })
          positionPopup()
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            props.event.preventDefault()
            cleanup()
            return true
          }

          const suggestionList =
            reactRenderer?.ref as MentionSuggestionListRef | null
          return suggestionList?.onKeyDown(props) ?? false
        },
        onExit: cleanup,
      }
    },
  }
}

export function MessageInput({
  context,
  onSend,
  isSending,
  currentUserId,
  mentionCandidates = [],
}: MessageInputProps) {
  const [plainText, setPlainText] = useState("")
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const mentionCandidatesRef = useRef<MentionCandidate[]>([])

  const placeholder =
    context.type === "channel"
      ? `Message #${context.name}`
      : `Send a Raven to ${context.name}`

  const normalizedMentionCandidates = useMemo(() => {
    const uniqueCandidates = new Map<string, MentionCandidate>()
    for (const candidate of mentionCandidates) {
      if (currentUserId && candidate.id === currentUserId) {
        continue
      }

      const label = candidate.label.trim()
      if (!label) continue
      uniqueCandidates.set(candidate.id, {
        id: candidate.id,
        label,
        search: candidate.search,
        name: candidate.name,
        username: candidate.username,
        displayUsername: candidate.displayUsername,
        image: candidate.image,
      })
    }
    return Array.from(uniqueCandidates.values())
  }, [currentUserId, mentionCandidates])

  useEffect(() => {
    mentionCandidatesRef.current = normalizedMentionCandidates
  }, [normalizedMentionCandidates])

  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(() => mentionCandidatesRef.current),
    []
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Markdown,
        Mention.configure({
          HTMLAttributes: {
            class: "rounded bg-primary/15 px-1 py-0.5 font-medium text-primary",
          },
          renderText: ({ options, node }) =>
            `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`,
          suggestion: mentionSuggestion,
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "min-h-[24px] max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90 outline-none",
        },
      },
      onCreate: ({ editor: tiptapEditor }) => {
        setPlainText(tiptapEditor.getText({ blockSeparator: "\n" }))
      },
      onUpdate: ({ editor: tiptapEditor }) => {
        setPlainText(tiptapEditor.getText({ blockSeparator: "\n" }))
      },
    },
    []
  )

  const handleSend = useCallback(() => {
    if (!editor) return

    const markdown = toStoredMarkdown(editor.getMarkdown())
    const trimmed = markdown.trim()
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || isSending) return

    const mentionCandidatesById = new Map(
      normalizedMentionCandidates.map((candidate) => [candidate.id, candidate])
    )

    const mentions: Message["mentions"] = extractMentionIds(trimmed).flatMap(
      (mentionId) => {
        const mentionCandidate = mentionCandidatesById.get(mentionId)
        if (!mentionCandidate) return []

        return [
          {
            id: mentionCandidate.id,
            name: mentionCandidate.name ?? mentionCandidate.label,
            username: mentionCandidate.username ?? null,
            displayUsername: mentionCandidate.displayUsername ?? null,
            image: mentionCandidate.image ?? null,
          },
        ]
      }
    )

    onSend(trimmed, { mentions })
    editor.commands.clearContent(true)
    editor.commands.focus("end")
    setPlainText("")
  }, [editor, isSending, normalizedMentionCandidates, onSend])

  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) {
      return
    }

    const isMentionSuggestionOpen = () =>
      Boolean(document.querySelector("[data-mention-suggestion-open='true']"))

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        if (event.isComposing) {
          return
        }
        if (isMentionSuggestionOpen()) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        handleSend()
      }
    }

    const domNode = editor.view.dom
    domNode.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => {
      domNode.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [editor, handleSend])

  const trimmedValue = plainText.trim()
  const canSend =
    trimmedValue.length > 0 &&
    trimmedValue.length <= MAX_MESSAGE_LENGTH &&
    !isSending
  const isEmpty = trimmedValue.length === 0

  return (
    <div className="shrink-0 px-4 pb-3">
      <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2">
        <Popover
          open={isAttachmentMenuOpen}
          onOpenChange={setIsAttachmentMenuOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Open attachment menu"
            >
              <Plus
                className={cn(
                  "size-4 transition-transform duration-200 ease-out",
                  isAttachmentMenuOpen && "rotate-45"
                )}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            sideOffset={10}
            className="w-64 p-2"
          >
            <div className="grid gap-1">
              {ATTACHMENT_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground"
                >
                  <action.icon className="size-4 text-muted-foreground" />
                  {action.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div
          className={cn(
            "relative min-w-0 flex-1",
            "[&_.ProseMirror_p]:m-0 [&_.ProseMirror_p]:leading-6"
          )}
        >
          {isEmpty && (
            <span className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground">
              {placeholder}
            </span>
          )}
          <EditorContent editor={editor} className="flex-1" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Add emoji"
          >
            <Smile className="size-5" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "size-7 text-muted-foreground transition-colors",
              canSend && "text-primary hover:text-primary"
            )}
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
