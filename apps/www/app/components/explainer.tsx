export function Explainer() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-28 md:py-36">
      <div className="mx-auto max-w-3xl">
        <p className="text-balance text-center font-medium text-2xl leading-[1.4] tracking-tight text-foreground/55 md:text-[34px] md:leading-[1.3]">
          Lor is team chat where the AI actually has context. Ask{" "}
          <span className="font-semibold text-merlin">Merlin</span> why you
          picked Postgres and it&rsquo;ll pull up the thread from last March,
          with <span className="text-foreground/95">citations</span>. Messages,
          docs, and your connected tools all feed in.{" "}
          <span className="text-foreground/95">Open source</span>, runs on your
          own infra.
        </p>
      </div>
    </section>
  )
}
