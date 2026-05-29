import type { ReactNode } from "react"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-[420px] flex-col items-center">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <img
            src="/townhallicon.png"
            alt="Lor"
            className="size-14 rounded-2xl"
          />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Lor
          </span>
        </div>

        {children}
      </div>
    </div>
  )
}
