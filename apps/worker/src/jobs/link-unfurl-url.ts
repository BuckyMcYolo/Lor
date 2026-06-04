import { lookup } from "node:dns/promises"
import { logger } from "@/lib/logger"

const PRIVATE_IP_REGEX =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.|::1|fc|fd|fe80)/i

export async function isSafeUrl(urlString: string): Promise<boolean> {
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

export function matchProxyRule(originalUrl: string) {
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
