import { describe, expect, it } from "vitest"
import {
  canManageWorkspaceAuthority,
  getWorkspaceMessageRateLimit,
  isWorkspaceRole,
  roleHasPermissions,
} from "./permissions"

describe("workspace permissions", () => {
  it("recognizes only supported workspace roles", () => {
    expect(isWorkspaceRole("owner")).toBe(true)
    expect(isWorkspaceRole("admin")).toBe(true)
    expect(isWorkspaceRole("member")).toBe(true)
    expect(isWorkspaceRole("guest")).toBe(false)
  })

  it("keeps member message limits stricter than elevated roles", () => {
    expect(getWorkspaceMessageRateLimit("member")).toBe(30)
    expect(getWorkspaceMessageRateLimit("admin")).toBe(120)
    expect(getWorkspaceMessageRateLimit("owner")).toBe(120)
  })

  it("enforces workspace authority hierarchy", () => {
    expect(
      canManageWorkspaceAuthority({ role: "owner" }, { role: "admin" })
    ).toBe(true)
    expect(
      canManageWorkspaceAuthority({ role: "admin" }, { role: "member" })
    ).toBe(true)
    expect(
      canManageWorkspaceAuthority({ role: "member" }, { role: "admin" })
    ).toBe(false)
    expect(
      canManageWorkspaceAuthority({ role: "admin" }, { role: "owner" })
    ).toBe(false)
  })

  it("grants channel management permissions only to elevated roles", () => {
    expect(roleHasPermissions("admin", { channel: ["create"] })).toBe(true)
    expect(roleHasPermissions("member", { channel: ["create"] })).toBe(false)
  })
})
