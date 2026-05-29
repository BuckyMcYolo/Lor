import { describe, expect, it } from "vitest"
import { client } from "./helpers"

describe("Auth Guard — unauthenticated requests return 401", () => {
  it("GET /v1/dms", async () => {
    const res = await client.v1.dms.$get({
      query: {
        page: 1,
        perPage: 50,
      },
    })
    expect(res.status).toBe(401)
  })

  it("GET /v1/notification-settings", async () => {
    const res = await client.v1["notification-settings"].$get()
    expect(res.status).toBe(401)
  })
})
