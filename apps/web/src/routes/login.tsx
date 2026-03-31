import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { AlertCircle, Loader2 } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { PasswordInput } from "../components/auth/password-input"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (!sessionPending && session) {
      navigate({ to: "/" })
    }
  }, [sessionPending, session, navigate])

  const {
    mutate: signIn,
    isPending,
    error,
  } = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: `${window.location.origin}/`,
      })
      if (error) {
        // 403 = email not verified — better-auth re-sends the verification email automatically
        if (error.status === 403) {
          navigate({ to: "/check-email", search: { email } })
          return { needsVerification: true }
        }
        throw new Error(error.message ?? "Failed to sign in")
      }
      return { needsVerification: false }
    },
    onSuccess: (result) => {
      if (!result?.needsVerification) {
        navigate({ to: "/" })
      }
    },
  })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          to="/login"
          className="flex items-center gap-2 self-center font-medium"
        >
          <img
            src="/townhallicon.png"
            alt="Townhall"
            className="size-6 rounded-md"
          />
          Townhall
        </Link>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your Townhall account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  signIn()
                }}
              >
                <div className="grid gap-6">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error.message}</span>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <PasswordInput
                      id="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Don&apos;t have an account?{" "}
                      <Link
                        to="/signup"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Sign up
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
