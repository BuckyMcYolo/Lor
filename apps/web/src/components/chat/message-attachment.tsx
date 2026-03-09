import { cn } from "@repo/ui/lib/utils"
import { ChevronLeft, ChevronRight, Download, FileIcon, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { Message } from "@/lib/api-types"

type Attachment = NonNullable<Message["attachments"]>[number]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function VideoAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <video
      src={attachment.url}
      controls
      preload="metadata"
      className="max-h-[300px] max-w-[400px] rounded-md"
    >
      <track kind="captions" />
    </video>
  )
}

function AudioAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex items-center gap-2">
      <audio src={attachment.url} controls preload="metadata" className="h-8">
        <track kind="captions" />
      </audio>
      <span className="text-xs text-muted-foreground">
        {attachment.filename}
      </span>
    </div>
  )
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.filename}
      className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2 transition-colors hover:bg-secondary"
    >
      <FileIcon className="size-5 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {attachment.filename}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(attachment.size)}
        </div>
      </div>
      <Download className="size-4 flex-shrink-0 text-muted-foreground" />
    </a>
  )
}

function AttachmentLightbox({
  images,
  initialIndex,
  open,
  onOpenChange,
}: {
  images: Attachment[]
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setCurrentIndex(initialIndex)
  }, [open, initialIndex])

  const current = images[currentIndex]
  const hasMultiple = images.length > 1

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!open || !hasMultiple) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, hasMultiple, goNext, goPrev])

  if (!current || !open) return null

  return createPortal(
    <div
      role="dialog"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onOpenChange(false)
      }}
    >
      {/* Top bar */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <a
          href={current.url}
          download={current.filename}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="size-5" />
        </a>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Main image area */}
      <div className="relative flex max-h-[calc(100vh-100px)] max-w-[calc(100vw-120px)] items-center justify-center">
        {hasMultiple && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute -left-14 z-10 rounded-full bg-black/60 p-2 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        <img
          src={current.url}
          alt={current.filename}
          className="max-h-[calc(100vh-100px)] max-w-[calc(100vw-120px)] rounded object-contain"
        />

        {hasMultiple && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute -right-14 z-10 rounded-full bg-black/60 p-2 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
            aria-label="Next image"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {/* Filename */}
      <div className="mt-3 text-sm text-white/60">{current.filename}</div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto px-4 pb-4">
          {images.map((img, index) => (
            <button
              key={img.url}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCurrentIndex(index)
              }}
              className={cn(
                "size-12 flex-shrink-0 overflow-hidden rounded border-2 transition-all",
                index === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-40 hover:opacity-70"
              )}
            >
              <img
                src={img.url}
                alt={img.filename}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}

function ImageGrid({
  images,
  onImageClick,
}: {
  images: Attachment[]
  onImageClick: (index: number) => void
}) {
  if (images.length === 1) {
    const img = images[0]
    if (!img) return null
    return (
      <button
        type="button"
        onClick={() => onImageClick(0)}
        className="block w-fit cursor-pointer"
      >
        <img
          src={img.url}
          alt={img.filename}
          width={img.width ?? undefined}
          height={img.height ?? undefined}
          className="max-h-[300px] w-auto rounded-md"
          loading="lazy"
        />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "grid max-w-[400px] gap-1",
        images.length === 2 && "grid-cols-2",
        images.length >= 3 && "grid-cols-2"
      )}
    >
      {images.map((img, index) => (
        <button
          key={img.url}
          type="button"
          onClick={() => onImageClick(index)}
          className={cn(
            "cursor-pointer overflow-hidden rounded-md",
            images.length === 3 && index === 0 && "col-span-2"
          )}
        >
          <img
            src={img.url}
            alt={img.filename}
            className="aspect-square size-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  )
}

export function AttachmentGrid({
  attachments,
}: {
  attachments: NonNullable<Message["attachments"]>
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const images = attachments.filter((a) => a.contentType.startsWith("image/"))
  const nonImages = attachments.filter(
    (a) => !a.contentType.startsWith("image/")
  )

  const handleImageClick = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <div className="mt-1 flex flex-col gap-1">
      {images.length > 0 && (
        <>
          <ImageGrid images={images} onImageClick={handleImageClick} />
          <AttachmentLightbox
            images={images}
            initialIndex={lightboxIndex}
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
          />
        </>
      )}
      {nonImages.map((attachment) => {
        if (attachment.contentType.startsWith("video/")) {
          return (
            <VideoAttachment key={attachment.url} attachment={attachment} />
          )
        }
        if (attachment.contentType.startsWith("audio/")) {
          return (
            <AudioAttachment key={attachment.url} attachment={attachment} />
          )
        }
        return <FileAttachment key={attachment.url} attachment={attachment} />
      })}
    </div>
  )
}
