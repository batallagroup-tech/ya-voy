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

      // Crear canal de alta prioridad para Android (sonido, vibración y heads-up en pantalla de bloqueo)
      if (Capacitor.getPlatform() === "android") {
        try {
          await PushNotifications.createChannel({
            id: "ya_voy_pedidos_channel",
            name: "Pedidos y Entregas Ya Voy",
            description: "Actualizaciones en vivo de pedidos y entregas",
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: "#9C0D38",
          })
        } catch (chanErr) {
          console.warn("Error creando canal de notificaciones", chanErr)
        }
      }

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
            body: JSON.stringify({ token: token.value, userId }),
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