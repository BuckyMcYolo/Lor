import { formatDateDivider } from "@repo/utils/date"

interface DateDividerProps {
  date: Date | string
}

export function DateDivider({ date }: DateDividerProps) {
  const formatted = formatDateDivider(date)
  return (
    <div className="py-3" data-date-divider={formatted}>
      <div className="relative flex items-center">
        <div className="h-px w-full bg-border/70" />
        <span className="absolute left-1/2 -translate-x-1/2 rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {formatted}
        </span>
      </div>
    </div>
  )
}
