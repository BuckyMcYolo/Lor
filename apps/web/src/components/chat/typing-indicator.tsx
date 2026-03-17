import { AnimatePresence, motion } from "motion/react"

type TypingUser = {
  userId: string
  name: string
}

function formatTypingText(users: TypingUser[]): string {
  const first = users[0]
  const second = users[1]
  if (!first) return ""
  if (users.length === 1) return `${first.name} is typing`
  if (users.length === 2 && second)
    return `${first.name} and ${second.name} are typing`
  return `${first.name} and ${users.length - 1} others are typing`
}

export function TypingIndicator({ users }: { users: TypingUser[] }) {
  return (
    <AnimatePresence>
      {users.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          <div className="flex h-6 items-center gap-1.5 px-4 text-xs text-muted-foreground">
            <span className="inline-flex gap-0.5">
              <span
                className="animate-bounce"
                style={{ animationDelay: "0ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "150ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "300ms" }}
              >
                .
              </span>
            </span>
            <span>{formatTypingText(users)}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
