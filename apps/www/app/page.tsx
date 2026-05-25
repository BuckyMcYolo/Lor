import { ArrowUpRight, Github } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { Reveal } from "./components/reveal"
import { Waitlist } from "./components/waitlist"

const GITHUB_URL = "https://github.com/BuckyMcYolo/lor"

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`text-[15px] font-semibold tracking-[-0.02em] ${className}`}
    >
      Lor
    </Link>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-gold/85">
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Hero — full-bleed image, atmospheric type, waitlist as the only action
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <Image
        src="/lor-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-center"
      />
      {/* Radial focal vignette — darkens where text lives, leaves the wizard and city alone */}
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 82% 60% at 50% 32%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.18) 62%, transparent 88%)",
        }}
      />
      {/* Bottom fade into the next section */}
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-b from-transparent to-background"
      />

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center md:pb-32">
        <Reveal>
          <h1 className="max-w-[18ch] text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-6xl md:text-[88px]">
            Your team&rsquo;s lore,
            <br />
            <span className="text-foreground/55">remembered.</span>
          </h1>
        </Reveal>
        <Reveal delay={220}>
          <p className="mt-8 max-w-[46ch] text-balance text-[16.5px] leading-[1.6] text-foreground/80 sm:text-[18px]">
            Lor turns your company&rsquo;s chat, docs, and decisions into a
            brain that answers and acts.
          </p>
        </Reveal>
        <Reveal delay={400}>
          <div className="mt-10 w-full max-w-md">
            <Waitlist />
          </div>
        </Reveal>
        <Reveal delay={540}>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 text-[13px] text-foreground/55 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground/90"
          >
            <Github className="size-3.5" strokeWidth={1.5} />
            Open source
            <ArrowUpRight className="size-3 opacity-70" strokeWidth={1.5} />
          </a>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Lore — single editorial passage. No header, no eyebrow. Just prose.
// ---------------------------------------------------------------------------

function Lore() {
  return (
    <section className="relative py-32 md:py-52">
      <div className="mx-auto max-w-2xl px-6">
        <Reveal>
          <p className="text-balance text-[26px] font-medium leading-[1.4] tracking-[-0.018em] text-foreground/90 sm:text-[30px] md:text-[36px] md:leading-[1.35]">
            Software is the longest conversation your team will ever have.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <p className="mt-12 text-balance text-[19px] leading-[1.65] text-foreground/60 sm:text-[21px]">
            Most of it is forgotten. Written down somewhere &mdash; but
            somewhere is everywhere. The thread that explained the call. The
            voice that asked the question. The reason it was built this way.
          </p>
        </Reveal>
        <Reveal delay={380}>
          <p className="mt-7 text-balance text-[19px] leading-[1.65] text-foreground/60 sm:text-[21px]">
            When the people leave, the lore leaves with them.
          </p>
        </Reveal>
        <Reveal delay={560}>
          <p className="mt-12 text-balance text-[22px] font-medium leading-[1.45] tracking-[-0.015em] text-foreground sm:text-[26px]">
            Lor is built so it doesn&rsquo;t.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Merlin — typography-only vignette, no chrome
// ---------------------------------------------------------------------------

function Merlin() {
  return (
    <section
      id="merlin"
      className="relative overflow-hidden border-t border-foreground/[0.06] py-32 md:py-52"
    >
      {/* Faint star-field gesture back to the hero sky */}
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 25%, rgba(255,255,255,0.08) 1px, transparent 1.5px), radial-gradient(circle at 75% 60%, rgba(255,255,255,0.05) 1px, transparent 1.5px), radial-gradient(circle at 35% 80%, rgba(255,255,255,0.04) 1px, transparent 1.5px)",
          backgroundSize: "140px 140px, 220px 220px, 180px 180px",
        }}
      />
      {/* Soft violet bloom — the keeper's lamp */}
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute left-1/2 top-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[180px]"
      />

      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <Eyebrow>Merlin</Eyebrow>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl md:text-[80px]">
            The keeper.
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="mx-auto mt-9 max-w-xl text-[17px] leading-[1.65] text-foreground/65">
            An agent that has read every thread, doc, and commit your team has
            ever produced. Ask anything about the past &mdash; it answers from
            the actual record, cites what it sees, and tells you when it
            doesn&rsquo;t know.
          </p>
        </Reveal>

        {/* Vignette — typography-only Q&A floating in space, no card chrome */}
        <Reveal delay={420}>
          <div className="mx-auto mt-24 max-w-xl space-y-9 text-left md:mt-28">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-foreground/35">
                You
              </div>
              <p
                className="mt-3 text-[18px] leading-[1.55] text-foreground/90 md:text-[20px]"
                style={{
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                why did we move off Mongo in 2024?
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-gold/85">
                Merlin
              </div>
              <p className="mt-3 text-[18px] leading-[1.65] text-foreground/90 md:text-[20px]">
                Cross-document writes on the orders flow caused two
                partial-write incidents in August. The team migrated to Postgres
                with logical replication; the call was reaffirmed at the Q4
                architecture review.
              </p>
              <div
                className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-foreground/40"
                style={{
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                <span>#eng-arch &middot; 2024-08-12</span>
                <span className="text-foreground/25">·</span>
                <span>RFC-12.md</span>
                <span className="text-foreground/25">·</span>
                <span>PR #2114</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Journey — three vertical chapters, no grid, massive space between
// ---------------------------------------------------------------------------

function Chapter({
  mark,
  title,
  body,
  index,
}: {
  mark: string
  title: string
  body: string
  index: number
}) {
  return (
    <Reveal delay={index * 60}>
      <div className={index > 0 ? "mt-32 md:mt-48" : ""}>
        <div
          className="text-[11px] font-medium tracking-[0.32em] text-gold/80"
          style={{
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          }}
        >
          {mark}
        </div>
        <h3 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl md:text-[60px]">
          {title}
        </h3>
        <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-foreground/60 md:text-[18px]">
          {body}
        </p>
      </div>
    </Reveal>
  )
}

function Journey() {
  return (
    <section
      id="how"
      className="relative border-t border-foreground/[0.06] py-32 md:py-52"
    >
      <div className="mx-auto max-w-3xl px-6">
        <Chapter
          index={0}
          mark="I"
          title="It's where your team talks."
          body="Lor is your company's chat — channels, threads, the daily back-and-forth your team already has. And it reads everything next to it: GitHub, Linear, Notion, every doc and closed ticket. Nothing new to write. The record builds itself."
        />
        <Chapter
          index={1}
          mark="II"
          title="It compounds."
          body="Memory here isn't a transcript — it's understanding that stacks up. The decision, and the constraint behind it. The thread that changed someone's mind. A year in, Lor knows your company better than any one person on the team. That's not something a competitor ships in an update. It's time only your team has spent."
        />
        <Chapter
          index={2}
          mark="III"
          title="Nobody takes it with them."
          body="People move on. Context used to go with them — in their heads, their DMs, the laptop that got wiped. Now it stays. Ask Merlin, and the answer comes back with receipts: the channel, the doc, the commit. The lore your team paid to learn, the moment you need it."
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Pricing — single editorial line, no cards
// ---------------------------------------------------------------------------

function Pricing() {
  return (
    <section
      id="pricing"
      className="relative border-t border-foreground/[0.06] py-32 md:py-52"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <Eyebrow>Pricing</Eyebrow>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-7 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl md:text-[64px]">
            Free if you self-host.
            <br />
            <span className="text-foreground/45">
              $18 a seat if you don&rsquo;t.
            </span>
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="mx-auto mt-8 max-w-md text-[17px] leading-[1.6] text-foreground/65">
            Same source. Same product. You pick where it runs.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Open source — a quiet statement, not a feature list
// ---------------------------------------------------------------------------

function OpenSource() {
  return (
    <section
      id="open-source"
      className="relative overflow-hidden border-t border-foreground/[0.06] py-32 md:py-52"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[160px]"
      />
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Reveal>
          <Eyebrow>Open source</Eyebrow>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-7 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl md:text-[60px]">
            Yours to read.
            <br />
            <span className="text-foreground/45">Yours to run.</span>
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="mx-auto mt-8 max-w-lg text-[17px] leading-[1.65] text-foreground/65">
            Lor is AGPL. The source is open because your trust shouldn&rsquo;t
            depend on our word alone.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <div className="mt-12 flex justify-center">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground/[0.05] px-6 py-3 text-[14px] font-medium text-foreground/90 ring-1 ring-foreground/10 backdrop-blur-md transition-[transform,background-color,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/[0.09] hover:text-foreground active:scale-[0.98]"
            >
              <Github className="size-4" strokeWidth={1.25} />
              <span>See the source</span>
              <ArrowUpRight
                className="size-3.5 opacity-60 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={1.5}
              />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Closing summons — waitlist again, quietly
// ---------------------------------------------------------------------------

function Summons() {
  return (
    <section className="relative border-t border-foreground/[0.06] py-32 md:py-52">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Reveal>
          <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl md:text-[64px]">
            Keep your lore.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-7 max-w-md text-[16px] leading-[1.6] text-foreground/65">
            We&rsquo;re early. Leave a note and we&rsquo;ll write when
            there&rsquo;s something worth saying.
          </p>
        </Reveal>
        <Reveal delay={260}>
          <div className="mx-auto mt-10 max-w-md">
            <Waitlist />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-foreground/[0.06] py-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 text-[12.5px] text-foreground/45">
        <div className="flex items-center gap-3">
          <Wordmark className="text-foreground/80" />
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground/85"
        >
          GitHub
        </a>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Hero />
      <main className="flex-1">
        <Lore />
        <Merlin />
        <Journey />
        <Pricing />
        <OpenSource />
        <Summons />
      </main>
      <Footer />
    </div>
  )
}
