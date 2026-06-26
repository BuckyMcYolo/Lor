import { Webhooks } from "@octokit/webhooks"
import { env } from "@repo/env/server"
import { createRouter } from "@/lib/helpers/app/create-app"
import { logger } from "@/lib/logger"
import { registerGithubHandlers } from "./events"

const githubRouter = createRouter()

// Cap the (unauthenticated) webhook body. Our salient events are well under
// this; GitHub's own max is ~25MB. Guards against oversized-payload abuse.
const MAX_WEBHOOK_BYTES = 5 * 1024 * 1024

// One Webhooks instance; handlers registered once. Null when the secret is
// unset (only the webhook path needs it) — the route then 503s.
const webhooks = env.GITHUB_WEBHOOK_SECRET
  ? new Webhooks({ secret: env.GITHUB_WEBHOOK_SECRET })
  : null
if (webhooks) registerGithubHandlers(webhooks)

// Plain (non-OpenAPI) route: the webhook needs the raw body for signature
// verification, and it's authenticated by the signature, not a session.
githubRouter.post("/integrations/github/webhook", async (c) => {
  if (!webhooks) {
    logger.error("GITHUB_WEBHOOK_SECRET not set; rejecting webhook")
    return c.json({ ok: false }, 503)
  }

  if (Number(c.req.header("content-length") ?? 0) > MAX_WEBHOOK_BYTES) {
    return c.json({ ok: false }, 413)
  }

  const raw = await c.req.text()
  const signature = c.req.header("x-hub-signature-256") ?? ""
  if (!(await webhooks.verify(raw, signature))) {
    return c.json({ ok: false }, 401)
  }

  // Ack immediately
  const name = c.req.header("x-github-event") ?? ""
  void webhooks
    .verifyAndReceive({
      id: c.req.header("x-github-delivery") ?? "",
      name: name as Parameters<typeof webhooks.verifyAndReceive>[0]["name"],
      payload: raw,
      signature,
    })
    .catch((err) => logger.error({ err, name }, "GitHub webhook failed"))

  return c.json({ ok: true })
})

export default githubRouter
