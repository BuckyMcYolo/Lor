import { cn } from "@repo/ui/lib/utils"
import { FileIcon, Loader2, X } from "lucide-react"
import type { PendingAttachment } from "@/hooks/use-file-upload"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface AttachmentPreviewProps {
  attachments: PendingAttachment[]
  onRemove: (id: string) => void
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative flex-shrink-0 rounded-md border border-border bg-background"
        >
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/80"
          >
            <X className="size-3" />
          </button>

          {attachment.status === "uploading" && (
            <div className="absolute inset-0 z-[5] flex items-center justify-center rounded-md bg-background/60">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {attachment.previewUrl ? (
            <img
              src={attachment.previewUrl}
              alt={attachment.filename}
              className={cn(
                "size-20 rounded-md object-cover",
                attachment.status === "error" && "opacity-50"
              )}
            />
          ) : (
            <div
              className={cn(
                "flex size-20 flex-col items-center justify-center gap-1 rounded-md p-2",
                attachment.status === "error" && "opacity-50"
              )}
            >
              <FileIcon className="size-6 text-muted-foreground" />
              <span className="max-w-full truncate text-[10px] text-muted-foreground">
                {attachment.filename}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatFileSize(attachment.size)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
