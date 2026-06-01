"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { LinearLogo } from "@repo/ui/components/logos/linear"
import { NotionLogo } from "@repo/ui/components/logos/notion"
import { ArrowUp, Plus, Sparkles } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

type ToolSource = "linear" | "notion"

type Person = {
  handle: string
  initial: string
  avatar: string
}

const DICEBEAR = "https://api.dicebear.com/9.x/initials/svg"
const MIRA: Person = {
  handle: "mira",
  initial: "M",
  avatar: `${DICEBEAR}?seed=Mira&chars=1&backgroundColor=ec4899&textColor=ffffff`,
}
const SAM: Person = {
  handle: "samp",
  initial: "S",
  avatar: `${DICEBEAR}?seed=Samp&chars=1&backgroundColor=10b981&textColor=ffffff`,
}
const JACOB: Person = {
  handle: "jacob",
  initial: "J",
  avatar: `${DICEBEAR}?seed=Jacob&chars=1&backgroundColor=0ea5e9&textColor=ffffff`,
}
const MERLIN_AVATAR = `${DICEBEAR}?seed=Merlin&chars=1&backgroundColor=7c3aed&textColor=ffffff`

type HumanBeat = {
  kind: "human"
  author: Person
  time: string
  body: ReactNode
  replyToIndex?: number
  replySnippet?: string
}

type MerlinBeat = {
  kind: "merlin"
  time: string
  tools: { source: ToolSource; label: string; meta: string }[]
}

type Beat = HumanBeat | MerlinBeat

const BEATS: Beat[] = [
  {
    kind: "human",
    author: MIRA,
    time: "9:42 AM",
    body: "what date did we land on for the redesign launch?",
  },
  {
    kind: "human",
    author: JACOB,
    time: "9:43 AM",
    body: "i thought the 21st? but qa pushed it back i think",
  },
  {
    kind: "human",
    author: SAM,
    time: "9:43 AM",
    body: "yeah we moved it, can't remember the new date though",
  },
  {
    kind: "human",
    author: SAM,
    time: "9:44 AM",
    replyToIndex: 0,
    replySnippet: "what date did we land on for the redesign launch?",
    body: (
      <>
        <Mention name="merlin" variant="merlin" /> can you confirm the launch
        date?
      </>
    ),
  },
  {
    kind: "merlin",
    time: "9:44 AM",
    tools: [
      {
        source: "linear",
        label: "Pulled Linear ticket",
        meta: "DESIGN-204 · Redesign launch",
      },
      {
        source: "notion",
        label: "Read launch plan",
        meta: "Q2 Redesign · Launch checklist",
      },
    ],
  },
]

function merlinInnerBeats(beat: MerlinBeat) {
  return 1 + beat.tools.length + 1
}

const TOTAL_STEPS = BEATS.reduce((acc, b) => {
  if (b.kind === "merlin") return acc + merlinInnerBeats(b)
  return acc + 1
}, 0)

// ---------------------------------------------------------------------------
// ChatDemo — flat, sticky chat that reveals as you scroll
// ---------------------------------------------------------------------------

export function ChatDemo() {
  const sectionRef = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(TOTAL_STEPS)
      return
    }
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const total = rect.height - window.innerHeight
        const traveled = Math.min(Math.max(-rect.top, 0), total)
        const p = total > 0 ? traveled / total : 0
        const next = Math.min(TOTAL_STEPS, Math.floor(p * (TOTAL_STEPS + 0.6)))
        setShown(next)
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  let cursor = 0
  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${100 + TOTAL_STEPS * 38}vh` }}
    >
      <div className="sticky top-0 flex h-[100dvh] flex-col justify-end overflow-hidden px-3 pb-10 sm:px-6 sm:pb-16">
        <div className="mx-auto flex w-full max-w-[760px] flex-col">
          <div className="flex flex-col pb-5">
            {BEATS.map((beat, i) => {
              const prev = BEATS[i - 1]
              const sameAuthorAsPrev =
                prev?.kind === "human" &&
                beat.kind === "human" &&
                prev.author.handle === beat.author.handle

              if (beat.kind === "human") {
                const step = cursor
                cursor += 1
                const replyTarget =
                  beat.replyToIndex !== undefined
                    ? BEATS[beat.replyToIndex]
                    : undefined
                const replyAuthor =
                  replyTarget && replyTarget.kind === "human"
                    ? replyTarget.author
                    : undefined
                return (
                  <RevealRow key={`h-${i}`} visible={step < shown}>
                    <HumanRow
                      author={beat.author}
                      time={beat.time}
                      compact={sameAuthorAsPrev}
                      isNewGroup={!sameAuthorAsPrev && i > 0}
                      replyAuthor={replyAuthor}
                      replySnippet={beat.replySnippet}
                    >
                      {beat.body}
                    </HumanRow>
                  </RevealRow>
                )
              }

              const headerStep = cursor
              const toolStartStep = cursor + 1
              const answerStep = cursor + 1 + beat.tools.length
              cursor += merlinInnerBeats(beat)

              return (
                <RevealRow key={`m-${i}`} visible={headerStep < shown}>
                  <MerlinRow time={beat.time} isNewGroup={i > 0}>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1.5">
                        {beat.tools.map((t, ti) => (
                          <SourcePill
                            key={t.source}
                            visible={toolStartStep + ti < shown}
                            source={t.source}
                            label={t.label}
                            meta={t.meta}
                          />
                        ))}
                      </div>
                      <RevealInline visible={answerStep < shown}>
                        <p className="pt-1 text-sm leading-relaxed text-foreground/90">
                          The launch moved to{" "}
                          <strong className="font-semibold text-foreground">
                            Tuesday, May 28
                          </strong>
                          . <Mention name="jacob" variant="user" /> updated
                          DESIGN-204 on Apr 24 after QA pushed it a week, and
                          the Q2 launch plan in Notion has the new date locked
                          in. QA gate is currently green — want me to remind the
                          team?
                        </p>
                      </RevealInline>
                    </div>
                  </MerlinRow>
                </RevealRow>
              )
            })}
          </div>
          <Composer />
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Rows — mirror apps/web/src/components/chat/message-item.tsx (no hover bg)
// ---------------------------------------------------------------------------

function HumanRow({
  author,
  time,
  compact,
  isNewGroup,
  replyAuthor,
  replySnippet,
  children,
}: {
  author: Person
  time: string
  compact: boolean
  isNewGroup: boolean
  replyAuthor?: Person
  replySnippet?: string
  children: ReactNode
}) {
  return (
    <div className={`px-2 py-0.5 ${isNewGroup ? "mt-2" : ""}`}>
      {replyAuthor && (
        <ReplyPreview author={replyAuthor} snippet={replySnippet ?? ""} />
      )}
      <div className="flex gap-3">
        {compact ? (
          <div className="w-10 shrink-0" aria-hidden />
        ) : (
          <Avatar size="lg" className="mt-0.5">
            <AvatarImage src={author.avatar} alt={author.handle} />
            <AvatarFallback
              delayMs={0}
              className="bg-foreground/[0.08] text-xs font-semibold text-foreground/85"
            >
              {author.initial}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          {!compact && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold leading-snug text-foreground">
                {author.handle}
              </span>
              <span className="text-xs text-muted-foreground">{time}</span>
            </div>
          )}
          <div className="text-sm leading-snug text-foreground/90">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyPreview({
  author,
  snippet,
}: {
  author: Person
  snippet: string
}) {
  return (
    <div className="mb-0.5 flex min-w-0 max-w-full items-center gap-1.5 text-xs">
      <div
        aria-hidden
        className="mb-1 ml-4 h-3 w-8 shrink-0 rounded-tl-md border-foreground/25 border-t-2 border-l-2"
      />
      <Avatar size="sm" className="size-4 shrink-0">
        <AvatarImage src={author.avatar} alt={author.handle} />
        <AvatarFallback
          delayMs={0}
          className="bg-foreground/[0.08] text-[8px] font-semibold text-foreground/85"
        >
          {author.initial}
        </AvatarFallback>
      </Avatar>
      <span className="shrink-0 font-semibold text-foreground/80">
        {author.handle}
      </span>
      <span className="truncate text-muted-foreground">{snippet}</span>
    </div>
  )
}

function MerlinRow({
  time,
  isNewGroup,
  children,
}: {
  time: string
  isNewGroup: boolean
  children: ReactNode
}) {
  return (
    <div className={`px-2 py-0.5 ${isNewGroup ? "mt-2" : ""}`}>
      <div className="flex gap-3">
        <Avatar size="lg" className="mt-0.5">
          <AvatarImage src={MERLIN_AVATAR} alt="merlin" />
          <AvatarFallback delayMs={0} className="bg-merlin/15 text-merlin">
            <Sparkles className="size-4" strokeWidth={2} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold leading-snug text-merlin">
              merlin
            </span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <div className="mt-0.5 text-sm leading-snug text-foreground/90">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mention pill
// ---------------------------------------------------------------------------

function Mention({
  name,
  variant,
}: {
  name: string
  variant: "user" | "merlin"
}) {
  const cls =
    variant === "merlin"
      ? "bg-merlin/15 text-merlin"
      : "bg-primary/15 text-primary"
  return (
    <span className={`inline-flex rounded px-1 py-0.5 font-medium ${cls}`}>
      @{name}
    </span>
  )
}

// ---------------------------------------------------------------------------
// SourcePill — compact source reference (no expand)
// ---------------------------------------------------------------------------

function SourceIcon({ source }: { source: ToolSource }) {
  if (source === "linear") return <LinearLogo className="size-3" mode="dark" />
  return (
    <span className="flex size-3 items-center justify-center overflow-hidden rounded-[2px] bg-foreground">
      <NotionLogo className="size-3" />
    </span>
  )
}

function SourcePill({
  source,
  label,
  meta,
  visible,
}: {
  source: ToolSource
  label: string
  meta: string
  visible: boolean
}) {
  return (
    <RevealInline visible={visible}>
      <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-foreground/[0.07] bg-foreground/[0.025] px-2.5 py-1.5">
        <span
          className="flex shrink-0 items-center text-foreground/85"
          aria-hidden
        >
          <SourceIcon source={source} />
        </span>
        <span className="shrink-0 text-[12px] font-medium text-foreground/85">
          {label}
        </span>
        <span className="shrink-0 text-foreground/30">·</span>
        <span className="truncate text-[12px] text-foreground/55">{meta}</span>
      </div>
    </RevealInline>
  )
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

function Composer() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-foreground/[0.08] bg-foreground/[0.02] p-1.5 pr-2 pl-2">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-md bg-foreground/[0.06] text-foreground/65"
      >
        <Plus className="size-4" strokeWidth={2} />
      </span>
      <span className="flex-1 px-1 text-[14px] text-foreground/40">
        Message #engineering
      </span>
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-md bg-foreground/[0.1] text-foreground/75"
      >
        <ArrowUp className="size-4" strokeWidth={2} />
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reveal helpers
// ---------------------------------------------------------------------------

function RevealRow({
  visible,
  children,
}: {
  visible: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible
          ? "translate-y-0 opacity-100 blur-0"
          : "translate-y-3 opacity-0 blur-[3px]"
      }`}
    >
      {children}
    </div>
  )
}

function RevealInline({
  visible,
  className = "",
  children,
}: {
  visible: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={`transition-[opacity,transform,filter] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible
          ? "translate-y-0 opacity-100 blur-0"
          : "pointer-events-none translate-y-1 opacity-0 blur-[2px]"
      } ${className}`}
    >
      {children}
    </div>
  )
}
