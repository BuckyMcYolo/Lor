import { Button } from "@repo/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { Separator } from "@repo/ui/components/separator"
import { Download, ExternalLink, Github, Globe } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Download Townhall",
  description: "Download Townhall for macOS, Windows, or Linux.",
}

const VERSION = "0.1.0"
const RELEASES_URL = "https://github.com/BuckyMcYolo/townhall/releases"
const LATEST =
  "https://github.com/BuckyMcYolo/townhall/releases/latest/download"

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
    </svg>
  )
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z" />
    </svg>
  )
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.581 19.049c-.55-.446-.336-1.431-.907-1.917.553-3.365-.997-6.331-2.845-8.232-1.551-1.595-1.639-3.743-1.408-5.049.096-.553-.168-.918-.168-.918s-.199.04-.399.199c-.309.245-.62.678-.795 1.357-.273 1.065-.109 2.836.431 4.224.541 1.388.58 2.348.268 3.285-.312.937-.655 1.645-.862 2.724-.207 1.08-.135 1.983.018 2.716.153.733.478 1.53.478 1.53s-.293-.156-.621-.156c-.328 0-.738.156-.738.156s1.234 1.573 3.539 1.573c2.304 0 4.008-1.492 4.008-1.492zM8.584 19.5c.468 0 .553-.344.937-.344.384 0 .48.344.937.344.457 0 .936-.468.936-.468s-.288-.288-.576-.937c-.288-.648 0-1.404 0-1.404s-.732.12-1.297.12c-.564 0-1.296-.12-1.296-.12s.288.756 0 1.404c-.288.649-.577.937-.577.937s.468.468.936.468z" />
    </svg>
  )
}

const platforms = [
  {
    name: "macOS",
    icon: AppleIcon,
    subtitle: "Apple Silicon",
    description: "Download the .dmg installer for macOS 11+",
    href: `${LATEST}/Townhall_${VERSION}_aarch64.dmg`,
    note: "Need Intel? Check all releases below.",
  },
  {
    name: "Windows",
    icon: WindowsIcon,
    subtitle: "Windows 10+",
    description: "Download the .exe installer for Windows",
    href: `${LATEST}/Townhall_${VERSION}_x64-setup.exe`,
  },
  {
    name: "Linux",
    icon: LinuxIcon,
    subtitle: ".deb, .rpm, .AppImage",
    description: "Choose your format from the releases page",
    href: RELEASES_URL,
    external: true,
  },
]

export default function DownloadPage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
          <Button size="sm" asChild>
            <a href="https://app.townhall.chat">Try in Browser</a>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Download Townhall
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Available for macOS, Windows, and Linux. Free and open source.
          </p>
        </section>

        {/* Platform cards */}
        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {platforms.map((platform) => (
              <Card
                key={platform.name}
                className="flex flex-col border-border/40"
              >
                <CardHeader className="text-center">
                  <platform.icon className="mx-auto mb-3 size-12 text-foreground" />
                  <CardTitle>{platform.name}</CardTitle>
                  <CardDescription>{platform.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">
                    {platform.description}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto flex-col gap-2">
                  <Button className="w-full" asChild>
                    <a
                      href={platform.href}
                      {...("external" in platform && platform.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {"external" in platform && platform.external ? (
                        <ExternalLink className="size-4" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Download for {platform.name}
                    </a>
                  </Button>
                  <p className="min-h-4 text-center text-xs text-muted-foreground">
                    {"note" in platform && platform.note ? platform.note : ""}
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-6 text-center">
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="size-3.5" />
              All releases on GitHub
            </a>
          </div>
        </section>

        <Separator className="mx-auto max-w-4xl" />

        {/* Try in browser */}
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <Globe className="mx-auto mb-4 size-10 text-muted-foreground" />
          <h2 className="text-2xl font-bold tracking-tight">
            Don&apos;t want to download?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Try Townhall instantly in your browser — no installation required.
          </p>
          <div className="mt-8">
            <Button size="lg" variant="outline" asChild>
              <a href="https://app.townhall.chat">Open Townhall in Browser</a>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
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
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
