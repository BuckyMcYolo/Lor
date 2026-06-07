import { db } from "../index"
import { user } from "../schemas/users"

// Stable id for the global Merlin bot user — referenced everywhere without a
// lookup. Merlin authors messages as this user and is an implicit member of
// every workspace.
export const MERLIN_USER_ID = "00000000-0000-4000-8000-000000000001"

// Idempotent. Run at setup, or use the equivalent SQL insert directly.
export async function seedMerlinUser() {
  await db
    .insert(user)
    .values({
      id: MERLIN_USER_ID,
      name: "Merlin",
      email: "merlin@lor.chat",
      username: "merlin",
      displayUsername: "Merlin",
      emailVerified: true,
      onboardingCompleted: true,
      isBot: true,
    })
    .onConflictDoNothing({ target: user.id })
}
