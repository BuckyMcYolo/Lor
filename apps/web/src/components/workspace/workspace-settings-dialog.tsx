import { FocusScope } from "@radix-ui/react-focus-scope"
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { cn } from "@repo/ui/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Camera,
  Github,
  Loader2,
  Plug,
  Settings,
  Upload,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"

const MAX_WORKSPACE_ICON_BYTES = 2 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]

function validateIconFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP, and SVG images are allowed"
  }
  if (file.size > MAX_WORKSPACE_ICON_BYTES) {
    return "Icon must be under 2 MB"
  }
  return null
}

type Workspace = {
  id: string
  name: string
  slug: string
  logo?: string | null
}

export type SectionId = "general" | "integrations"

const SECTIONS: { id: SectionId; label: string; icon: typeof Settings }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "integrations", label: "Integrations", icon: Plug },
]

export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
  workspace,
  section,
  onSectionChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: Workspace
  section: SectionId
  onSectionChange: (section: SectionId) => void
}) {
  // Close on Escape (no Radix here, so wire it ourselves).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close settings"
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 cursor-default bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          {/* Trap + restore focus (no Radix Dialog here, so wire it ourselves). */}
          <FocusScope asChild loop trapped>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Workspace settings"
              className="fixed inset-x-3 inset-y-3 z-50 flex overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:inset-x-8 sm:inset-y-8"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              {/* Section nav */}
              <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3">
                <div className="truncate px-2 pb-2 text-sm font-semibold text-foreground">
                  {workspace.name}
                </div>
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSectionChange(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      section === s.id
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <s.icon className="size-4" />
                    {s.label}
                  </button>
                ))}
              </nav>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-5">
                  <span className="text-sm font-semibold">
                    {SECTIONS.find((s) => s.id === section)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  <div className="mx-auto max-w-2xl">
                    {section === "general" ? (
                      // key on identity so the form resets if the workspace
                      // changes under us (no stale name/icon saved onto another).
                      <GeneralSection
                        key={workspace.id}
                        workspace={workspace}
                        onClose={() => onOpenChange(false)}
                      />
                    ) : (
                      <IntegrationsSection workspaceSlug={workspace.slug} />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </FocusScope>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function GeneralSection({
  workspace,
  onClose,
}: {
  workspace: Workspace
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(workspace.name)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iconPreviewRef = useRef<string | null>(null)
  const dragCountRef = useRef(0)

  useEffect(() => {
    return () => {
      if (iconPreviewRef.current) URL.revokeObjectURL(iconPreviewRef.current)
    }
  }, [])

  const setIconFromFile = useCallback((file: File) => {
    const error = validateIconFile(file)
    if (error) {
      toast.error(error)
      return
    }
    setIconFile(file)
    if (iconPreviewRef.current) URL.revokeObjectURL(iconPreviewRef.current)
    const url = URL.createObjectURL(file)
    iconPreviewRef.current = url
    setIconPreview(url)
  }, [])

  const handleIconSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) setIconFromFile(file)
    },
    [setIconFromFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCountRef.current = 0
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) setIconFromFile(file)
    },
    [setIconFromFile]
  )

  const uploadIcon = useCallback(
    async (file: File): Promise<string> => {
      const res = await apiClient.v1.uploads["workspace-icon"].presign.$post({
        json: {
          workspaceId: workspace.id,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        },
      })
      if (!res.ok) throw new Error("Failed to get upload URL")
      const { uploadUrl, fileUrl } = await res.json()
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      if (!uploadRes.ok) throw new Error("Failed to upload icon")
      return fileUrl
    },
    [workspace.id]
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      let logoUrl: string | null | undefined
      if (iconFile) logoUrl = await uploadIcon(iconFile)

      const res = await apiClient.v1.workspaces[":workspaceSlug"].$patch({
        param: { workspaceSlug: workspace.slug },
        json: {
          ...(name.trim() !== workspace.name ? { name: name.trim() } : {}),
          ...(logoUrl !== undefined ? { logo: logoUrl } : {}),
        },
      })
      if (!res.ok) throw new Error("Failed to update workspace")

      setIconFile(null)
      if (iconPreviewRef.current) {
        URL.revokeObjectURL(iconPreviewRef.current)
        iconPreviewRef.current = null
        setIconPreview(null)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["active-workspace"] }),
      ])
      toast.success("Workspace updated")
      onClose()
    } catch {
      toast.error("Failed to update workspace")
    } finally {
      setIsSaving(false)
    }
  }, [workspace, name, iconFile, uploadIcon, queryClient, onClose])

  const hasChanges = name.trim() !== workspace.name || iconFile !== null
  const isValid = name.trim().length > 0
  const displayIcon = iconPreview ?? workspace.logo
  const initials = workspace.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)

  return (
    <div className="space-y-6">
      <button
        type="button"
        className={cn(
          "flex w-full flex-col items-center gap-4 rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-transparent"
        )}
        onDragEnter={(e) => {
          e.preventDefault()
          dragCountRef.current += 1
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          dragCountRef.current -= 1
          if (dragCountRef.current === 0) setIsDragging(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="group relative shrink-0">
          <Avatar className="size-20">
            {displayIcon && (
              <AvatarImage src={displayIcon} alt={workspace.name} />
            )}
            <AvatarFallback className="text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-5 text-white" />
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Upload className="size-3" />
          Click or drag & drop to change icon
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleIconSelect}
        />
      </button>

      <div className="space-y-1.5">
        <Label htmlFor="workspace-name">Workspace Name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="My Awesome Workspace"
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || !isValid || isSaving}
        >
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}

const PROVIDER_ICONS: Record<string, typeof Github> = { github: Github }

function IntegrationsSection({ workspaceSlug }: { workspaceSlug: string }) {
  const queryClient = useQueryClient()

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["integrations", workspaceSlug],
    queryFn: async () => {
      const res = await apiClient.v1.workspaces[
        ":workspaceSlug"
      ].integrations.$get({ param: { workspaceSlug } })
      if (!res.ok) throw new Error("Failed to load integrations")
      return res.json()
    },
  })

  const disconnect = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await apiClient.v1.workspaces[":workspaceSlug"].integrations[
        ":connectionId"
      ].$delete({ param: { workspaceSlug, connectionId } })
      if (!res.ok) throw new Error("Failed to disconnect")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["integrations", workspaceSlug],
      })
      toast.success("Disconnected")
    },
    onError: () => toast.error("Failed to disconnect"),
  })

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn't load integrations.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Connect tools so Merlin can draw on your team's work. Activity is
        summarized into your workspace's memory.
      </p>
      {data?.providers.map((p) => {
        const Icon = PROVIDER_ICONS[p.id] ?? Plug
        return (
          <div
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="size-6 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {p.connected
                    ? `Connected${p.accountLogin ? ` · ${p.accountLogin}` : ""}`
                    : "Not connected"}
                </div>
              </div>
            </div>
            {p.connected && p.connectionId ? (
              <Button
                variant="outline"
                size="sm"
                disabled={disconnect.isPending}
                onClick={() =>
                  p.connectionId && disconnect.mutate(p.connectionId)
                }
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!p.connectUrl}
                onClick={() => {
                  if (p.connectUrl) window.location.href = p.connectUrl
                }}
              >
                {p.connectUrl ? "Connect" : "Unavailable"}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
