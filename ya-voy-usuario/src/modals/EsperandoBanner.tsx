import { motion } from "motion/react";
import { toast } from "sonner";
import { API } from "../lib/constants";

interface Props {
  timer: number;
  pedidoId: string;
  userId: string;
  userEmail: string | undefined;
  userName: string | undefined;
}

export default function EsperandoBanner({ timer, pedidoId, userId, userEmail, userName }: Props) {
  const reportar = async () => {
    try {
      await fetch(API + "/api/soporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: userId, usuarioEmail: userEmail, usuarioNombre: userName,
          tipo: "Repartidor no encontrado",
          comentario: "El repartidor marcó llegada pero el cliente no lo ve. Pedido: " + pedidoId,
        }),
      });
      toast.success("Reporte enviado. Estamos revisando.");
    } catch { toast.error("Error al enviar reporte"); }
  };

  return (
    <motion.div initial={{ y: -80 }} animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-[80] bg-amber-500 text-white p-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-black text-sm">🛵 El repartidor está en tu puerta</p>
          <p className="text-xs opacity-90">Sal a recibir tu pedido — si no sales en el tiempo indicado, el pedido se marca entregado sin reembolso</p>
        </div>
        <div className="text-2xl font-black tabular-nums ml-3">
          {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
        </div>
      </div>
      {timer > 0 && (
        <button onClick={reportar}
          className="mt-2 w-full py-2 bg-white/20 border border-white/40 rounded-xl text-white font-bold text-xs">
          ⚠️ No veo al repartidor — reportar
        </button>
      )}
      {timer === 0 && (
        <p className="text-xs font-bold mt-1 text-amber-100">Tiempo agotado — el pedido se marcó como entregado sin reembolso</p>
      )}
    </motion.div>
  );
}
