#!/usr/bin/env node
import { spawn } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { intro, isCancel, multiselect, outro } from "@clack/prompts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const collectDevTargets = (workspaceDir) => {
  const dir = join(root, workspaceDir)
  return readdirSync(dir)
    .map((name) => {
      const pkgPath = join(dir, name, "package.json")
      try {
        if (!statSync(pkgPath).isFile()) return null
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
        if (!pkg.scripts?.dev) return null
        return { name: pkg.name, dir: workspaceDir, hint: pkg.scripts.dev }
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

const targets = [...collectDevTargets("apps"), ...collectDevTargets("packages")]

intro("lor dev")

const selected = await multiselect({
  message: "Select which workspaces to run (space to toggle, enter to confirm)",
  options: targets.map((t) => ({
    value: t.name,
    label: `${t.name}`,
    hint: t.hint,
  })),
  required: true,
})

if (isCancel(selected) || selected.length === 0) {
  outro("Nothing selected — exiting")
  process.exit(0)
}

const filterArgs = selected.flatMap((name) => ["--filter", name])
const args = ["run", "dev", ...filterArgs]

outro(`turbo ${args.join(" ")}`)

const child = spawn("turbo", args, {
  stdio: "inherit",
  cwd: root,
  env: process.env,
})

const forward = (sig) => {
  if (!child.killed) child.kill(sig)
}
process.on("SIGINT", () => forward("SIGINT"))
process.on("SIGTERM", () => forward("SIGTERM"))

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
