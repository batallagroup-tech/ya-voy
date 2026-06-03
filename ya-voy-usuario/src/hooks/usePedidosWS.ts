import { useEffect, useRef } from "react";
import { API } from "../lib/constants";

type PedidoUpdateHandler = (pedido: any) => void;

export function usePedidosWS(userId: string | null | undefined, onUpdate: PedidoUpdateHandler) {
  const handlerRef = useRef(onUpdate);
  handlerRef.current = onUpdate;

  useEffect(() => {
    if (!userId) return;

    const wsUrl = API.replace("http://", "ws://").replace("https://", "wss://") + "/ws/pedidos?userId=" + userId;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.tipo === "pedido_update") handlerRef.current(msg.data);
        } catch {}
      };

      ws.onclose = () => {
        // Reconectar en 3s si la conexión se cierra inesperadamente
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {};
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [userId]);
}
