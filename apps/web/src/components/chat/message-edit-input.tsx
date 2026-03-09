import { cn } from "@repo/ui/lib/utils"
import Link from "@tiptap/extension-link"
import Mention from "@tiptap/extension-mention"
import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { toStoredMarkdown } from "@/lib/editor-utils"
import type { MentionCandidate } from "./composer/mention-types"
import {
  createMentionSuggestion,
  SUGGESTION_MENU_SELECTOR,
} from "./composer/message-input"

const MAX_MESSAGE_LENGTH = 2000

interface MessageEditInputProps {
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
  mentionCandidates?: MentionCandidate[]
}

export function MessageEditInput({
  initialContent,
  onSave,
  onCancel,
  mentionCandidates = [],
}: MessageEditInputProps) {
  const mentionCandidatesRef = useRef(mentionCandidates)

  useEffect(() => {
    mentionCandidatesRef.current = mentionCandidates
  }, [mentionCandidates])

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
          horizontalRule: false,
        }),
        Markdown,
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            class:
              "text-primary underline-offset-2 hover:underline cursor-pointer",
            rel: "noreferrer noopener",
            target: "_blank",
          },
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "rounded bg-primary/15 px-1 py-0.5 font-medium text-primary",
          },
          renderText: ({ options, node }) =>
            `${options.suggestion.char}${node.attrs.label ?? node.attrs.id}`,
          suggestion: mentionSuggestion,
        }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class:
            "min-h-[24px] max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90 outline-none [&_code]:rounded-[4px] [&_code]:border [&_code]:border-border/70 [&_code]:bg-primary/10 [&_code]:px-0.75 [&_code]:py-0.25 [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-foreground [&_pre]:mt-1 [&_pre]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-muted/50 [&_pre]:px-2 [&_pre]:py-1.5 [&_pre]:font-mono [&_pre]:text-[0.92em] [&_pre]:leading-6 [&_pre_code]:rounded-none [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground",
        },
      },
      autofocus: "end",
    },
    []
  )

  // Force focus after mount — the Radix dropdown close animation steals focus back
  useEffect(() => {
    if (!editor) return
    const timeout = setTimeout(() => {
      editor.commands.focus("end")
    }, 200)
    return () => clearTimeout(timeout)
  }, [editor])

  const handleSave = useCallback(() => {
    if (!editor) return

    const rawMarkdown = editor.getMarkdown()
    const markdown = toStoredMarkdown(rawMarkdown)
    const trimmed = markdown.trim()

    if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return

    // Don't save if content hasn't changed
    if (trimmed === initialContent) {
      onCancel()
      return
    }

    onSave(trimmed)
  }, [editor, initialContent, onSave, onCancel])

  useEffect(() => {
    if (!editor?.view?.dom) return

    const isSuggestionMenuOpen = () =>
      Boolean(document.querySelector(SUGGESTION_MENU_SELECTOR))

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        onCancel()
        return
      }

      if (event.key === "Enter" && !event.shiftKey) {
        if (event.isComposing) return
        if (isSuggestionMenuOpen()) return
        event.preventDefault()
        event.stopPropagation()
        handleSave()
      }
    }

    const domNode = editor.view.dom
    domNode.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => {
      domNode.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [editor, handleSave, onCancel])

  return (
    <div className="rounded-md border border-input bg-muted/40 px-3 py-2">
      <div
        className={cn("[&_.ProseMirror_p]:m-0 [&_.ProseMirror_p]:leading-6")}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        escape to{" "}
        <button
          type="button"
          onClick={onCancel}
          className="text-primary hover:underline"
        >
          cancel
        </button>{" "}
        &bull; enter to{" "}
        <button
          type="button"
          onClick={handleSave}
          className="text-primary hover:underline"
        >
          save
        </button>
      </div>
    </div>
  )
}
