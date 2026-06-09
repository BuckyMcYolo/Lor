import { seedMerlinUser } from "./merlin"

// Seed runner. Idempotent — safe to re-run.
await seedMerlinUser()
console.log("✓ seeded Merlin bot user")
process.exit(0)
