import { useState } from "react";
import { motion } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API } from "../lib/constants";

const OPCIONES = ["Me equivoqué al pedir", "Tardó demasiado", "Cambié de opinión", "El restaurante no responde", "Otro"];

interface Props {
  pedidoId: string;
  onCancelado: () => void;
  onClose: () => void;
}

export default function CancelarModal({ pedidoId, onCancelado, onClose }: Props) {
  const [razon, setRazon] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmar = async () => {
    if (!razon) { toast.error("Selecciona un motivo"); return; }
    setLoading(true);
    try {
      await fetch(API + "/api/usuario/pedidos/" + pedidoId + "/cancelar", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razon }),
      });
      toast.success("Pedido cancelado");
      onCancelado();
    } catch { toast.error("No se pudo cancelar"); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[75] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Cancelar pedido</h3>
          <button onClick={onClose}><X size={22} className="text-slate-400" /></button>
        </div>
        <p className="text-sm text-slate-500">Selecciona el motivo de cancelación:</p>
        <div className="space-y-2">
          {OPCIONES.map(op => (
            <button key={op} onClick={() => setRazon(op)}
              className={"w-full px-4 py-3 rounded-xl text-sm font-bold text-left border-2 transition-all " + (razon === op ? "border-red-400 bg-red-50 text-red-700" : "border-slate-100 text-slate-700 bg-slate-50")}>
              {op}
            </button>
          ))}
        </div>
        <button onClick={confirmar} disabled={!razon || loading}
          className="w-full py-4 rounded-2xl text-white font-black disabled:opacity-50 flex items-center justify-center gap-2 bg-red-500">
          {loading ? <Loader2 className="animate-spin" size={20} /> : null}
          Confirmar cancelación
        </button>
      </motion.div>
    </motion.div>
  );
}
