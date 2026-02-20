import { ZodError } from "zod"

export function toErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    return issue?.message ?? "Invalid payload"
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unexpected error"
}
