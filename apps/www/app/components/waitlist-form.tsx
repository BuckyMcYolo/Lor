"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { ArrowRight, Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { apiClient } from "@/lib/api-client"

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type FormData = z.infer<typeof schema>

export function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: standardSchemaResolver(schema),
    mode: "onSubmit",
  })

  const onSubmit = async (data: FormData) => {
    setStatus("idle")
    setErrorMessage("")

    try {
      const res = await apiClient.waitlist.$post({
        json: { email: data.email },
      })

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        setStatus("error")
        setErrorMessage(
          typeof json?.error === "string" ? json.error : "Something went wrong"
        )
        return
      }

      setStatus("success")
      reset()
    } catch {
      setStatus("error")
      setErrorMessage("Unable to connect. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <p className="mt-10 text-sm font-medium text-primary">
        You&apos;re on the list. We&apos;ll be in touch.
      </p>
    )
  }

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <Input
          type="email"
          placeholder="you@email.com"
          className="h-11 sm:flex-1"
          {...register("email")}
        />
        <Button size="lg" className="h-11" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Join the Waitlist
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
      {errors.email && (
        <p className="mt-2 text-sm text-destructive">{errors.email.message}</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
