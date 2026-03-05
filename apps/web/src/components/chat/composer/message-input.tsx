import { Button } from "@repo/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover"
import { cn } from "@repo/ui/lib/utils"
import Mention, { type MentionOptions } from "@tiptap/extension-mention"
import { Markdown } from "@tiptap/markdown"
import { PluginKey } from "@tiptap/pm/state"
import {
  EditorContent,
  Extension,
  ReactRenderer,
  useEditor,
  useEditorState,
} from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion"
import {
  Bold,
  Code,
  FileUp,
  ImagePlus,
  Italic,
  Link2,
  Plus,
  Send,
  Smile,
  Strikethrough,
} from "lucide-react"
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { Message } from "@/lib/api-types"
import type { ChatContext } from "../header"
import {
  MentionSuggestionList,
  type MentionSuggestionListProps,
  type MentionSuggestionListRef,
} from "./mention-suggestion-list"
import type { MentionCandidate } from "./mention-types"
import {
  type SlashCommandItem,
  SlashCommandList,
  type SlashCommandListProps,
  type SlashCommandListRef,
} from "./slash-command-list"

const MAX_MENTION_RESULTS = 8
const MAX_SLASH_RESULTS = 8
const MAX_MESSAGE_LENGTH = 2000
const POPUP_HORIZONTAL_PADDING = 8
const POPUP_VERTICAL_PADDING = 8
const POPUP_GAP = 6
const SUGGESTION_MENU_SELECTOR =
  "[data-suggestion-open='true'], [data-mention-suggestion-open='true'], [data-slash-suggestion-open='true'], [data-slash-command-open='true']"
const EVERYONE_MENTION_ID = "everyone"
const SLASH_COMMAND_PLUGIN_KEY = new PluginKey("slash-command")
const TIPTAP_MARKDOWN_MENTION_REGEX = /\[@[^\]]*?\bid="([^"]+)"[^\]]*]/g
const STORED_MENTION_REGEX =
  /<@([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})>/gi
const ATTACHMENT_ACTIONS = [
  { id: "upload-file", label: "Upload File", icon: FileUp },
  { id: "upload-image", label: "Upload Image", icon: ImagePlus },
  { id: "attach-link", label: "Attach Link", icon: Link2 },
] as const
const DEFAULT_CODE_BLOCK_LANGUAGE = "plaintext"
const CODE_BLOCK_LANGUAGE_OPTIONS = [
  { value: "plaintext", label: "Plain Text" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
] as const
const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "code-block",
    label: "Code Block",
    description: "Insert a code block",
    search: "code snippet block fence",
  },
]

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
    .replace(TIPTAP_MARKDOWN_MENTION_REGEX, (_match, mentionId: string) => {
      if (mentionId.toLowerCase() === EVERYONE_MENTION_ID) {
        return "@everyone"
      }

      return `<@${mentionId}>`
    })
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

interface SuggestionPopupListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface SuggestionPopupManagerOptions<
  TItem,
  TListRef extends SuggestionPopupListRef,
  TListProps extends { items: TItem[]; command: (item: TItem) => void },
> {
  rendererComponent: ComponentType<TListProps>
  popupClassName: string
  popupDataAttribute: string
  popupFallbackWidth: number
  popupFallbackHeight: number
}

function createSuggestionPopupManager<
  TItem,
  TListRef extends SuggestionPopupListRef,
  TListProps extends { items: TItem[]; command: (item: TItem) => void },
>({
  rendererComponent,
  popupClassName,
  popupDataAttribute,
  popupFallbackWidth,
  popupFallbackHeight,
}: SuggestionPopupManagerOptions<TItem, TListRef, TListProps>) {
  let popup: HTMLDivElement | null = null
  let currentProps: SuggestionProps<TItem, TItem> | null = null
  let reactRenderer: ReactRenderer<TListRef, TListProps> | null = null

  const positionPopup = () => {
    const clientRect = currentProps?.clientRect?.()
    if (!popup || !clientRect) return

    const popupWidth = popup.offsetWidth || popupFallbackWidth
    const popupHeight = popup.offsetHeight || popupFallbackHeight
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
    onStart: (props: SuggestionProps<TItem, TItem>) => {
      cleanup()
      currentProps = props

      popup = document.createElement("div")
      popup.className = popupClassName
      popup.dataset[popupDataAttribute] = "true"
      popup.dataset.suggestionOpen = "true"
      document.body.append(popup)

      reactRenderer = new ReactRenderer(rendererComponent, {
        editor: props.editor,
        props: {
          items: props.items,
          command: props.command,
        } as TListProps,
      })

      popup.append(reactRenderer.element)
      window.addEventListener("resize", positionPopup)
      window.addEventListener("scroll", positionPopup, true)
      positionPopup()
    },
    onUpdate: (props: SuggestionProps<TItem, TItem>) => {
      currentProps = props
      reactRenderer?.updateProps({
        items: props.items,
        command: props.command,
      } as TListProps)
      positionPopup()
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") {
        props.event.preventDefault()
        cleanup()
        return true
      }

      const suggestionList = reactRenderer?.ref as TListRef | null
      return suggestionList?.onKeyDown(props) ?? false
    },
    onExit: cleanup,
  }
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
      return createSuggestionPopupManager<
        MentionCandidate,
        MentionSuggestionListRef,
        MentionSuggestionListProps
      >({
        rendererComponent: MentionSuggestionList,
        popupClassName:
          "fixed z-50 w-60 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
        popupDataAttribute: "mentionSuggestionOpen",
        popupFallbackWidth: 240,
        popupFallbackHeight: 240,
      })
    },
  }
}

function createSlashCommandSuggestion(): Omit<
  SuggestionOptions<SlashCommandItem, SlashCommandItem>,
  "editor"
> {
  return {
    pluginKey: SLASH_COMMAND_PLUGIN_KEY,
    char: "/",
    items: ({ query }) => {
      const normalized = query.trim().toLowerCase()
      const results = SLASH_COMMANDS.filter((command) => {
        if (!normalized) return true
        return (
          command.label.toLowerCase().includes(normalized) ||
          command.search?.toLowerCase().includes(normalized)
        )
      })
      return results.slice(0, MAX_SLASH_RESULTS)
    },
    command: ({ editor, range, props }) => {
      if (props.id !== "code-block") {
        return
      }

      editor
        .chain()
        .focus()
        .insertContentAt(range, {
          type: "codeBlock",
          attrs: { language: DEFAULT_CODE_BLOCK_LANGUAGE },
        })
        .run()
    },
    allow: ({ editor }) => {
      if (!editor.isEditable) return false
      return !editor.isActive("codeBlock")
    },
    render: () => {
      return createSuggestionPopupManager<
        SlashCommandItem,
        SlashCommandListRef,
        SlashCommandListProps
      >({
        rendererComponent: SlashCommandList,
        popupClassName:
          "fixed z-50 w-72 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
        popupDataAttribute: "slashSuggestionOpen",
        popupFallbackWidth: 288,
        popupFallbackHeight: 240,
      })
    },
  }
}

function createSlashCommandExtension(
  suggestion: Omit<
    SuggestionOptions<SlashCommandItem, SlashCommandItem>,
    "editor"
  >
) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...suggestion,
        }),
      ]
    },
  })
}

function getCodeBlockLanguageValue(language: unknown) {
  if (typeof language !== "string") {
    return DEFAULT_CODE_BLOCK_LANGUAGE
  }

  const normalized = language.trim().toLowerCase()
  if (!normalized) {
    return DEFAULT_CODE_BLOCK_LANGUAGE
  }

  const supported = CODE_BLOCK_LANGUAGE_OPTIONS.some(
    (option) => option.value === normalized
  )

  if (supported) {
    return normalized
  }

  return DEFAULT_CODE_BLOCK_LANGUAGE
}

function getActiveCodeBlockRect(editor: {
  state: {
    doc: {
      nodeAt: (pos: number) => { attrs?: { language?: unknown } } | null
    }
    selection: {
      $from: {
        depth: number
        node: (depth: number) => { type: { name: string } }
        before: (depth: number) => number
      }
    }
  }
  view: {
    nodeDOM: (pos: number) => Node | null
  }
}) {
  const { $from } = editor.state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== "codeBlock") continue

    const domNode = editor.view.nodeDOM($from.before(depth))
    if (!(domNode instanceof HTMLElement)) continue

    const rect = domNode.getBoundingClientRect()
    return new DOMRect(rect.left + 8, rect.top + 8, 1, 1)
  }

  return null
}

function getActiveCodeBlockPos(editor: {
  state: {
    selection: {
      $from: {
        depth: number
        node: (depth: number) => { type: { name: string } }
        before: (depth: number) => number
      }
    }
  }
}) {
  const { $from } = editor.state.selection

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "codeBlock") {
      return $from.before(depth)
    }
  }

  return null
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
  // Slash commands temporarily disabled.
  // const slashCommandSuggestion = useMemo(
  //   () => createSlashCommandSuggestion(),
  //   []
  // )
  // const slashCommandExtension = useMemo(
  //   () => createSlashCommandExtension(slashCommandSuggestion),
  //   [slashCommandSuggestion]
  // )

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
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
        // slashCommandExtension,
      ],
      editorProps: {
        attributes: {
          class:
            "min-h-[24px] max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90 outline-none [&_code]:rounded-[4px] [&_code]:border [&_code]:border-border/70 [&_code]:bg-primary/10 [&_code]:px-0.75 [&_code]:py-0.25 [&_code]:font-mono [&_code]:text-[0.92em] [&_code]:text-foreground [&_pre]:mt-1 [&_pre]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-muted/50 [&_pre]:px-2 [&_pre]:py-1.5 [&_pre]:font-mono [&_pre]:text-[0.92em] [&_pre]:leading-6 [&_pre_code]:rounded-none [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground",
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

    const isSuggestionMenuOpen = () =>
      Boolean(document.querySelector(SUGGESTION_MENU_SELECTOR))

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        if (event.isComposing) {
          return
        }
        if (isSuggestionMenuOpen()) {
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
  const markState = useEditorState({
    editor,
    selector: ({ editor: tiptapEditor }) => {
      if (!tiptapEditor) {
        return {
          isBoldActive: false,
          isCodeBlockActive: false,
          codeBlockPos: null,
          isCodeActive: false,
          codeBlockLanguage: DEFAULT_CODE_BLOCK_LANGUAGE,
          isItalicActive: false,
          isStrikeActive: false,
        }
      }

      return {
        isBoldActive: tiptapEditor.isActive("bold"),
        isCodeBlockActive: tiptapEditor.isActive("codeBlock"),
        codeBlockPos: getActiveCodeBlockPos(tiptapEditor),
        isCodeActive: tiptapEditor.isActive("code"),
        codeBlockLanguage: getCodeBlockLanguageValue(
          tiptapEditor.getAttributes("codeBlock").language
        ),
        isItalicActive: tiptapEditor.isActive("italic"),
        isStrikeActive: tiptapEditor.isActive("strike"),
      }
    },
  })
  const isBoldActive = markState?.isBoldActive ?? false
  const isCodeBlockActive = markState?.isCodeBlockActive ?? false
  const codeBlockPos = markState?.codeBlockPos ?? null
  const isCodeActive = markState?.isCodeActive ?? false
  const codeBlockLanguage =
    markState?.codeBlockLanguage ?? DEFAULT_CODE_BLOCK_LANGUAGE
  const isItalicActive = markState?.isItalicActive ?? false
  const isStrikeActive = markState?.isStrikeActive ?? false

  const getMarkButtonClassName = (isActive: boolean) =>
    cn(
      "size-7 border border-transparent text-muted-foreground",
      "hover:text-foreground",
      isActive &&
        "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
    )

  const handleCodeBlockLanguageChange = useCallback(
    (language: string) => {
      if (!editor || codeBlockPos === null) return

      const codeBlockNode = editor.state.doc.nodeAt(codeBlockPos)
      if (!codeBlockNode || codeBlockNode.type.name !== "codeBlock") return

      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(codeBlockPos, undefined, {
          ...codeBlockNode.attrs,
          language,
        })
      )
      editor.commands.focus()
    },
    [codeBlockPos, editor]
  )

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
          {editor && (
            <BubbleMenu
              editor={editor}
              appendTo={() => document.body}
              shouldShow={({ editor: tiptapEditor, element }) => {
                const activeElement =
                  typeof document !== "undefined"
                    ? document.activeElement
                    : null

                return (
                  tiptapEditor.isEditable &&
                  (tiptapEditor.isActive("codeBlock") ||
                    (activeElement ? element.contains(activeElement) : false))
                )
              }}
              getReferencedVirtualElement={() => {
                const rect = getActiveCodeBlockRect(editor)
                if (!rect) return null

                return {
                  getBoundingClientRect: () => rect,
                }
              }}
              options={{
                strategy: "fixed",
                placement: "bottom-start",
                offset: 0,
                flip: true,
                shift: true,
              }}
              className="z-50 rounded-md border border-border/70 bg-background/95 p-1 shadow-sm backdrop-blur"
            >
              <div className="flex items-center gap-1">
                <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Lang
                </span>
                <select
                  value={codeBlockLanguage}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                  }}
                  onChange={(event) => {
                    handleCodeBlockLanguageChange(event.target.value)
                  }}
                  className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring"
                  aria-label="Code block language"
                >
                  {CODE_BLOCK_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </BubbleMenu>
          )}
          {editor && (
            <BubbleMenu
              editor={editor}
              appendTo={() => document.body}
              shouldShow={({ editor: tiptapEditor, state, from, to }) => {
                if (!tiptapEditor.isEditable) return false
                if (state.selection.empty || from === to) return false
                if (tiptapEditor.isActive("codeBlock")) return false
                return state.doc.textBetween(from, to).trim().length > 0
              }}
              getReferencedVirtualElement={() => {
                const { selection } = editor.state
                if (selection.empty) return null

                const { left, right, top, bottom } = editor.view.coordsAtPos(
                  selection.head
                )

                return {
                  getBoundingClientRect: () =>
                    new DOMRect(
                      left,
                      top,
                      Math.max(1, right - left),
                      Math.max(1, bottom - top)
                    ),
                }
              }}
              options={{
                strategy: "fixed",
                placement: "top",
                offset: 8,
                flip: true,
                shift: true,
              }}
              className="z-50 flex items-center gap-1 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className={getMarkButtonClassName(isBoldActive)}
                aria-label="Bold"
                aria-pressed={isBoldActive}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  editor.chain().focus().toggleBold().run()
                }}
                disabled={!editor.can().chain().focus().toggleBold().run()}
              >
                <Bold
                  className="size-3.5"
                  strokeWidth={isBoldActive ? 2.5 : 2}
                />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className={getMarkButtonClassName(isItalicActive)}
                aria-label="Italic"
                aria-pressed={isItalicActive}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  editor.chain().focus().toggleItalic().run()
                }}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
              >
                <Italic
                  className="size-3.5"
                  strokeWidth={isItalicActive ? 2.5 : 2}
                />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className={getMarkButtonClassName(isCodeActive)}
                aria-label="Inline code"
                aria-pressed={isCodeActive}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  editor.chain().focus().toggleCode().run()
                }}
                disabled={!editor.can().chain().focus().toggleCode().run()}
              >
                <Code
                  className="size-3.5"
                  strokeWidth={isCodeActive ? 2.5 : 2}
                />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className={getMarkButtonClassName(isStrikeActive)}
                aria-label="Strikethrough"
                aria-pressed={isStrikeActive}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  editor.chain().focus().toggleStrike().run()
                }}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
              >
                <Strikethrough
                  className="size-3.5"
                  strokeWidth={isStrikeActive ? 2.5 : 2}
                />
              </Button>
            </BubbleMenu>
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
