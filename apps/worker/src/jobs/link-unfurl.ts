import { lookup } from "node:dns/promises"
import { db, eq, schema } from "@repo/db"
import type { Embed } from "@repo/db/schema"
import type {
  LinkUnfurlJobData,
  RealtimeMessageEmbedsUpdated,
} from "@repo/realtime-types"
import type { ServerToClientEvents } from "@repo/realtime-types/events"
import { channelRoom } from "@repo/realtime-types/rooms"
import type { Emitter } from "@socket.io/redis-emitter"
import type { Job } from "bullmq"
import ogs from "open-graph-scraper"
import { logger } from "@/lib/logger"

const OG_FETCH_TIMEOUT_MS = 5000
const MAX_REDIRECTS = 5

const PRIVATE_IP_REGEX =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.|::1|fc|fd|fe80)/i

async function isSafeUrl(urlString: string): Promise<boolean> {
  try {
    const parsed = new URL(urlString)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return false

    const hostname = parsed.hostname
    if (
      hostname === "localhost" ||
      hostname === "[::1]" ||
      PRIVATE_IP_REGEX.test(hostname)
    )
      return false

    const addresses = await lookup(hostname, { all: true })
    for (const { address } of addresses) {
      if (PRIVATE_IP_REGEX.test(address)) {
        logger.warn(
          { hostname, address },
          "Blocked private IP after DNS lookup"
        )
        return false
      }
    }

    return true
  } catch (err) {
    logger.warn({ err, url: urlString }, "URL safety check failed")
    return false
  }
}

const OG_PROXY_RULES: Array<{
  pattern: RegExp
  proxyHost: string
  siteName: string
}> = [
  {
    pattern: /^https?:\/\/(www\.)?(x\.com|twitter\.com)\//,
    proxyHost: "fxtwitter.com",
    siteName: "X (formerly Twitter)",
  },
]

function matchProxyRule(originalUrl: string) {
  for (const rule of OG_PROXY_RULES) {
    if (rule.pattern.test(originalUrl)) {
      try {
        const parsed = new URL(originalUrl)
        parsed.hostname = rule.proxyHost
        return { fetchUrl: parsed.toString(), siteName: rule.siteName }
      } catch {
        return null
      }
    }
  }
  return null
}

/** Follow redirects manually, validating each hop through isSafeUrl. */
async function resolveRedirects(startUrl: string): Promise<string | null> {
  let current = startUrl
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    let res: Response
    try {
      res = await fetch(current, {
        method: "HEAD",
        headers: { "user-agent": "Townhall/1.0 OGBot" },
        redirect: "manual",
        signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
      })
    } catch (err) {
      logger.warn(
        { err, startUrl, current },
        "Redirect resolution fetch failed"
      )
      return null
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location")
      if (!location) return null
      // Resolve relative Location headers against the current URL
      let next: string
      try {
        next = new URL(location, current).toString()
      } catch {
        logger.warn({ location, current }, "Malformed redirect Location header")
        return null
      }
      if (!(await isSafeUrl(next))) {
        logger.warn(
          { from: current, to: next },
          "Redirect target failed safety check"
        )
        return null
      }
      current = next
      continue
    }

    return current
  }
  logger.warn({ url: startUrl }, "Too many redirects")
  return null
}

async function fetchOgEmbed(url: string): Promise<Embed | null> {
  const proxy = matchProxyRule(url)
  const fetchUrl = proxy?.fetchUrl ?? url

  if (!(await isSafeUrl(fetchUrl))) {
    logger.info({ url, fetchUrl }, "Skipped unsafe URL")
    return null
  }

  const resolvedUrl = await resolveRedirects(fetchUrl)
  if (!resolvedUrl) {
    logger.info({ url, fetchUrl }, "Redirect resolution failed")
    return null
  }

  try {
    const { error, result } = await ogs({
      url: resolvedUrl,
      timeout: OG_FETCH_TIMEOUT_MS,
      fetchOptions: {
        headers: {
          "user-agent": "Townhall/1.0 OGBot",
        },
        redirect: "error",
      },
    })

    if (error || !result.success) {
      logger.warn({ url, resolvedUrl, error }, "OG scrape returned no result")
      return null
    }

    const imageUrl =
      result.ogImage?.[0]?.url ?? result.twitterImage?.[0]?.url ?? undefined

    logger.info(
      { url, title: result.ogTitle, hasImage: !!imageUrl },
      "OG scrape succeeded"
    )

    return {
      type: "link",
      url,
      title: result.ogTitle ?? result.twitterTitle ?? undefined,
      description:
        result.ogDescription ?? result.twitterDescription ?? undefined,
      thumbnail: imageUrl,
      siteName: proxy?.siteName ?? result.ogSiteName ?? undefined,
    }
  } catch (err) {
    logger.error({ err, url, resolvedUrl }, "OG scrape threw")
    return null
  }
}

export function createLinkUnfurlProcessor(
  emitter: Emitter<ServerToClientEvents>
) {
  return async (job: Job<LinkUnfurlJobData>) => {
    const { messageId, channelId, urls } = job.data
    logger.info(
      { jobId: job.id, messageId, urlCount: urls.length },
      "Processing link-unfurl job"
    )

    if (urls.length === 0) return

    const results = await Promise.all(urls.map(fetchOgEmbed))
    const embeds = results.filter((e): e is Embed => e !== null)

    if (embeds.length === 0) {
      logger.info(
        { jobId: job.id, messageId },
        "No embeds produced, clearing stored embeds"
      )
    }

    const [updated] = await db
      .update(schema.message)
      .set({ embeds })
      .where(eq(schema.message.id, messageId))
      .returning({ id: schema.message.id })

    if (!updated) {
      logger.warn(
        { jobId: job.id, messageId },
        "Message not found for embed update"
      )
      return
    }

    const payload: RealtimeMessageEmbedsUpdated = {
      channelId,
      messageId,
      embeds,
    }

    emitter.to(channelRoom(channelId)).emit("message:embeds:updated", payload)
    logger.info(
      { jobId: job.id, messageId, embedCount: embeds.length },
      "Embeds updated and emitted"
    )
  }
}
