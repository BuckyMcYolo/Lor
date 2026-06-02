"use client"

import { cn } from "@repo/ui/lib/utils"
import { MonitorIcon, MoonStarIcon, SunIcon } from "lucide-react"
import { motion } from "motion/react"
import { useTheme } from "next-themes"
import type { JSX, MouseEvent } from "react"
import { useEffect, useState } from "react"

type DocumentWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> }
}

function applyThemeWithTransition(
  event: MouseEvent<HTMLButtonElement>,
  apply: () => void
) {
  const doc = document as DocumentWithViewTransition
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  if (reduced || typeof doc.startViewTransition !== "function") {
    apply()
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  const root = document.documentElement
  root.style.setProperty("--vt-x", `${x}px`)
  root.style.setProperty("--vt-y", `${y}px`)
  root.style.setProperty("--vt-r", `${endRadius}px`)

  doc.startViewTransition(apply)
}

function ThemeOption({
  icon,
  value,
  isActive,
  onClick,
}: {
  icon: JSX.Element
  value: string
  isActive?: boolean
  onClick: (value: string, event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex size-8 cursor-pointer items-center justify-center rounded-full transition-all [&_svg]:size-4",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-pressed={isActive}
      aria-label={`Switch to ${value} theme`}
      onClick={(event) => onClick(value, event)}
    >
      {icon}

      {isActive && (
        <motion.div
          layoutId="theme-option"
          transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
          className="absolute inset-0 rounded-full border border-border"
        />
      )}
    </button>
  )
}

const THEME_OPTIONS = [
  {
    icon: <MonitorIcon />,
    value: "system",
  },
  {
    icon: <SunIcon />,
    value: "light",
  },
  {
    icon: <MoonStarIcon />,
    value: "dark",
  },
]

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="flex h-8 w-24" />
  }

  const handleSelect = (
    value: string,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    if (value === theme) return
    applyThemeWithTransition(event, () => setTheme(value))
  }

  return (
    <motion.div
      key={String(isMounted)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center overflow-hidden rounded-full bg-background ring-1 ring-border ring-inset"
    >
      {THEME_OPTIONS.map((option) => (
        <ThemeOption
          key={option.value}
          icon={option.icon}
          value={option.value}
          isActive={theme === option.value}
          onClick={handleSelect}
        />
      ))}
    </motion.div>
  )
}

export { ThemeSwitcher }
