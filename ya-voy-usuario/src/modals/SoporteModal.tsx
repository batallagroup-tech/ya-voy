import { useState } from "react";
import { motion } from "motion/react";
import { X, Loader2, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { GRAD, API } from "../lib/constants";

const OPCIONES_SOPORTE = [
  { id: "pedido_demorado", label: "🛵 Demora o problema con mi pedido", desc: "El repartidor o restaurante tarda más de lo esperado" },
  { id: "cobro_tarjeta", label: "💳 Aclaración de cobro o pago", desc: "Dudas sobre el cargo, tarjeta o saldo" },
  { id: "direccion_entrega", label: "📍 Corregir mi dirección de entrega", desc: "Mi ubicación o número exterior es incorrecto" },
  { id: "queja_comida", label: "🍽️ Producto incorrecto o en mal estado", desc: "Faltó un platillo o llegó en malas condiciones" },
  { id: "cuenta_acceso", label: "👤 Problema con mi cuenta o inicio de sesión", desc: "Recuperación de cuenta o perfil de usuario" },
  { id: "dudas_generales", label: "💬 Dudas generales o sugerencia", desc: "Preguntas sobre el servicio o comentarios" },
];

const REQUIEREN_PEDIDO = new Set(["pedido_demorado", "cobro_tarjeta", "queja_comida"]);

interface Props {
  userId: string;
  userEmail: string | undefined;
  userName: string | undefined;
  whatsappUrl?: string;
  pedidos?: any[];
  onClose: () => void;
}

export default function SoporteModal({ userId, userEmail, userName, whatsappUrl, pedidos = [], onClose }: Props) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("");
  const [pedidoId, setPedidoId] = useState("");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  const pedidosRecientes = pedidos.slice(0, 8);
  const opcionActiva = OPCIONES_SOPORTE.find(o => o.id === tipoSeleccionado);
  const necesitaPedido = tipoSeleccionado ? REQUIEREN_PEDIDO.has(tipoSeleccionado) : false;

  const telefonoSoporte = "527641311374";

  const abrirWhatsAppConReporte = (opcion?: string) => {
    const op = opcion || opcionActiva?.label || "Consulta General";
    const pedidoObj = pedidos.find(p => p.id === pedidoId);
    const infoPedido = pedidoId 
      ? `\n📦 *Pedido:* #${pedidoId.slice(-6).toUpperCase()}${pedidoObj?.negocio_nombre ? ` (${pedidoObj.negocio_nombre})` : ""}${pedidoObj?.total ? ` - Total: $${pedidoObj.total}` : ""}`
      : "";
    const infoComentario = comentario.trim() ? `\n📝 *Comentario:* ${comentario.trim()}` : "";

    const mensaje = 
`¡Hola Soporte Ya Voy! 👋
Requiero asistencia para mi cuenta de *Cliente / Usuario*.

📌 *Motivo:* ${op}${infoPedido}
👤 *Usuario:* ${userName || "Cliente"}
📧 *Email/Tel:* ${userEmail || "No registrado"}
🆔 *ID:* ${userId || "N/A"}${infoComentario}

Quedo atento a su respuesta. ¡Muchas gracias!`;

    const url = `https://wa.me/${telefonoSoporte}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
    toast.success("Abriendo WhatsApp con tu reporte listo...");
    onClose();
  };

  const enviarReporteInterno = async () => {
    if (!tipoSeleccionado) { toast.error("Selecciona un motivo"); return; }
    if (necesitaPedido && !pedidoId && pedidosRecientes.length > 0) { 
      toast.error("Selecciona el pedido relacionado"); return; 
    }
    setLoading(true);
    try {
      await fetch(API + "/api/soporte", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          usuarioId: userId, 
          usuarioEmail: userEmail, 
          usuarioNombre: userName, 
          tipo: opcionActiva?.label || tipoSeleccionado, 
          comentario, 
          pedidoId: pedidoId || null 
        }),
      });
      toast.success("Reporte enviado con éxito. Te responderemos a la brevedad.");
      onClose();
    } catch { 
      toast.error("Error al enviar reporte interno"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[70] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Ayuda y Soporte Técnico</h3>
            <p className="text-xs text-slate-500">Selecciona el tipo de reporte que necesitas enviar</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
            <X size={22} className="text-slate-400" />
          </button>
        </div>

        {/* Lista de Opciones de Soporte */}
        <div className="space-y-2">
          {OPCIONES_SOPORTE.map(op => {
            const isSelected = tipoSeleccionado === op.id;
            return (
              <button 
                key={op.id} 
                onClick={() => { 
                  setTipoSeleccionado(op.id); 
                  if (!REQUIEREN_PEDIDO.has(op.id)) setPedidoId("");
                }}
                className={`w-full p-3.5 rounded-2xl text-left border-2 transition-all flex items-start justify-between gap-3 ${
                  isSelected 
                    ? "border-[#9C0D38] bg-rose-50/60 shadow-xs" 
                    : "border-slate-100 text-slate-700 bg-slate-50/70 hover:border-slate-200"
                }`}>
                <div className="flex-1">
                  <p className={`text-xs font-black ${isSelected ? "text-[#9C0D38]" : "text-slate-800"}`}>
                    {op.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{op.desc}</p>
                </div>
                {isSelected && <CheckCircle2 size={18} className="text-[#9C0D38] shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Selector de Pedido si la opción lo requiere */}
        {tipoSeleccionado && necesitaPedido && pedidosRecientes.length > 0 && (
          <div className="pt-1">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">
              Selecciona el pedido relacionado: <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {pedidosRecientes.map(p => (
                <button 
                  key={p.id} 
                  type="button"
                  onClick={() => setPedidoId(p.id)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left border-2 transition-all ${
                    pedidoId === p.id 
                      ? "border-rose-500 bg-rose-50/80" 
                      : "border-slate-100 bg-slate-50 hover:bg-slate-100/60"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-800">#{p.id?.slice(-6).toUpperCase()}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${
                      p.status === 'entregado' ? 'bg-emerald-500' : p.status === 'cancelado' ? 'bg-red-500' : 'bg-orange-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {p.negocio_nombre || "Restaurante"} · {new Date(p.creado_en).toLocaleDateString("es-MX")} · ${Number(p.total).toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comentario adicional */}
        {tipoSeleccionado && (
          <div className="pt-1">
            <label className="text-xs font-bold text-slate-600 block mb-1.5">
              Detalles o descripción (opcional):
            </label>
            <textarea 
              value={comentario} 
              onChange={e => setComentario(e.target.value)}
              placeholder="Explica brevemente qué ocurrió..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:ring-2 focus:ring-[#9C0D38]/30 resize-none" 
            />
          </div>
        )}

        {/* Botones de Acción */}
        <div className="space-y-2.5 pt-2">
          {/* Botón WhatsApp - Acción principal solicitada */}
          <button 
            type="button"
            onClick={() => abrirWhatsAppConReporte()}
            disabled={!tipoSeleccionado}
            className="w-full py-3.5 rounded-2xl font-black text-xs text-white flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50">
            <MessageSquare size={17} />
            Continuar y Enviar a WhatsApp
          </button>

          {/* Botón Reporte Interno */}
          <button 
            type="button"
            onClick={enviarReporteInterno} 
            disabled={!tipoSeleccionado || loading || (necesitaPedido && !pedidoId && pedidosRecientes.length > 0)}
            style={{ background: GRAD }}
            className="w-full py-3 rounded-2xl text-white font-black text-xs disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={15} />}
            Enviar reporte dentro de la app
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
