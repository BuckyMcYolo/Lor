import type { AppType } from "@repo/api/app"
import type { InferRequestType, InferResponseType } from "hono/client"
import { hc } from "hono/client"

export type { InferResponseType, InferRequestType }

const client = hc<AppType>("")
export type Client = typeof client

export const honoClient = (...args: Parameters<typeof hc>): Client =>
  hc<AppType>(...args)
