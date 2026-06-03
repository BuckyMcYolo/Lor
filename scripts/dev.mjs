#!/usr/bin/env node
/**
 * Interactive dev launcher. Multi-select which apps to run, then spawns
 * `turbo run dev --filter=<each>` for the selected workspaces.
 *
 * Usage:
 *   pnpm dev              → interactive picker
 *   pnpm dev --all        → skip picker, run everything (minus desktop)
 *   pnpm dev api web      → skip picker, run just these (matches short names
 *                            or full package names like `@repo/api`)
 *
 * Last selection is remembered in `.cache/dev-selection.json` (gitignored)
 * and used as the default the next time you run interactively.
 */

import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { cancel, intro, isCancel, multiselect, outro } from "@clack/prompts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const CACHE_FILE = join(ROOT, ".cache", "dev-selection.json")

// Curated app list. Order = order shown in the picker.
const APPS = [
  { pkg: "@repo/api", short: "api", hint: "Hono API (8080)" },
  { pkg: "web", short: "web", hint: "Vite dashboard (3000)" },
  { pkg: "www", short: "www", hint: "Next.js marketing site (3001)" },
  { pkg: "@repo/realtime", short: "realtime", hint: "Socket.IO server (8000)" },
  { pkg: "@repo/worker", short: "worker", hint: "BullMQ background workers" },
  { pkg: "desktop", short: "desktop", hint: "Tauri desktop app" },
]

// Always launched alongside the picker selection. The frontend imports types
// from @repo/api-client's dist/, so this keeps those types in sync as API
// routes change.
const ALWAYS = ["@repo/api-client"]

const DEFAULT_SELECTION = ["@repo/api", "web", "@repo/realtime", "@repo/worker"]

function loadLastSelection() {
  try {
    if (!existsSync(CACHE_FILE)) return null
    const raw = readFileSync(CACHE_FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((p) => typeof p === "string")
  } catch {
    return null
  }
}

function saveSelection(pkgs) {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(pkgs, null, 2))
  } catch {
    // Cache write is best-effort. Don't block dev because of it.
  }
}

function runTurbo(packages) {
  const all = [...new Set([...ALWAYS, ...packages])]
  const filters = all.flatMap((p) => ["--filter", p])
  const args = ["run", "dev", ...filters]
  const child = spawn("turbo", args, {
    stdio: "inherit",
    cwd: ROOT,
    env: process.env,
  })
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      if (!child.killed) child.kill(sig)
    })
  }
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exit(code ?? 0)
  })
}

function resolveCliFlags() {
  const rawArgs = process.argv.slice(2)
  const runAll = rawArgs.includes("--all")
  const explicit = rawArgs
    .filter((a) => !a.startsWith("--"))
    .map((name) => {
      const match = APPS.find(
        (a) => a.short === name || a.pkg === name || a.pkg.endsWith(`/${name}`)
      )
      if (!match) {
        console.error(
          `Unknown app: "${name}". Available: ${APPS.map((a) => a.short).join(", ")}`
        )
        process.exit(1)
      }
      return match.pkg
    })
  return { runAll, explicit }
}

async function main() {
  const { runAll, explicit } = resolveCliFlags()

  if (runAll) {
    const pkgs = APPS.filter((a) => a.pkg !== "desktop").map((a) => a.pkg)
    runTurbo(pkgs)
    return
  }
  if (explicit.length > 0) {
    runTurbo(explicit)
    return
  }

  intro("lor dev")

  const last = loadLastSelection()
  const initialValues =
    last && last.length > 0
      ? last.filter((p) => APPS.some((a) => a.pkg === p))
      : DEFAULT_SELECTION

  const picked = await multiselect({
    message: "Which apps do you want to run?",
    options: APPS.map((a) => ({
      value: a.pkg,
      label: a.short,
      hint: a.hint,
    })),
    initialValues,
    required: true,
  })

  if (isCancel(picked)) {
    cancel("Aborted.")
    process.exit(0)
  }

  const selection = picked
  saveSelection(selection)
  outro(
    `Starting: ${selection
      .map((p) => APPS.find((a) => a.pkg === p)?.short ?? p)
      .join(", ")}`
  )
  runTurbo(selection)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
