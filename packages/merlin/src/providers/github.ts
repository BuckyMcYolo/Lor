import { env } from "@repo/env/server"
import { App } from "octokit"
import type { SourceProvider } from "./types"

// One App, lazily built from env. Null when the App isn't configured — callers
// then fall back to the stored summary.
let cachedApp: App | null | undefined
function getApp(): App | null {
  if (cachedApp !== undefined) return cachedApp
  const appId = env.GITHUB_APP_ID
  const privateKey = env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n")
  cachedApp = appId && privateKey ? new App({ appId, privateKey }) : null
  return cachedApp
}

const MAX_CONTENT = 8000
const MAX_COMMENTS = 10

function clip(s: string): string {
  return s.length > MAX_CONTENT ? `${s.slice(0, MAX_CONTENT)}\n…(truncated)` : s
}

// externalId is "owner/repo#<number>" (PR/issue) or "owner/repo@<id>" (release).
function parseRef(externalId: string, sep: "#" | "@") {
  const [ownerRepo, tail] = externalId.split(sep)
  const [owner, repo] = (ownerRepo ?? "").split("/")
  const id = Number(tail)
  if (!owner || !repo || !Number.isFinite(id)) return null
  return { owner, repo, id }
}

export const githubProvider: SourceProvider = {
  async fetchContent(source, connection) {
    const app = getApp()
    if (!app) return null
    const installationId = Number(connection.externalId)
    if (!Number.isFinite(installationId)) return null
    const octokit = await app.getInstallationOctokit(installationId)

    if (source.kind === "pull_request") {
      const ref = parseRef(source.externalId, "#")
      if (!ref) return null
      const { data } = await octokit.rest.pulls.get({
        owner: ref.owner,
        repo: ref.repo,
        pull_number: ref.id,
      })
      const state = data.merged ? "merged" : data.state
      let out = `# ${data.title}\nState: ${state} · by ${data.user?.login ?? "unknown"}\n\n${data.body ?? "(no description)"}`
      // PRs are issues under the hood — the conversation thread plus the
      // inline code-review comments are the discussion we want as memory.
      const [comments, reviewComments] = await Promise.all([
        octokit.rest.issues
          .listComments({
            owner: ref.owner,
            repo: ref.repo,
            issue_number: ref.id,
            per_page: MAX_COMMENTS,
          })
          .then((r) => r.data)
          .catch(() => []),
        octokit.rest.pulls
          .listReviewComments({
            owner: ref.owner,
            repo: ref.repo,
            pull_number: ref.id,
            per_page: MAX_COMMENTS,
          })
          .then((r) => r.data)
          .catch(() => []),
      ])
      for (const cm of comments) {
        out += `\n\n— ${cm.user?.login ?? "unknown"}: ${cm.body ?? ""}`
      }
      for (const rc of reviewComments) {
        out += `\n\n— ${rc.user?.login ?? "unknown"} on ${rc.path}: ${rc.body ?? ""}`
      }
      return clip(out)
    }

    if (source.kind === "issue") {
      const ref = parseRef(source.externalId, "#")
      if (!ref) return null
      const { data } = await octokit.rest.issues.get({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: ref.id,
      })
      let out = `# ${data.title}\nState: ${data.state} · by ${data.user?.login ?? "unknown"}\n\n${data.body ?? "(no description)"}`
      const comments = await octokit.rest.issues
        .listComments({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: ref.id,
          per_page: MAX_COMMENTS,
        })
        .then((r) => r.data)
        .catch(() => [])
      for (const cm of comments) {
        out += `\n\n— ${cm.user?.login ?? "unknown"}: ${cm.body ?? ""}`
      }
      return clip(out)
    }

    if (source.kind === "release") {
      const ref = parseRef(source.externalId, "@")
      if (!ref) return null
      const { data } = await octokit.rest.repos.getRelease({
        owner: ref.owner,
        repo: ref.repo,
        release_id: ref.id,
      })
      return clip(
        `# ${data.name ?? data.tag_name}\n\n${data.body ?? "(no notes)"}`
      )
    }

    return null
  },

  async verifyConnection(connection) {
    const app = getApp()
    if (!app) return null
    const installationId = Number(connection.externalId)
    if (!Number.isFinite(installationId)) return null
    try {
      const { data } = await app.octokit.rest.apps.getInstallation({
        installation_id: installationId,
      })
      const account = data.account
      const accountLabel = account && "login" in account ? account.login : null
      return { accountLabel }
    } catch {
      return null
    }
  },
}
