import { Sparkles } from "lucide-react"

export function Explainer() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-28 md:py-36">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-foreground/45">
          <Sparkles className="size-3.5 text-merlin" strokeWidth={2} />
          <span>What is Lor?</span>
        </div>
        <p className="text-balance font-medium text-2xl leading-[1.4] tracking-tight text-foreground/55 md:text-[34px] md:leading-[1.3]">
          Lor is{" "}
          <span className="text-foreground/95">
            team chat that doesn&rsquo;t forget
          </span>
          . Every message, doc, and integration feeds{" "}
          <span className="font-semibold text-merlin">Merlin</span> — an AI
          keeper that&rsquo;s read everything your team has ever decided and
          answers anything with{" "}
          <span className="text-foreground/95">citations</span>.{" "}
          <span className="text-foreground/95">Open source</span>,
          self-hostable, your data stays yours.
        </p>
      </div>
    </section>
  )
}
