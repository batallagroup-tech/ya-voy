import { useEffect, useRef } from "react";
import { API } from "../lib/api";

type Handler = (pedido: any) => void;

export function usePedidosWS(ownerId: string | null | undefined, onNuevoPedido: Handler) {
  const handlerRef = useRef(onNuevoPedido);
  handlerRef.current = onNuevoPedido;

  useEffect(() => {
    if (!ownerId) return;

    const wsUrl = API.replace("http://", "ws://").replace("https://", "wss://") + "/ws/pedidos?userId=" + ownerId;
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.tipo === "nuevo_pedido") handlerRef.current(msg.data);
        } catch {}
      };
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 3000); };
      ws.onerror = () => {};
    };

    connect();
    return () => { clearTimeout(reconnectTimer); ws?.close(); };
  }, [ownerId]);
}
