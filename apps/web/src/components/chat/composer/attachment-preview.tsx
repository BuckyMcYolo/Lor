import { cn } from "@repo/ui/lib/utils"
import { FileIcon, Loader2, X } from "lucide-react"
import { useState } from "react"
import { createPortal } from "react-dom"
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (attachments.length === 0) return null

  return (
    <>
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="relative flex-shrink-0 rounded-md border border-border bg-background"
          >
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              aria-label={`Remove ${attachment.filename}`}
              className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/80"
            >
              <X className="size-3.5" />
            </button>

            {attachment.status === "uploading" && (
              <div className="absolute inset-0 z-[5] flex items-center justify-center rounded-md bg-background/60">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {attachment.previewUrl ? (
              <button
                type="button"
                onClick={() => setLightboxUrl(attachment.previewUrl ?? null)}
                className="cursor-pointer"
              >
                <img
                  src={attachment.previewUrl}
                  alt={attachment.filename}
                  className={cn(
                    "size-20 rounded-md object-cover",
                    attachment.status === "error" && "opacity-50"
                  )}
                />
              </button>
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

      {lightboxUrl &&
        createPortal(
          <div
            role="dialog"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxUrl(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setLightboxUrl(null)
            }}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute right-4 top-4 rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <img
              src={lightboxUrl}
              alt=""
              className="max-h-[calc(100vh-100px)] max-w-[calc(100vw-120px)] rounded object-contain"
            />
          </div>,
          document.body
        )}
    </>
  )
}
