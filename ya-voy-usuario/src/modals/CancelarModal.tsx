import { useState } from "react";
import { motion } from "motion/react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { API } from "../lib/constants";

const OPCIONES = [
  "Me equivoqué al pedir",
  "Tardó demasiado tiempo",
  "Cambié de opinión",
  "El restaurante no responde",
  "Dirección incorrecta",
  "Otro motivo",
];

interface Props {
  pedidoId: string;
  onCancelado: () => void;
  onClose: () => void;
}

export default function CancelarModal({ pedidoId, onCancelado, onClose }: Props) {
  const { getToken } = useFirebaseAuth();
  const [razon, setRazon] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmar = async () => {
    if (!razon) {
      toast.error("Por favor selecciona un motivo");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = "Bearer " + token;
      }
      const res = await fetch(API + "/api/usuario/pedidos/" + pedidoId + "/cancelar", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ razon }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo cancelar el pedido");
      }
      toast.success("Pedido cancelado exitosamente");
      onCancelado();
    } catch (e: any) {
      toast.error(e.message || "No se pudo cancelar el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[75] flex items-end backdrop-blur-sm">
      <motion.div 
        initial={{ y: 350 }} 
        animate={{ y: 0 }} 
        exit={{ y: 350 }}
        className="bg-white w-full rounded-t-3xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Cancelar pedido</h3>
              <p className="text-xs text-slate-500">#{pedidoId.slice(-6).toUpperCase()}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs font-bold text-slate-600">Selecciona el motivo de cancelación:</p>

        <div className="space-y-2">
          {OPCIONES.map(op => (
            <button 
              key={op} 
              onClick={() => setRazon(op)}
              className={"w-full px-4 py-3 rounded-2xl text-xs font-bold text-left border-2 transition-all " + 
                (razon === op ? "border-red-500 bg-red-50 text-red-700 shadow-sm" : "border-slate-100 text-slate-700 bg-slate-50 hover:bg-slate-100")}>
              {op}
            </button>
          ))}
        </div>

        <div className="pt-2 flex gap-3">
          <button 
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-colors">
            No, volver
          </button>
          <button 
            onClick={confirmar} 
            disabled={!razon || loading}
            className="flex-1 py-3.5 rounded-2xl text-white font-black text-xs disabled:opacity-50 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-[0.99] transition-all shadow-md">
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Confirmar cancelación
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
