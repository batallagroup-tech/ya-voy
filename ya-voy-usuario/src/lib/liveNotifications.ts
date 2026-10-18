import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import type { Pedido } from "../types";

const CHANNEL_ID = "ya_voy_live_orders";

/**
 * Inicializa el canal de alta prioridad para Notificaciones en Vivo en Pantalla de Bloqueo
 */
export async function initLiveNotificationChannel() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Seguimiento de Pedidos en Vivo",
      description: "Notificaciones animadas y en vivo del estado de tu pedido en pantalla de bloqueo",
      importance: 5, // MAX IMPORTANCE
      visibility: 1, // PUBLIC (Lock screen visible)
      sound: "notification.wav",
      vibration: true,
      lights: true,
      lightColor: "#9C0D38",
    });
  } catch (e) {
    console.warn("Live notification channel init error:", e);
  }
}

/**
 * Actualiza la Notificación en Vivo Continua (Ongoing) en Pantalla de Bloqueo
 */
export async function updateLiveOrderNotification(pedido: Pedido) {
  if (!Capacitor.isNativePlatform() || !pedido) return;
  try {
    await initLiveNotificationChannel();

    const statusMap: Record<string, { title: string; body: string }> = {
      nuevo: {
        title: "🛒 Pedido Recibido",
        body: `Tu pedido en ${pedido.negocio_nombre || "el comercio"} fue registrado.`,
      },
      preparando: {
        title: "🍳 Tu pedido se está preparando",
        body: `${pedido.negocio_nombre || "El restaurante"} está preparando tus platillos.`,
      },
      listo: {
        title: "📦 Pedido listo para entrega",
        body: "Tu pedido está listo y empaquetado esperando al repartidor.",
      },
      en_camino: {
        title: "🛵 ¡Tu repartidor va en camino!",
        body: `Tu repartidor lleva tu pedido de ${pedido.negocio_nombre || "comida"}.`,
      },
      esperando_cliente: {
        title: "📍 ¡Tu repartidor está afuera!",
        body: `Tu repartidor ha llegado a tu domicilio. ¡Sal a recibir tu orden!`,
      },
      entregado: {
        title: "🎉 ¡Pedido entregado!",
        body: "¡Buen provecho! Gracias por pedir con Ya Voy.",
      },
      cancelado: {
        title: "❌ Pedido Cancelado",
        body: `Tu pedido en ${pedido.negocio_nombre || "el restaurante"} fue cancelado.`,
      },
    };

    const info = statusMap[pedido.status] || {
      title: `📦 Pedido #${pedido.id.slice(0, 6)}`,
      body: `Estado actual: ${pedido.status}`,
    };

    const notifId = Math.abs(hashCode(pedido.id));

    // Cancel previous notification if any
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});

    // Schedule high-priority ongoing notification
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: info.title,
          body: info.body,
          channelId: CHANNEL_ID,
          ongoing: pedido.status !== "entregado" && pedido.status !== "cancelado",
          autoCancel: false,
          extra: { pedidoId: pedido.id, status: pedido.status },
          largeIcon: "ic_launcher_round",
          smallIcon: "ic_launcher_foreground",
        },
      ],
    });
  } catch (e) {
    console.warn("Live order notification error:", e);
  }
}

/**
 * Limpia la notificación en vivo
 */
export async function clearLiveOrderNotification(pedidoId: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const notifId = Math.abs(hashCode(pedidoId));
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
  } catch {}
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
