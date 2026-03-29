import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@repo/ui/components/card"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Loader2, Mail, MailCheck } from "lucide-react"
import { AuthLayout } from "../components/auth/auth-layout"

export const Route = createFileRoute("/check-email")({
  component: CheckEmailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) ?? "",
  }),
})

function CheckEmailPage() {
  const { email } = Route.useSearch()

  const {
    mutate: resendEmail,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!email) return
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/login",
      })
      if (error)
        throw new Error(error.message ?? "Failed to resend verification email")
    },
  })

  return (
    <AuthLayout>
      <Card className="w-full border-border/50 bg-card/80 shadow-xl backdrop-blur-sm">
        <CardHeader className="flex flex-col items-center gap-4 pt-8">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Mail className="size-8 text-primary" />
          </div>
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              Check your email
            </h2>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to
            </p>
            {email && <p className="font-medium text-foreground">{email}</p>}
          </div>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Click the link in the email to verify your account. If you don't see
            it, check your spam folder.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8">
          {email && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => resendEmail()}
              disabled={isPending || isSuccess}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : isSuccess ? (
                <>
                  <MailCheck className="size-4" />
                  Email sent!
                </>
              ) : (
                "Resend verification email"
              )}
            </Button>
          )}
          <Link
            to="/login"
            className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
