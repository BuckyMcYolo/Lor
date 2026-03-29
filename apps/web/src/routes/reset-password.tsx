import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { Label } from "@repo/ui/components/label"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { type FormEvent, useState } from "react"
import { AuthLayout } from "../components/auth/auth-layout"
import { PasswordInput } from "../components/auth/password-input"

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) ?? "",
  }),
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const {
    mutate: resetPassword,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (error) throw new Error(error.message ?? "Failed to reset password")
    },
  })

  if (!token) {
    return (
      <AuthLayout>
        <Card className="w-full border-border/50 bg-card/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-col items-center gap-4 pt-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-semibold text-foreground">
                Invalid reset link
              </h2>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired.
              </p>
            </div>
          </CardHeader>
          <CardFooter className="flex justify-center pb-8">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Request a new reset link
            </Link>
          </CardFooter>
        </Card>
      </AuthLayout>
    )
  }

  if (isSuccess) {
    return (
      <AuthLayout>
        <Card className="w-full border-border/50 bg-card/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="flex flex-col items-center gap-4 pt-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20">
              <CheckCircle2 className="size-8 text-green-500" />
            </div>
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-semibold text-foreground">
                Password reset!
              </h2>
              <p className="text-sm text-muted-foreground">
                Your password has been successfully reset.
              </p>
            </div>
          </CardHeader>
          <CardFooter className="flex justify-center pb-8">
            <Button onClick={() => navigate({ to: "/login" })}>
              Continue to sign in
            </Button>
          </CardFooter>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card className="w-full border-border/50 bg-card/80 shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold">
            Set new password
          </CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            resetPassword()
          }}
        >
          <CardContent className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error.message}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <PasswordInput
                id="confirm-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  )
}
