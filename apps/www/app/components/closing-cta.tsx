import { Waitlist } from "./waitlist"

export function ClosingCTA() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-32 md:py-40">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="text-balance font-semibold text-4xl leading-[1.05] tracking-[-0.03em] md:text-[56px]">
          The lore is yours.
          <br />
          <span className="text-foreground/55">So is the keeper.</span>
        </h2>
        <p className="mt-6 max-w-md text-[15px] text-foreground/60 leading-relaxed">
          Private beta. Open source on GitHub. We send invites in small batches
          — drop your email and we&rsquo;ll get to you.
        </p>
        <div className="mt-10 w-full max-w-md">
          <Waitlist />
        </div>
      </div>
    </section>
  )
}
