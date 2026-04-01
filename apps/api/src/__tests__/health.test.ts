import { describe, expect, it } from "vitest"
import app from "@/app"

describe("Health Check", () => {
  it("GET / returns 200 with status ok", async () => {
    const res = await app.request("/")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok" })
  })

  it("GET /unknown returns 404", async () => {
    const res = await app.request("/this-does-not-exist")
    expect(res.status).toBe(404)
  })
})
