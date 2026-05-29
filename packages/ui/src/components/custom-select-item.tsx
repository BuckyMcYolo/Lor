"use client"

import { SelectItem } from "@repo/ui/components/select"
import { cn } from "@repo/ui/lib/utils"
import type { Select as SelectPrimitive } from "radix-ui"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface CustomSelectItemProps
  extends React.ComponentProps<typeof SelectPrimitive.Item> {
  tooltip?: React.ReactNode
  side?:
    | "top"
    | "top-right"
    | "right"
    | "bottom-right"
    | "bottom"
    | "bottom-left"
    | "left"
    | "top-left"
}

export const CustomSelectItem = React.forwardRef<
  HTMLDivElement,
  CustomSelectItemProps
>(({ children, tooltip, side = "right", className, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && itemRef.current && tooltip) {
      const rect = itemRef.current.getBoundingClientRect()
      const offset = 8
      let top = 0
      let left = 0

      switch (side) {
        case "top":
          top = rect.top + window.scrollY - offset
          left = rect.left + window.scrollX + rect.width / 2
          break
        case "top-right":
          top = rect.top + window.scrollY - offset
          left = rect.right + window.scrollX + offset
          break
        case "right":
          top = rect.top + window.scrollY + rect.height / 2
          left = rect.right + window.scrollX + offset
          break
        case "bottom-right":
          top = rect.bottom + window.scrollY + offset
          left = rect.right + window.scrollX + offset
          break
        case "bottom":
          top = rect.bottom + window.scrollY + offset
          left = rect.left + window.scrollX + rect.width / 2
          break
        case "bottom-left":
          top = rect.bottom + window.scrollY + offset
          left = rect.left + window.scrollX - offset
          break
        case "left":
          top = rect.top + window.scrollY + rect.height / 2
          left = rect.left + window.scrollX - offset
          break
        case "top-left":
          top = rect.top + window.scrollY - offset
          left = rect.left + window.scrollX - offset
          break
      }

      setPosition({ top, left })
    }
  }, [isOpen, tooltip, side])

  if (!tooltip) {
    return (
      <SelectItem ref={ref} className={className} {...props}>
        {children}
      </SelectItem>
    )
  }

  return (
    <>
      <div
        ref={itemRef}
        onMouseEnter={() => {
          setIsOpen(true)
        }}
        onMouseLeave={() => {
          setIsOpen(false)
        }}
      >
        <SelectItem ref={ref} className={className} {...props}>
          {children}
        </SelectItem>
      </div>
      {isOpen &&
        createPortal(
          <div
            className={cn(
              "animate-in fade-in-0 zoom-in-95 z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
              "pointer-events-none max-w-xs"
            )}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              opacity: position.top === 0 ? 0 : 1,
              transform: (() => {
                switch (side) {
                  case "top":
                    return "translate(-50%, -100%)"
                  case "top-right":
                    return "translate(0, -75%)"
                  case "right":
                    return "translate(0, -50%)"
                  case "bottom-right":
                    return "translate(0, 0)"
                  case "bottom":
                    return "translate(-50%, 0)"
                  case "bottom-left":
                    return "translate(-100%, 0)"
                  case "left":
                    return "translate(-100%, -50%)"
                  case "top-left":
                    return "translate(-100%, -75%)"
                  default:
                    return "translate(0, -50%)"
                }
              })(),
            }}
          >
            {tooltip}
          </div>,
          document.body
        )}
    </>
  )
})

CustomSelectItem.displayName = "CustomSelectItem"
