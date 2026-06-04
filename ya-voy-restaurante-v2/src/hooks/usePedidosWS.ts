import { useEffect, useRef } from "react";
import { API } from "../lib/api";

type Handler = (pedido: any) => void;

export function usePedidosWS(
  ownerId: string | null | undefined,
  getToken: () => Promise<string | null>,
  onNuevoPedido: Handler
) {
  const handlerRef  = useRef(onNuevoPedido);
  const getTokenRef = useRef(getToken);
  handlerRef.current  = onNuevoPedido;
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!ownerId) return;

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let failCount = 0;

    const connect = async () => {
      if (cancelled) return;
      const token = await getTokenRef.current();
      if (cancelled) return;
      if (!token) {
        failCount++;
        if (failCount > 10) return;
        if (!cancelled) reconnectTimer = setTimeout(connect, 30000);
        return;
      }
      failCount = 0;
      const wsUrl = API.replace("http://", "ws://").replace("https://", "wss://")
        + "/ws/pedidos?userId=" + ownerId
        + "&token=" + encodeURIComponent(token);

      ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.tipo === "nuevo_pedido") handlerRef.current(msg.data);
        } catch {}
      };
      ws.onclose = () => { if (!cancelled) reconnectTimer = setTimeout(connect, 3000); };
      ws.onerror = () => {};
    };

    connect();
    return () => { cancelled = true; clearTimeout(reconnectTimer); ws?.close(); };
  }, [ownerId]);
}
