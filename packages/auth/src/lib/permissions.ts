import { createAccessControl } from "better-auth/plugins/access"
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access"

const statement = {
  ...defaultStatements,
  channel: ["create", "update", "delete"],
  message: ["delete"], // delete others' messages (own messages are always deletable)
} as const

const ac = createAccessControl(statement)

const owner = ac.newRole({
  channel: ["create", "update", "delete"],
  message: ["delete"],
  ...ownerAc.statements,
})

const admin = ac.newRole({
  channel: ["create", "update", "delete"],
  message: ["delete"],
  ...adminAc.statements,
})

// Warden (moderator) — can create/update channels and moderate messages
const warden = ac.newRole({
  channel: ["create", "update"],
  message: ["delete"],
  ...memberAc.statements,
})

// Member (citizen) — basic access only, displayed as "Citizen" in UI
const member = ac.newRole({
  ...memberAc.statements,
})

const roles = { owner, admin, warden, member }

export type GuildRole = keyof typeof roles

export { ac, admin, member, owner, roles, statement, warden }
