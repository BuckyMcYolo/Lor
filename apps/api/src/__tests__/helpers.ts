import type { ClientRequestOptions } from "hono/client"
import { testClient } from "hono/testing"
import app, { type AppType } from "@/app"

/**
 * Typed test client for the Lor API.
 * Provides autocomplete on routes, params, and response bodies.
 */
export const client = testClient<AppType>(app as unknown as AppType)
/**
 * Creates request options with a session cookie for authenticated requests.
 *
 * Usage:
 *   const res = await client.v1.someRoute.$get(undefined, withSession(cookie))
 */
export function withSession(sessionCookie: string): ClientRequestOptions {
  return {
    headers: {
      Cookie: sessionCookie,
    },
  }
}
