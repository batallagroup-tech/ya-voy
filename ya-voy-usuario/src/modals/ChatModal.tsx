import { useState, useEffect, useRef } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { motion } from "motion/react";
import { X, MessageSquare, Send, Loader2, Bike } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const cargar = async () => {
    try {
      const token = await getToken();
      const res = await fetch(API + "/api/mensajes/" + pedidoId, { 
        headers: { "Authorization": "Bearer " + token } 
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMensajes(data);
        setTimeout(scrollToBottom, 100);
      }
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
    const msgTexto = texto.trim();
    setTexto("");
    setEnviando(true);
    try {
      const token = await getToken();
      await fetch(API + "/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ pedidoId, remitenteId: userId, remitenteTipo: "cliente", texto: msgTexto }),
      });
      await cargar();
    } catch { 
      toast.error("No se pudo enviar el mensaje"); 
    } finally { 
      setEnviando(false); 
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[95] flex items-end backdrop-blur-sm">
      <motion.div 
        initial={{ y: 400 }} 
        animate={{ y: 0 }} 
        exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl flex flex-col shadow-2xl overflow-hidden" 
        style={{ maxHeight: "85vh", height: "70vh" }}>
        
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
              <Bike size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Chat con tu Repartidor</h3>
              <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> En línea para este pedido
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {mensajes.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-12">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-25" />
              <p className="font-bold">Escribe instrucciones o detalles para tu entrega</p>
              <p className="text-[11px] mt-0.5">Ej: "Es el portón negro con timbre blanco"</p>
            </div>
          ) : (
            mensajes.map(m => {
              const esMio = m.remitente_tipo === "cliente";
              return (
                <div key={m.id} className={`flex flex-col ${esMio ? "items-end" : "items-start"}`}>
                  <div 
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                      esMio 
                        ? "text-white rounded-br-none" 
                        : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                    }`}
                    style={esMio ? { background: GRAD } : {}}>
                    {m.texto}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {new Date(m.creado_en || Date.now()).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-100 bg-white shrink-0 flex items-center gap-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
          <input 
            value={texto} 
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder="Escribe un mensaje al repartidor..."
            className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-xs border border-slate-200 outline-none focus:border-rose-400 font-medium" 
          />
          <button 
            onClick={enviar} 
            disabled={enviando || !texto.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform disabled:opacity-40 shrink-0" 
            style={{ background: GRAD }}>
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
