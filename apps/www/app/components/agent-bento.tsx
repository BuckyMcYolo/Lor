import { AiBrain01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AWSCloudWatchLogo } from "@repo/ui/components/logos/aws-cloudwatch"
import { DatadogLogo } from "@repo/ui/components/logos/datadog"
import { GoogleLogo } from "@repo/ui/components/logos/google"
import { LinearLogo } from "@repo/ui/components/logos/linear"
import { NotionLogo } from "@repo/ui/components/logos/notion"
import { SentryLogo } from "@repo/ui/components/logos/sentry"
import { SlackLogo } from "@repo/ui/components/logos/slack"
import { CalendarClock, Github, Hash, Sparkles, Volume2 } from "lucide-react"
import type { ReactNode } from "react"

// Integration brands featured in the headline card. Order is left → right
// in the row; the `highlight` slot gets the prominent center treatment.
type IntegrationLogo = {
  name: string
  glyph: ReactNode
  scale: "shrink-most" | "shrink" | "highlight"
}

const INTEGRATION_LOGOS: IntegrationLogo[] = [
  {
    name: "GitHub",
    glyph: <Github className="size-7" strokeWidth={1.5} />,
    scale: "shrink-most",
  },
  {
    name: "Notion",
    glyph: (
      <span className="flex size-7 items-center justify-center overflow-hidden rounded-[4px] bg-foreground">
        <NotionLogo className="size-7" />
      </span>
    ),
    scale: "shrink",
  },
  {
    name: "Linear",
    glyph: <LinearLogo className="size-8" mode="dark" />,
    scale: "highlight",
  },
  {
    name: "Datadog",
    glyph: (
      <span className="text-foreground [&_path]:fill-current">
        <DatadogLogo className="size-7" mode="dark" />
      </span>
    ),
    scale: "shrink",
  },
  {
    name: "Sentry",
    glyph: (
      <span className="text-foreground [&_path]:fill-current">
        <SentryLogo className="size-7" mode="dark" />
      </span>
    ),
    scale: "shrink-most",
  },
]

// ---------------------------------------------------------------------------
// 1. Meet Merlin — full-width hero (col-span-8)
// ---------------------------------------------------------------------------

function MerlinCard() {
  return (
    <div className="group relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl border bg-card pt-4 pb-2 md:col-span-8 md:flex-row md:pt-8 md:pb-4 dark:bg-card/50">
      <div className="w-full max-w-md p-6 md:p-8">
        <h3 className="font-semibold text-xl tracking-wide">Meet Merlin</h3>
        <p className="mt-1 text-lg text-muted-foreground leading-tight">
          Your team&rsquo;s keeper. Reads every channel, ticket, and doc.
          Answers with citations.
        </p>
      </div>
      <div className="relative flex w-full flex-col items-start justify-center gap-4 overflow-hidden px-6 pb-6 md:max-w-xl md:px-8 md:pb-8">
        <div className="mask-r-from-0% text-nowrap font-medium text-lg tracking-tight md:text-3xl">
          <span className="bg-merlin/12 text-merlin">Ask anything.</span>{" "}
          <span className="text-muted-foreground">Cite everything.</span>
        </div>
        <div className="mask-b-from-60% relative w-full max-w-md space-y-1.5">
          <div className="flex items-center gap-3 rounded-lg border bg-background p-2 shadow-xs md:p-3">
            <Sparkles className="size-4 text-merlin" strokeWidth={2} />
            <div className="flex-1 text-muted-foreground text-sm">
              <span className="rounded bg-merlin/15 px-1 py-0.5 font-medium text-merlin">
                @merlin
              </span>{" "}
              Ask anything…
            </div>
            <div className="flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground shadow-sm">
              <span className="text-xs">⌘</span>K
            </div>
          </div>
          <div className="rounded-lg bg-accent/60 px-3 py-2.5 dark:bg-accent/40">
            <p className="text-sm leading-snug text-foreground/85">
              The launch moved to{" "}
              <span className="font-semibold text-foreground">May 28</span> — QA
              pushed it a week. Locked in by jacob.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded border border-foreground/[0.08] bg-background px-1.5 py-0.5 font-medium text-[10.5px]">
                <LinearLogo className="size-2.5" mode="dark" />
                DESIGN-204
              </span>
              <span className="inline-flex items-center gap-1.5 rounded border border-foreground/[0.08] bg-background px-1.5 py-0.5 font-medium text-[10.5px]">
                <span className="flex size-2.5 items-center justify-center overflow-hidden rounded-[2px] bg-foreground">
                  <NotionLogo className="size-2.5" />
                </span>
                Q2 Launch plan
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Connects to the tools you already use
// ---------------------------------------------------------------------------

function IntegrationsHeroCard() {
  return (
    <div className="group relative rounded-2xl border bg-background bg-[radial-gradient(50%_50%_at_45%_0%,--theme(--color-foreground/.05),transparent)] md:col-span-5 dark:bg-background">
      <div className="p-6">
        <h3 className="font-medium text-base leading-tight md:text-lg">
          <span>Connects to your stack.</span>{" "}
          <p className="text-muted-foreground">
            Merlin reads from the tools your team already lives in.
          </p>
        </h3>
      </div>
      <div className="relative flex h-64 items-center justify-center overflow-hidden">
        <div className="mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] relative flex size-full flex-col items-center justify-center">
          <div className="flex w-full items-center justify-center gap-3 px-4">
            {INTEGRATION_LOGOS.map((logo) => {
              if (logo.scale === "highlight") {
                return (
                  <div key={logo.name} className="relative">
                    <div className="flex size-18 shrink-0 items-center justify-center rounded-2xl border bg-background bg-[radial-gradient(75%_75%_at_0%_0%,--theme(--color-foreground/.1),transparent)] shadow-xs inset-shadow-2xs inset-shadow-foreground/10 transition-all duration-600 ease-in-out group-hover:scale-110 md:size-24 dark:inset-shadow-foreground/60">
                      {logo.glyph}
                    </div>
                    <div className="mt-1 text-center font-medium text-muted-foreground text-sm transition-all duration-600 ease-in-out group-hover:-mt-5">
                      {logo.name}
                    </div>
                    <div className="-z-1 absolute inset-0 rounded-2xl bg-merlin/10 blur-xl" />
                  </div>
                )
              }
              const scaleClass =
                logo.scale === "shrink-most"
                  ? "group-hover:scale-80 group-hover:opacity-80"
                  : "group-hover:scale-90 group-hover:opacity-90"
              return (
                <div
                  key={logo.name}
                  className={`flex size-18 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-xs inset-shadow-2xs inset-shadow-foreground/10 transition-all duration-600 ease-in-out md:size-24 dark:inset-shadow-foreground/60 ${scaleClass}`}
                >
                  {logo.glyph}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Automatic context
// ---------------------------------------------------------------------------

function ContextRow({
  icon,
  label,
  translate,
  bg,
}: {
  icon: ReactNode
  label: string
  translate: string
  bg: string
}) {
  return (
    <div
      className={`flex h-16 items-center rounded-xl border px-4 pt-3 shadow-xs transition-all duration-600 ease-in-out group-hover:h-12 group-hover:translate-x-0 group-hover:rounded-lg group-hover:pt-0 ${translate} ${bg}`}
    >
      <div className="flex items-center gap-2 [&_svg]:size-4">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
    </div>
  )
}

function ContextCard() {
  return (
    <div className="group relative rounded-2xl border bg-card md:col-span-3 dark:bg-card/50">
      <div className="relative flex h-64 items-center justify-center overflow-hidden">
        <div className="-space-y-2 relative size-full p-4 group-hover:space-y-2">
          <ContextRow
            icon={<Hash />}
            label="#engineering"
            translate="translate-x-1/2"
            bg="bg-background bg-[radial-gradient(80%_80%_at_10%_0%,--theme(--color-foreground/.08),transparent)]"
          />
          <ContextRow
            icon={<LinearLogo className="size-4" mode="dark" />}
            label="DESIGN-204"
            translate="translate-x-1/3"
            bg="bg-background bg-[radial-gradient(25%_80%_at_10%_0%,--theme(--color-foreground/.08),transparent)]"
          />
          <ContextRow
            icon={
              <span className="flex size-4 items-center justify-center overflow-hidden rounded-[2px] bg-foreground">
                <NotionLogo className="size-4" />
              </span>
            }
            label="Q2 Launch plan"
            translate="translate-x-1/4"
            bg="bg-card"
          />
          <ContextRow
            icon={<Volume2 />}
            label="Daily Sync transcript"
            translate="translate-x-1/5"
            bg="bg-merlin text-merlin-foreground"
          />
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-medium text-base leading-tight md:text-lg">
          <span>Always in context.</span>{" "}
          <span className="text-muted-foreground">
            Merlin reads every channel, ticket, and doc — automatically.
          </span>
        </h3>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Long-term memory
// ---------------------------------------------------------------------------

function MemoryCard() {
  return (
    <div className="group relative rounded-2xl border bg-card md:col-span-4 dark:bg-card/50">
      <div className="relative flex h-64 items-center justify-center overflow-hidden">
        <div className="flex size-full items-center justify-center p-6">
          <div className="mask-b-from-50% h-50 w-full max-w-50 space-y-3 transition-all duration-600 ease-in-out group-hover:max-w-72 group-hover:scale-108">
            <div className="flex size-12 items-center justify-center rounded-md border bg-background text-merlin shadow-xs">
              <HugeiconsIcon icon={AiBrain01Icon} size={22} strokeWidth={2} />
            </div>
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-merlin">merlin</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">3 months ago</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              "Pricing for ACME: $32k/yr, locked in by jacob in #sales on Feb 4.
              Renewal is Apr 18." I still remember every decision your team has
              made.
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-medium text-base leading-tight md:text-lg">
          <span>Long-term memory.</span>{" "}
          <span className="text-muted-foreground">
            Three months from now, Merlin still remembers the decision you made
            today.
          </span>
        </h3>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. Takes action
// ---------------------------------------------------------------------------

function ActionPill({
  icon,
  label,
  className = "",
}: {
  icon?: ReactNode
  label?: string
  className?: string
}) {
  return (
    <div
      className={`flex h-12 items-center gap-2 rounded-lg border bg-background px-4 shadow-xs ${className}`}
    >
      <div className="*:size-4">{icon}</div>
      {label ? (
        <span className="whitespace-nowrap font-medium text-xs">{label}</span>
      ) : null}
    </div>
  )
}

function ActionsCard() {
  return (
    <div className="group relative rounded-2xl border bg-card md:col-span-4 dark:bg-card/50">
      <div className="p-6">
        <h3 className="font-medium text-base leading-tight md:text-lg">
          <span>Takes action.</span>{" "}
          <span className="text-muted-foreground">
            Open tickets, draft messages, schedule reminders. Merlin doesn't
            just answer — it acts.
          </span>
        </h3>
      </div>
      <div className="relative flex h-64 items-center justify-center overflow-hidden">
        <div className="grid size-full translate-x-1/6 grid-cols-1 gap-1 pt-2 transition-all duration-600 ease-in-out *:flex *:w-full *:gap-1 group-hover:-mt-1 group-hover:translate-x-0 group-hover:scale-98 group-hover:px-4 group-hover:pt-0">
          <div>
            <ActionPill
              icon={<LinearLogo className="size-4" mode="dark" />}
              label="Open Linear ticket"
              className="bg-[radial-gradient(80%_100%_at_20%_0%,--theme(--color-foreground/.1),transparent)]"
            />
            <ActionPill className="w-full" />
          </div>
          <div>
            <ActionPill className="w-full" />
            <ActionPill
              icon={<SlackLogo className="size-4" />}
              label="Pull Slack history"
              className="bg-[radial-gradient(80%_100%_at_50%_0%,--theme(--color-foreground/.1),transparent)]"
            />
            <ActionPill className="w-full" />
          </div>
          <div>
            <ActionPill
              icon={<DatadogLogo className="size-4" mode="dark" />}
              label="Check Datadog spike"
              className="bg-[radial-gradient(80%_100%_at_50%_0%,--theme(--color-foreground/.1),transparent)]"
            />
            <ActionPill
              icon={<SentryLogo className="size-4" mode="dark" />}
              label="Triage Sentry error"
              className="opacity-60"
            />
            <ActionPill className="w-full" />
          </div>
          <div>
            <ActionPill className="w-1/4" />
            <ActionPill
              icon={
                <span className="flex size-4 items-center justify-center overflow-hidden rounded-[2px] bg-foreground">
                  <NotionLogo className="size-4" />
                </span>
              }
              label="Update launch plan"
              className="bg-[radial-gradient(50%_80%_at_20%_10%,--theme(--color-foreground/.1),transparent)]"
            />
            <ActionPill
              icon={<GoogleLogo className="size-4" />}
              label="Draft Gmail reply"
              className="opacity-60"
            />
            <ActionPill className="w-full" />
          </div>
          <div>
            <ActionPill className="w-1/6" />
            <ActionPill
              icon={<AWSCloudWatchLogo className="size-4 rounded-[2px]" />}
              label="Pull CloudWatch logs"
              className="bg-[radial-gradient(50%_80%_at_20%_10%,--theme(--color-foreground/.1),transparent)]"
            />
            <ActionPill
              icon={<CalendarClock className="text-muted-foreground" />}
              label="Remind me Tuesday"
              className="opacity-60"
            />
            <ActionPill
              icon={<Hash className="text-muted-foreground" />}
              label="Post in #launch"
              className="opacity-40"
            />
            <ActionPill className="w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

export function AgentBento() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-8">
        <MerlinCard />
        <IntegrationsHeroCard />
        <ContextCard />
        <MemoryCard />
        <ActionsCard />
      </div>
    </section>
  )
}
