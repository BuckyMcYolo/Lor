import { describe, expect, it } from "vitest"
import { formatPhone, formatPhoneE164, normalizePhone } from "./phone"

describe("phone utilities", () => {
  it("formats US phone numbers for display", () => {
    expect(formatPhone("5551234567")).toBe("(555) 123-4567")
    expect(formatPhone("1-555-123-4567")).toBe("+1 (555) 123-4567")
  })

  it("returns the original value when display formatting is not possible", () => {
    expect(formatPhone("12345")).toBe("12345")
  })

  it("normalizes US phone numbers to E.164", () => {
    expect(formatPhoneE164("(555) 123-4567")).toBe("+15551234567")
    expect(formatPhoneE164("+1 555 123 4567")).toBe("+15551234567")
    expect(formatPhoneE164("12345")).toBeNull()
  })

  it("strips non-digit characters", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("15551234567")
  })
})
