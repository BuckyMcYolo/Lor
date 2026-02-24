import { Skeleton } from "@repo/ui/components/skeleton"

const SKELETON_GROUPS = [
  { key: "a", nameWidth: "5rem", lines: ["80%", "45%"] },
  { key: "b", nameWidth: "6.5rem", lines: ["60%"] },
  { key: "c", nameWidth: "4rem", lines: ["90%", "70%", "35%"] },
  { key: "d", nameWidth: "5.5rem", lines: ["50%"] },
  { key: "e", nameWidth: "7rem", lines: ["75%", "55%"] },
  { key: "f", nameWidth: "4.5rem", lines: ["65%"] },
  { key: "g", nameWidth: "6rem", lines: ["85%", "40%"] },
]

export function ChatSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>

      {/* Messages skeleton */}
      <div className="flex flex-1 flex-col-reverse overflow-hidden py-4">
        {SKELETON_GROUPS.map((group) => (
          <div key={group.key} className="px-4 py-0.5">
            <div className="flex gap-3">
              <Skeleton className="mt-0.5 size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-baseline gap-2">
                  <Skeleton
                    className="h-3.5 rounded"
                    style={{ width: group.nameWidth }}
                  />
                  <Skeleton className="h-3 w-10 rounded" />
                </div>
                {group.lines.map((width, i) => (
                  <Skeleton
                    key={`${group.key}-${i}`}
                    className="h-3.5 rounded"
                    style={{ width }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="shrink-0 px-4 pb-6">
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  )
}
