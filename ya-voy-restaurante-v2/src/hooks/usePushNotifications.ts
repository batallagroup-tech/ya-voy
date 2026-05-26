import { useEffect } from "react"
import { PushNotifications } from "@capacitor/push-notifications"
import { Capacitor } from "@capacitor/core"

interface Props {
  userId?: string | null
  getToken: () => Promise<string | null>
  onNotification?: (data: any) => void
}

export function usePushNotifications({ userId, getToken, onNotification }: Props) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !userId) return

    const init = async () => {
      const perm = await PushNotifications.requestPermissions()
      if (perm.receive !== "granted") return

      await PushNotifications.register()

      PushNotifications.addListener("registration", async (token) => {
        try {
          const jwt = await getToken()
          await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            },
            body: JSON.stringify({ token: token.value }),
          })
        } catch (e) { console.error("FCM token save error", e) }
      })

      PushNotifications.addListener("pushNotificationReceived", (n) => {
        if (onNotification) onNotification(n.data)
      })

      PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
        if (onNotification) onNotification(a.notification.data)
      })
    }

    init()
    return () => { PushNotifications.removeAllListeners() }
  }, [userId])
}