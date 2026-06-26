import Image from "next/image"
import { AgentBento } from "@/app/components/agent-bento"
import { ClosingCTA } from "@/app/components/closing-cta"
import { ProductDemo } from "@/app/components/product-demo"
import { Reveal } from "@/app/components/reveal"
import { SiteFooter } from "@/app/components/site-footer"
import { Waitlist } from "@/app/components/waitlist"

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
          <h1 className="max-w-[20ch] text-balance font-cinzel text-5xl font-semibold leading-[1.04] tracking-normal sm:text-6xl md:text-[78px]">
            Every great journey needs a guide.
            <br />
            {/*<span className="text-foreground/55">Lor is yours.</span>*/}
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
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Hero />
      <ProductDemo />
      <AgentBento />
      <ClosingCTA />
      <SiteFooter />
    </div>
  )
}
