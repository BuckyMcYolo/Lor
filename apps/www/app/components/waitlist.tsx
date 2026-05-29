"use client"

import { ArrowRight, Check, Loader2 } from "lucide-react"
import { type FormEvent, useState } from "react"
import { apiClient } from "@/lib/api-client"

type Status = "idle" | "loading" | "success" | "error"

export function Waitlist() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || status === "loading" || status === "success") return
    setStatus("loading")
    setErrorMessage("")
    try {
      const res = await apiClient.waitlist.$post({ json: { email } })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        setErrorMessage(
          typeof data?.error === "string" ? data.error : "Something went wrong."
        )
        setStatus("error")
        return
      }
      setStatus("success")
    } catch {
      setErrorMessage("Couldn't reach the server. Try again in a moment.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-gold/[0.08] px-5 py-3 text-[14px] font-medium text-gold/95 ring-1 ring-gold/25 backdrop-blur-md">
        <Check className="size-3.5" strokeWidth={2} />
        You&rsquo;re on the list. We&rsquo;ll be in touch.
      </div>
    )
  }

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-1.5 rounded-full bg-foreground/[0.04] p-1.5 ring-1 ring-foreground/10 backdrop-blur-md transition-[background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-foreground/[0.07] focus-within:ring-foreground/20 focus-within:shadow-[0_0_60px_-20px_oklch(var(--primary)/0.5)]"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-[14.5px] text-foreground placeholder:text-foreground/40 focus:outline-none"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary py-2 pl-4 pr-3.5 text-[13.5px] font-medium text-primary-foreground transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary/95 active:scale-[0.97] disabled:opacity-60"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              <span>Joining</span>
            </>
          ) : (
            <>
              <span>Join waitlist</span>
              <ArrowRight
                className="size-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
                strokeWidth={1.75}
              />
            </>
          )}
        </button>
      </form>
      {status === "error" && errorMessage && (
        <p className="mt-3 text-center text-[12.5px] text-foreground/55">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
