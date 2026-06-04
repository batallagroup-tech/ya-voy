import { useState } from "react";
import { motion } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GRAD, API } from "../lib/constants";

const OPCIONES = [
  "Mi pedido no llegó",
  "El repartidor no llegó",
  "Producto incorrecto o en mal estado",
  "Cobro incorrecto",
  "El restaurante no aceptó mi pedido",
  "Otro",
];

const REQUIEREN_PEDIDO = new Set(["Mi pedido no llegó", "El repartidor no llegó", "Producto incorrecto o en mal estado", "Cobro incorrecto"]);

interface Props {
  userId: string;
  userEmail: string | undefined;
  userName: string | undefined;
  whatsappUrl: string | undefined;
  pedidos?: any[];
  onClose: () => void;
}

export default function SoporteModal({ userId, userEmail, userName, whatsappUrl, pedidos = [], onClose }: Props) {
  const [tipo, setTipo] = useState("");
  const [pedidoId, setPedidoId] = useState("");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  const pedidosRecientes = pedidos.slice(0, 10);
  const necesitaPedido = REQUIEREN_PEDIDO.has(tipo);

  const enviar = async () => {
    if (!tipo) { toast.error("Selecciona un motivo"); return; }
    if (necesitaPedido && !pedidoId) { toast.error("Selecciona el pedido con el problema"); return; }
    setLoading(true);
    try {
      await fetch(API + "/api/soporte", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: userId, usuarioEmail: userEmail, usuarioNombre: userName, tipo, comentario, pedidoId: pedidoId || null }),
      });
      toast.success("Reporte enviado. Te contactaremos pronto.");
      onClose();
    } catch { toast.error("Error al enviar reporte"); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[70] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Ayuda y soporte</h3>
          <button onClick={onClose}><X size={22} className="text-slate-400" /></button>
        </div>
        <p className="text-sm text-slate-500">Selecciona el motivo de tu reporte:</p>
        <div className="space-y-2">
          {OPCIONES.map(op => (
            <button key={op} onClick={() => { setTipo(op); setPedidoId(""); }}
              className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-left border-2 transition-all ${tipo === op ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-100 text-slate-700 bg-slate-50"}`}>
              {op}
            </button>
          ))}
        </div>

        {tipo && necesitaPedido && pedidosRecientes.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              ¿Cuál pedido? <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pedidosRecientes.map(p => (
                <button key={p.id} onClick={() => setPedidoId(p.id)}
                  className={`w-full px-4 py-3 rounded-xl text-sm text-left border-2 transition-all ${pedidoId === p.id ? "border-purple-500 bg-purple-50" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">#{p.id?.slice(-6).toUpperCase()}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${p.status === 'entregado' ? 'bg-green-500' : p.status === 'cancelado' ? 'bg-red-500' : 'bg-orange-500'}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{p.negocio_nombre} · {new Date(p.creado_en).toLocaleDateString("es-MX")} · ${p.total}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {tipo && (
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Comentario adicional (opcional)</label>
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              placeholder="Describe tu problema..."
              className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 resize-none h-24" />
          </div>
        )}
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noreferrer"
            className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 bg-green-500">
            💬 Contactar por WhatsApp
          </a>
        )}
        <button onClick={enviar} disabled={!tipo || loading || (necesitaPedido && !pedidoId && pedidosRecientes.length > 0)}
          style={{ background: GRAD }}
          className="w-full py-4 text-white font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={20} /> : null}
          Enviar reporte
        </button>
      </motion.div>
    </motion.div>
  );
}
