import { MERLIN_USER_ID } from "../constants"
import { db } from "../index"
import { user } from "../schemas/users"

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
