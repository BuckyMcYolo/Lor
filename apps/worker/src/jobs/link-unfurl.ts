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

const OG_FETCH_TIMEOUT_MS = 5000

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

    const { address } = await lookup(hostname)
    if (PRIVATE_IP_REGEX.test(address)) return false

    return true
  } catch {
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

async function fetchOgEmbed(url: string): Promise<Embed | null> {
  const proxy = matchProxyRule(url)
  const fetchUrl = proxy?.fetchUrl ?? url

  if (!(await isSafeUrl(fetchUrl))) return null

  try {
    const { error, result } = await ogs({
      url: fetchUrl,
      timeout: OG_FETCH_TIMEOUT_MS,
      fetchOptions: {
        headers: {
          "user-agent": "Townhall/1.0 OGBot",
        },
      },
    })

    if (error || !result.success) {
      return null
    }

    const imageUrl =
      result.ogImage?.[0]?.url ?? result.twitterImage?.[0]?.url ?? undefined

    return {
      type: "link",
      url,
      title: result.ogTitle ?? result.twitterTitle ?? undefined,
      description:
        result.ogDescription ?? result.twitterDescription ?? undefined,
      thumbnail: imageUrl,
      siteName: proxy?.siteName ?? result.ogSiteName ?? undefined,
    }
  } catch {
    return null
  }
}

export function createLinkUnfurlProcessor(
  emitter: Emitter<ServerToClientEvents>
) {
  return async (job: Job<LinkUnfurlJobData>) => {
    const { messageId, channelId, urls } = job.data

    const url = urls[0]
    if (!url) return

    const embed = await fetchOgEmbed(url)
    if (!embed) return

    const embeds = [embed]

    const [updated] = await db
      .update(schema.message)
      .set({ embeds })
      .where(eq(schema.message.id, messageId))
      .returning({ id: schema.message.id })

    if (!updated) return

    const payload: RealtimeMessageEmbedsUpdated = {
      channelId,
      messageId,
      embeds,
    }

    emitter.to(channelRoom(channelId)).emit("message:embeds:updated", payload)
  }
}
