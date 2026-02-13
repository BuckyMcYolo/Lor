import { Button } from "@repo/ui/components/button"
import { Github } from "lucide-react"
import Image from "next/image"
import { WaitlistForm } from "./components/waitlist-form"

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Townhall"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <span className="text-2xl font-semibold tracking-tight">
            Townhall
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://github.com/BuckyMcYolo/townhall"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>
          <Button size="sm" asChild>
            <a href="#waitlist">Join Waitlist</a>
          </Button>
        </div>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32 lg:py-40">
      <div className="flex flex-col items-center text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Community chat. Nothing&nbsp;else.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          A free, open source chat app for communities of any size. No ads, no
          AI, no identity verification.
        </p>
        <div className="mt-10 flex w-full flex-col items-center">
          <WaitlistForm />
          <p className="mt-3 text-sm text-muted-foreground">
            Be the first to know when we launch. No spam, ever.
          </p>
        </div>
      </div>
      <div className="mt-16 overflow-hidden rounded-xl border border-border/40 shadow-[0_-8px_30px_rgba(0,0,0,0.08),0_8px_30px_rgba(0,0,0,0.12)]">
        <Image
          src="/screenshot.png"
          alt="Townhall messaging interface"
          width={1920}
          height={1080}
          className="w-full"
          priority
        />
      </div>
    </section>
  )
}

const pillars = [
  {
    statement: "No ads, no AI, no tracking",
    detail:
      "Your conversations are not training data. There are no algorithms deciding what you see. It\u0027s just a chat app.",
  },
  {
    statement: "No forced identity verification",
    detail:
      "No face scans, no ID uploads, no credit card required. Create an account and start chatting.",
  },
  {
    statement: "Free and open source",
    detail:
      "The code is public. You can read it, fork it, or host it yourself. Townhall Core is free because chat should be free.",
  },
]

function Pillars() {
  return (
    <section className="bg-muted/30 py-20 md:py-24">
      <div className="mx-auto max-w-4xl space-y-20 px-6 md:space-y-28">
        {pillars.map((pillar) => (
          <div key={pillar.statement} className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              {pillar.statement}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {pillar.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function OpenSource() {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Open source
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Townhall is open source. The code is on GitHub. You can read every
            line, contribute, or run your own instance.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-lg overflow-hidden rounded-lg border border-border/40">
          <div className="flex items-center gap-2 border-b border-border/40 bg-muted/50 px-4 py-2.5">
            <div className="size-3 rounded-full bg-border" />
            <div className="size-3 rounded-full bg-border" />
            <div className="size-3 rounded-full bg-border" />
            <span className="ml-2 text-xs text-muted-foreground">Terminal</span>
          </div>
          <div className="bg-card p-4 font-mono text-sm">
            <span className="text-muted-foreground">$</span>{" "}
            <span className="text-foreground">
              git clone https://github.com/BuckyMcYolo/townhall
            </span>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" size="lg" asChild>
            <a
              href="https://github.com/BuckyMcYolo/townhall"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" />
              View on GitHub
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section id="waitlist" className="border-t border-border/40 py-20 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to try it?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
          Join the waitlist. We&apos;ll let you know when Townhall is ready.
        </p>
        <div className="mt-10">
          <WaitlistForm />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-8">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Image
            src="/logo.png"
            alt="Townhall"
            width={32}
            height={32}
            className="rounded"
          />
          <span>&copy; {new Date().getFullYear()} Townhall</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a
            href="https://github.com/BuckyMcYolo/townhall"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Pillars />
        <OpenSource />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
