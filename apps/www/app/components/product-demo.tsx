import { Play } from "lucide-react"

export function ProductDemo() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-foreground/[0.06] bg-card/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.03), transparent 70%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-foreground/[0.12] bg-foreground/[0.04] backdrop-blur-md">
              <Play
                className="size-5 translate-x-[1px] text-foreground/70"
                fill="currentColor"
                strokeWidth={0}
              />
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] text-foreground/40">
          A walkthrough is coming soon.
        </p>
      </div>
    </section>
  )
}
