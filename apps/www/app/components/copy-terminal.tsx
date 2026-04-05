"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

const CLONE_COMMAND = "git clone https://github.com/BuckyMcYolo/townhall"

export function CopyTerminal() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(CLONE_COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto mt-10 max-w-lg overflow-hidden rounded-xl border border-border/60 shadow-lg">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/80 px-4 py-3">
        <div className="size-3 rounded-full bg-[#ff5f57]" />
        <div className="size-3 rounded-full bg-[#febc2e]" />
        <div className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-auto text-[11px] font-medium text-muted-foreground">
          zsh
        </span>
      </div>
      <div className="bg-[oklch(0.13_0.01_42)] px-5 py-4 font-mono text-[13px] leading-relaxed">
        {/* Copyable command line */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleCopy}
          onKeyDown={(e) => e.key === "Enter" && handleCopy()}
          className="group -mx-3 flex cursor-pointer items-center rounded-md px-3 py-1 transition-colors hover:bg-foreground/[0.06]"
        >
          <div className="flex-1">
            <span className="text-primary">~</span>
            <span className="text-muted-foreground"> $ </span>
            <span className="text-foreground">{CLONE_COMMAND}</span>
          </div>
          <span className="ml-2 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {copied ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </span>
        </div>

        <div className="mt-1 text-muted-foreground/60">
          Cloning into &apos;townhall&apos;...
        </div>
        <div className="mt-0.5 text-muted-foreground/60">
          remote: Enumerating objects: done.
        </div>
        <div className="mt-2">
          <span className="text-primary">~/townhall</span>
          <span className="text-muted-foreground"> $ </span>
          <span className="inline-block h-4 w-1.5 animate-pulse bg-foreground/70" />
        </div>
      </div>
    </div>
  )
}
