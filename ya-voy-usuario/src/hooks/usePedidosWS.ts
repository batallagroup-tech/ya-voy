import { useEffect, useRef } from "react";
import { API } from "../lib/constants";

type PedidoUpdateHandler = (pedido: any) => void;

export function usePedidosWS(
  userId: string | null | undefined,
  getToken: () => Promise<string | null>,
  onUpdate: PedidoUpdateHandler
) {
  const handlerRef  = useRef(onUpdate);
  const getTokenRef = useRef(getToken);
  handlerRef.current  = onUpdate;
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!userId) return;

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
        + "/ws/pedidos?userId=" + userId
        + "&token=" + encodeURIComponent(token);

      ws = new WebSocket(wsUrl);

      ws.onopen = () => { failCount = 0; };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.tipo === "pedido_update") handlerRef.current(msg.data);
        } catch {}
      };

      ws.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {};
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [userId]);
}
