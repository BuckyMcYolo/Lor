"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { CreateChannelDialog } from "@/components/sidebar/channel-panel/create-channel-dialog"

type CreateChannelContextValue = {
  openCreateChannel: (parentId?: string | null) => void
  openCreateCategory: () => void
}

const CreateChannelContext = createContext<CreateChannelContextValue | null>(
  null
)

export function useCreateChannel() {
  const ctx = useContext(CreateChannelContext)
  if (!ctx) {
    throw new Error(
      "useCreateChannel must be used inside <CreateChannelProvider>"
    )
  }
  return ctx
}

/**
 * Hosts the shared create-channel / create-category dialog so multiple
 * surfaces in the workspace sidebar (top-level action row, per-category
 * "+ here" buttons inside ChannelList) can trigger the same flow.
 */
export function CreateChannelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [forceType, setForceType] = useState<"category" | undefined>(undefined)

  const value: CreateChannelContextValue = {
    openCreateChannel: (nextParentId = null) => {
      setParentId(nextParentId)
      setForceType(undefined)
      setOpen(true)
    },
    openCreateCategory: () => {
      setParentId(null)
      setForceType("category")
      setOpen(true)
    },
  }

  return (
    <CreateChannelContext.Provider value={value}>
      {children}
      <CreateChannelDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setForceType(undefined)
        }}
        parentId={parentId}
        forceType={forceType}
      />
    </CreateChannelContext.Provider>
  )
}
