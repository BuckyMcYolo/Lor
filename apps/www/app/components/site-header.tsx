"use client"

import {
  MotionNavigationMenu,
  MotionNavigationMenuContent,
  MotionNavigationMenuItem,
  MotionNavigationMenuLink,
  MotionNavigationMenuList,
  MotionNavigationMenuTrigger,
} from "@repo/ui/components/unlumen-ui/motion-navigation-menu"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { LorMark } from "./lor-mark"

const EASE = "cubic-bezier(0.16,1,0.3,1)"
// Shared transition: 500ms on every animated property so the whole header
// "settles" together as the page scrolls.
const T = `transition-all duration-500 ease-[${EASE}]`

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Sentinel lives just below the top edge. When it leaves the viewport,
  // the pill condenses + materializes — no scroll listeners.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry?.isIntersecting),
      { threshold: 0, rootMargin: "0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute top-8 h-px w-px"
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <header
          data-scrolled={scrolled}
          className={[
            "pointer-events-auto flex items-center rounded-full",
            T,
            scrolled
              ? "gap-x-2 border border-foreground/[0.07] bg-background/55 py-1.5 pl-3 pr-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl backdrop-saturate-150"
              : "gap-x-4 border border-transparent bg-transparent py-2.5 pl-5 pr-2.5 shadow-none",
          ].join(" ")}
        >
          {/* Left: brand */}
          <Link
            href="/"
            aria-label="Lor — home"
            className={`group inline-flex items-center px-1 ${T} ${
              scrolled ? "gap-1.5" : "gap-2"
            }`}
          >
            <LorMark
              className={`text-foreground mb-1 ${
                scrolled ? "size-5" : "size-6"
              }`}
            />
            <span
              className={`font-cinzel font-medium text-foreground ${T} ${
                scrolled ? "text-[19px]" : "text-[23px]"
              }`}
            >
              Lor
            </span>
          </Link>

          {/* Divider — fades in only once condensed */}
          <span
            aria-hidden
            className={`mx-1 h-5 w-px bg-foreground/[0.08] ${T} ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Center: nav */}
          <MotionNavigationMenu springStiffness={350} springDamping={32} gooey>
            <MotionNavigationMenuList
              highlightClassName="rounded-full bg-foreground/[0.07]"
              className={`${T} ${scrolled ? "gap-0" : "gap-1"}`}
            >
              <MotionNavigationMenuItem value="product">
                <MotionNavigationMenuTrigger
                  className={`text-foreground/75 hover:text-foreground ${T} ${
                    scrolled
                      ? "px-3 py-1.5 text-[13px]"
                      : "px-4 py-2 text-[14px]"
                  }`}
                >
                  Product
                </MotionNavigationMenuTrigger>
                <MotionNavigationMenuContent highlightClassName="bg-foreground/[0.05] rounded-lg">
                  <div className="grid w-[420px] grid-cols-2 gap-1 p-1">
                    <MotionNavigationMenuLink
                      href="#channels"
                      className="rounded-lg p-3"
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        Channels
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-foreground/55">
                        The native surface. Threads, voice, the daily
                        back-and-forth.
                      </span>
                    </MotionNavigationMenuLink>
                    <MotionNavigationMenuLink
                      href="#merlin"
                      className="rounded-lg p-3"
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        Merlin
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-foreground/55">
                        The keeper. Reads everything, answers with citations.
                      </span>
                    </MotionNavigationMenuLink>
                    <MotionNavigationMenuLink
                      href="#integrations"
                      className="rounded-lg p-3"
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        Integrations
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-foreground/55">
                        GitHub, Linear, Notion. Permissions carry through.
                      </span>
                    </MotionNavigationMenuLink>
                    <MotionNavigationMenuLink
                      href="#self-host"
                      className="rounded-lg p-3"
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        Self-host
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-foreground/55">
                        AGPL, open source. Your corpus stays your corpus.
                      </span>
                    </MotionNavigationMenuLink>
                  </div>
                </MotionNavigationMenuContent>
              </MotionNavigationMenuItem>

              <MotionNavigationMenuItem value="resources">
                <MotionNavigationMenuTrigger
                  className={`text-foreground/75 hover:text-foreground ${T} ${
                    scrolled
                      ? "px-3 py-1.5 text-[13px]"
                      : "px-4 py-2 text-[14px]"
                  }`}
                >
                  Resources
                </MotionNavigationMenuTrigger>
                <MotionNavigationMenuContent highlightClassName="bg-foreground/[0.05] rounded-lg">
                  <div className="grid w-[320px] gap-1 p-1">
                    <MotionNavigationMenuLink
                      href="#docs"
                      className="rounded-lg p-3"
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        Docs
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-foreground/55">
                        Setup, self-hosting, API reference.
                      </span>
                    </MotionNavigationMenuLink>
                    <MotionNavigationMenuLink
                      href="#changelog"
                      className="rounded-lg p-3"
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        Changelog
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-foreground/55">
                        What shipped, when, and why.
                      </span>
                    </MotionNavigationMenuLink>
                    <MotionNavigationMenuLink
                      href="https://github.com/BuckyMcYolo/lor"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-3"
                    >
                      <span className="block text-[13px] font-medium text-foreground">
                        GitHub
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-foreground/55">
                        Source, issues, discussions.
                      </span>
                    </MotionNavigationMenuLink>
                  </div>
                </MotionNavigationMenuContent>
              </MotionNavigationMenuItem>

              <MotionNavigationMenuItem>
                <MotionNavigationMenuLink
                  href="#pricing"
                  className={`font-medium text-foreground/75 hover:text-foreground ${T} ${
                    scrolled
                      ? "px-3 py-1.5 text-[13px]"
                      : "px-4 py-2 text-[14px]"
                  }`}
                >
                  Pricing
                </MotionNavigationMenuLink>
              </MotionNavigationMenuItem>
            </MotionNavigationMenuList>
          </MotionNavigationMenu>

          {/* Divider */}
          <span
            aria-hidden
            className={`mx-1 h-5 w-px bg-foreground/[0.08] ${T} ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Right: CTA */}
          <a
            href="#waitlist"
            className={`group inline-flex items-center rounded-full bg-foreground font-medium text-background hover:bg-foreground/90 active:scale-[0.97] ${T} ${
              scrolled
                ? "gap-1.5 py-1.5 pl-3.5 pr-3 text-[12.5px]"
                : "gap-2 py-2 pl-4 pr-3.5 text-[14px]"
            }`}
          >
            Join waitlist
            <ArrowUpRight
              className={`${T} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                scrolled ? "size-3" : "size-3.5"
              }`}
              strokeWidth={1.75}
              aria-hidden
            />
          </a>
        </header>
      </div>
    </>
  )
}
