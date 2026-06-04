import { db, eq, schema } from "@repo/db"
import type { Embed } from "@repo/db/schema"
import { withContext } from "@repo/logger"
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
import { isSafeUrl, matchProxyRule } from "./link-unfurl-url"

const OG_FETCH_TIMEOUT_MS = 5

async function fetchOgEmbed(url: string): Promise<Embed | null> {
  const proxy = matchProxyRule(url)
  const fetchUrl = proxy?.fetchUrl ?? url

  if (!(await isSafeUrl(fetchUrl))) {
    logger.info({ url, fetchUrl }, "Skipped unsafe URL")
    return null
  }

  try {
    const { error, result, response } = await ogs({
      url: fetchUrl,
      timeout: OG_FETCH_TIMEOUT_MS,
      fetchOptions: {
        headers: {
          "user-agent": "Lor/1.0 OGBot",
        },
      },
    })

    // Validate the final URL after redirects to prevent SSRF via redirect chain
    const finalUrl = (response as Response | undefined)?.url ?? fetchUrl
    if (finalUrl !== fetchUrl && !(await isSafeUrl(finalUrl))) {
      logger.warn(
        { url, fetchUrl, finalUrl },
        "Redirected to unsafe URL, discarding result"
      )
      return null
    }

    if (error || !result.success) {
      logger.warn({ url, fetchUrl, error }, "OG scrape returned no result")
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
    logger.error({ err, url, fetchUrl }, "OG scrape threw")
    return null
  }
}

export function createLinkUnfurlProcessor(
  emitter: Emitter<ServerToClientEvents>
) {
  return (job: Job<LinkUnfurlJobData>) =>
    withContext(
      { jobId: job.id, jobName: job.name, channelId: job.data.channelId },
      async () => {
        const { messageId, channelId, urls } = job.data
        logger.info(
          { messageId, urlCount: urls.length },
          "Processing link-unfurl job"
        )

        if (urls.length === 0) return

        const results = await Promise.all(urls.map(fetchOgEmbed))
        const embeds = results.filter((e): e is Embed => e !== null)

        if (embeds.length === 0) {
          logger.info(
            { messageId },
            "No embeds produced, clearing stored embeds"
          )
        }

        const [updated] = await db
          .update(schema.message)
          .set({ embeds })
          .where(eq(schema.message.id, messageId))
          .returning({ id: schema.message.id })

        if (!updated) {
          logger.warn({ messageId }, "Message not found for embed update")
          return
        }

        const payload: RealtimeMessageEmbedsUpdated = {
          channelId,
          messageId,
          embeds,
        }

        emitter
          .to(channelRoom(channelId))
          .emit("message:embeds:updated", payload)
        logger.info(
          { messageId, embedCount: embeds.length },
          "Embeds updated and emitted"
        )
      }
    )
}
