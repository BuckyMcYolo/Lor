const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

export async function requestNotificationPermission(): Promise<boolean> {
  if (isTauri()) {
    try {
      const { requestPermission, isPermissionGranted } = await import(
        "@tauri-apps/plugin-notification"
      )
      if (await isPermissionGranted()) return true
      const result = await requestPermission()
      return result === "granted"
    } catch {
      return false
    }
  }

  if (!("Notification" in window)) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false

  const result = await Notification.requestPermission()
  return result === "granted"
}

export function getNotificationPermissionSync():
  | "granted"
  | "denied"
  | "default" {
  if (isTauri()) return "default"
  if (!("Notification" in window)) return "denied"
  return Notification.permission
}

export async function getNotificationPermission(): Promise<
  "granted" | "denied" | "default"
> {
  if (isTauri()) {
    try {
      const { isPermissionGranted } = await import(
        "@tauri-apps/plugin-notification"
      )
      return (await isPermissionGranted()) ? "granted" : "default"
    } catch {
      return "denied"
    }
  }

  if (!("Notification" in window)) return "denied"
  return Notification.permission
}

export async function showNotification(
  title: string,
  body: string,
  options?: {
    tag?: string
    onClick?: () => void
  }
) {
  if (isTauri()) {
    try {
      const { sendNotification } = await import(
        "@tauri-apps/plugin-notification"
      )
      sendNotification({ title, body })
    } catch {
      // Tauri notification plugin not available
    }
    return
  }

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return
  }

  const notification = new Notification(title, {
    body,
    tag: options?.tag,
    icon: "/favicon.ico",
  })

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus()
      options.onClick?.()
      notification.close()
    }
  }
}
