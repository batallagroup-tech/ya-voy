import { useEffect, useRef } from "react";
import { API } from "../lib/constants";

type PedidoUpdateHandler = (pedido: any) => void;
type NuevoMensajeHandler = (payload: any) => void;

export function usePedidosWS(
  userId: string | null | undefined,
  getToken: () => Promise<string | null>,
  onUpdate: PedidoUpdateHandler,
  onMensaje?: NuevoMensajeHandler
) {
  const handlerRef  = useRef(onUpdate);
  const msgHandlerRef = useRef(onMensaje);
  const getTokenRef = useRef(getToken);
  handlerRef.current  = onUpdate;
  msgHandlerRef.current = onMensaje;
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
          if ((msg.tipo === "pedido_update" || msg.tipo === "pedido_actualizado") && (msg.data || msg.pedido)) {
            handlerRef.current(msg.data || msg.pedido);
          } else if (msg.tipo === "nuevo_mensaje" && msgHandlerRef.current) {
            msgHandlerRef.current(msg);
          }
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
