import { useState, useEffect, useRef } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { motion } from "motion/react";
import { X, MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GRAD, API } from "../lib/constants";

interface Props {
  pedidoId: string;
  userId: string;
  onClose: () => void;
  onMensajesLeidos: (pedidoId: string) => void;
}

export default function ChatModal({ pedidoId, userId, onClose, onMensajesLeidos }: Props) {
  const { getToken } = useFirebaseAuth();
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const pollRef = useRef<any>(null);

  const cargar = async () => {
    try {
      const token = await getToken();
      const res = await fetch(API + "/api/mensajes/" + pedidoId, { headers: { "Authorization": "Bearer " + token } });
      const data = await res.json();
      if (Array.isArray(data)) setMensajes(data);
    } catch {}
  };

  useEffect(() => {
    cargar();
    getToken().then(token => {
      fetch(API + "/api/mensajes/" + pedidoId + "/leidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ lectorTipo: "cliente" }),
      }).catch(() => {});
    });
    onMensajesLeidos(pedidoId);
    pollRef.current = setInterval(cargar, 3000);
    return () => clearInterval(pollRef.current);
  }, [pedidoId]);

  const enviar = async () => {
    if (!texto.trim() || !userId) return;
    setEnviando(true);
    try {
      const token = await getToken();
      await fetch(API + "/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ pedidoId, remitenteId: userId, remitenteTipo: "cliente", texto }),
      });
      setTexto("");
      await cargar();
    } catch { toast.error("Error al enviar"); }
    finally { setEnviando(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[95] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl flex flex-col" style={{ maxHeight: "80vh" }}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-purple-500" /> Chat con el repartidor
          </h3>
          <button onClick={onClose}><X size={22} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {mensajes.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Sin mensajes aún</p>}
          {mensajes.map(m => (
            <div key={m.id} className={`flex ${m.remitente_tipo === "cliente" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm font-medium ${m.remitente_tipo === "cliente" ? "text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"}`}
                style={m.remitente_tipo === "cliente" ? { background: GRAD } : {}}>
                {m.texto}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0 flex gap-2">
          <input value={texto} onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-sm border border-slate-200 outline-none focus:border-purple-400" />
          <button onClick={enviar} disabled={enviando || !texto.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40" style={{ background: GRAD }}>
            {enviando ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
