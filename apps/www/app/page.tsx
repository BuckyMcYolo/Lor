import { Badge } from "@repo/ui/components/badge"
import { Button } from "@repo/ui/components/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import {
  Download,
  Github,
  MessageSquare,
  Monitor,
  Smartphone,
  Users,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { CopyTerminal } from "./components/copy-terminal"

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/townhallicon.png"
              alt="Townhall"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-xl font-semibold tracking-tight">
              Townhall
            </span>
          </Link>
          <div className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#open-source"
              className="transition-colors hover:text-foreground"
            >
              Open Source
            </a>
            <Link
              href="/download"
              className="transition-colors hover:text-foreground"
            >
              Download
            </Link>
          </div>
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
            <a href="https://app.townhall.chat">Try in Browser</a>
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
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Where communities actually&nbsp;talk.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Open source group chat with real-time messaging, guilds, channels, and
          a native desktop app. No ads, no tracking, no nonsense.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/download">
              <Download className="size-4" />
              Download for Free
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="https://app.townhall.chat">Try in Browser</a>
          </Button>
        </div>
      </div>
      <div className="relative mt-16">
        <div className="absolute inset-0 -z-10 mx-auto max-w-4xl rounded-3xl bg-gradient-to-t from-primary/5 via-primary/10 to-transparent blur-3xl" />
        <div className="overflow-hidden rounded-xl border border-border/40 shadow-[0_-8px_30px_rgba(0,0,0,0.08),0_8px_30px_rgba(0,0,0,0.12)]">
          <Image
            src="/screenshot.png"
            alt="Townhall messaging interface"
            width={1920}
            height={1080}
            className="w-full"
            priority
          />
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    icon: MessageSquare,
    title: "Real-time Messaging",
    description:
      "Instant messages with reactions, replies, and rich media. Conversations happen in real time, the way they should.",
  },
  {
    icon: Users,
    title: "Guilds, Channels & DMs",
    description:
      "Organize your community with guilds, text channels, and categories. Send direct messages to anyone. Keep every conversation in the right place.",
  },
  {
    icon: Monitor,
    title: "Desktop App",
    description:
      "Native apps for macOS, Windows, and Linux. Fast, lightweight, and built for daily use.",
  },
  {
    icon: Smartphone,
    title: "Mobile App",
    description:
      "Take your communities on the go. iOS and Android apps are coming soon.",
    comingSoon: true,
  },
]

function Features() {
  return (
    <section id="features" className="bg-muted/30 py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built from scratch for communities that value simplicity and
            privacy.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border/50 bg-background shadow-sm"
            >
              <CardHeader>
                <feature.icon className="mb-2 size-10 text-primary" />
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  {"comingSoon" in feature && feature.comingSoon && (
                    <Badge variant="outline" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-[15px] leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductShowcase() {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for communities, not shareholders
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Your conversations are not training data. There are no algorithms
            deciding what you see. No face scans, no ID uploads, no credit card
            required. Just chat.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted/50">
          <div className="aspect-video">
            <Image
              src="/screenshot.png"
              alt="Townhall in action"
              width={1920}
              height={1080}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Townhall running on macOS — also available on Windows, Linux, and the
          web.
        </p>
      </div>
    </section>
  )
}

function OpenSource() {
  return (
    <section id="open-source" className="bg-muted/30 py-20 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Open source, forever
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Townhall is open source. The code is on GitHub. You can read every
            line, contribute, or run your own instance.
          </p>
        </div>
        <CopyTerminal />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Badge variant="outline">MIT Licensed</Badge>
          <Badge variant="outline">Self-hostable</Badge>
          <Badge variant="outline">Community Driven</Badge>
        </div>
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            asChild
            className="!bg-background"
          >
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
    <section className="border-t border-border/40 py-20 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to make the switch?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
          Download Townhall for your platform or try it instantly in your
          browser. Free forever.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/download">
              <Download className="size-4" />
              Download
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="https://app.townhall.chat">Try in Browser</a>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Image
            src="/townhallicon.png"
            alt="Townhall"
            width={28}
            height={28}
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
          <Link
            href="/download"
            className="transition-colors hover:text-foreground"
          >
            Download
          </Link>
          <a
            href="https://app.townhall.chat"
            className="transition-colors hover:text-foreground"
          >
            Try in Browser
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
        <Features />
        <ProductShowcase />
        <OpenSource />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
