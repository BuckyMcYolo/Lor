import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { cn } from "@repo/ui/lib/utils"

export function UserAvatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null
  name?: string | null
  size?: "sm" | "md"
  className?: string
}) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Avatar
      className={cn("shrink-0", size === "sm" ? "size-8" : "size-9", className)}
    >
      {src && <AvatarImage src={src} alt={name ?? ""} />}
      <AvatarFallback
        className={cn(
          "font-semibold",
          size === "sm" ? "text-xs" : "text-[13px]"
        )}
      >
        {initials ?? "?"}
      </AvatarFallback>
    </Avatar>
  )
}
