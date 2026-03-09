import { Upload } from "lucide-react"

export function DropZoneOverlay({ isDragActive }: { isDragActive: boolean }) {
  if (!isDragActive) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-16 py-12">
        <Upload className="size-10 text-primary" />
        <p className="text-lg font-semibold text-foreground">
          Drop files to upload
        </p>
        <p className="text-sm text-muted-foreground">
          Files will be attached to your message
        </p>
      </div>
    </div>
  )
}
