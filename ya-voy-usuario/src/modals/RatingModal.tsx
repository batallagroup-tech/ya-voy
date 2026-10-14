import { useState } from "react";
import { motion } from "motion/react";
import { Star, X, Loader2, Sparkles, Utensils, Bike } from "lucide-react";
import { toast } from "sonner";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { GRAD, API } from "../lib/constants";

interface Props {
  pedido: any;
  onClose: () => void;
  onRatingEnviado?: (pedidoId: string, ratingData: any) => void;
}

const FRASES: Record<number, Record<"rest" | "rep", string[]>> = {
  1: { 
    rest: ["Tardó mucho", "Comida fría", "Orden incompleta", "Mala calidad"], 
    rep: ["Llegó tarde", "Mala actitud", "Comida derramada", "No encontró dirección"] 
  },
  2: { 
    rest: ["Tardó mucho", "Comida fría", "Porción pequeña", "Podría mejorar"], 
    rep: ["Llegó tarde", "Mala actitud", "Paquete maltratado", "Sin cambio"] 
  },
  3: { 
    rest: ["Comida correcta", "Sabor aceptable", "A tiempo regular"], 
    rep: ["Entrega correcta", "Puntualidad regular", "Amable"] 
  },
  4: { 
    rest: ["Muy rica comida", "Buen empaque", "Rápida preparación", "Lo recomiendo"], 
    rep: ["Muy amable", "Entrega rápida", "Cuidó el pedido", "Excelente servicio"] 
  },
  5: { 
    rest: ["¡Delicioso!", "Todo perfecto", "Super rápido", "100% recomendado"], 
    rep: ["¡Excelente repartidor!", "Super rápido", "Super amable", "10/10"] 
  },
};

function Estrella({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <button 
      type="button" 
      onClick={onClick} 
      className="p-1.5 transition-transform active:scale-125 hover:scale-110">
      <Star 
        size={32} 
        className={filled ? "text-yellow-400 fill-yellow-400 drop-shadow" : "text-slate-300"} 
      />
    </button>
  );
}

export default function RatingModal({ pedido, onClose, onRatingEnviado }: Props) {
  const { getToken } = useFirebaseAuth();
  const [ratingRest, setRatingRest] = useState(5);
  const [ratingRep, setRatingRep] = useState(5);
  const [fraseRest, setFraseRest] = useState("");
  const [fraseRep, setFraseRep] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!ratingRest || !ratingRep) {
      toast.error("Por favor califica ambos servicios");
      return;
    }
    setEnviando(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = "Bearer " + token;
      }
      const partes = [fraseRest, fraseRep, comentario.trim()].filter(Boolean);
      const res = await fetch(API + "/api/usuario/pedidos/" + pedido.id + "/rating", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          rating_restaurante: ratingRest,
          rating_repartidor: ratingRep,
          comentario_rating: partes.join(" | ")
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar la calificación");
      }
      toast.success("¡Muchas gracias por calificar!");
      if (onRatingEnviado) {
        onRatingEnviado(pedido.id, { rating_restaurante: ratingRest, rating_repartidor: ratingRep });
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Error al enviar la calificación");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[75] flex items-end backdrop-blur-sm">
      <motion.div 
        initial={{ y: 400 }} 
        animate={{ y: 0 }} 
        exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-600">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">¿Cómo estuvo tu pedido?</h2>
              <p className="text-xs text-slate-500">{pedido.negocio_nombre || "Tu orden"}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Calificación Restaurante */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Utensils size={16} className="text-rose-600" />
            <span className="font-black text-slate-800 text-xs uppercase tracking-wider">
              {pedido.negocio_nombre || "Restaurante"}
            </span>
          </div>
          <div className="flex justify-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Estrella key={i} filled={i <= ratingRest} onClick={() => { setRatingRest(i); setFraseRest(""); }} />
            ))}
          </div>
          {ratingRest > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {(FRASES[ratingRest]?.rest || []).map(f => (
                <button 
                  key={f} 
                  type="button" 
                  onClick={() => setFraseRest(fraseRest === f ? "" : f)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    fraseRest === f 
                      ? "border-rose-500 bg-rose-100 text-rose-700 shadow-sm" 
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Calificación Repartidor */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Bike size={16} className="text-pink-600" />
            <span className="font-black text-slate-800 text-xs uppercase tracking-wider">
              Servicio de Reparto
            </span>
          </div>
          <div className="flex justify-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Estrella key={i} filled={i <= ratingRep} onClick={() => { setRatingRep(i); setFraseRep(""); }} />
            ))}
          </div>
          {ratingRep > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-2">
              {(FRASES[ratingRep]?.rep || []).map(f => (
                <button 
                  key={f} 
                  type="button" 
                  onClick={() => setFraseRep(fraseRep === f ? "" : f)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    fraseRep === f 
                      ? "border-pink-500 bg-pink-100 text-pink-700 shadow-sm" 
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comentario adicional */}
        <div>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value.slice(0, 250))}
            placeholder="¿Algún comentario extra sobre tu comida o la entrega?"
            rows={2}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs resize-none outline-none focus:border-rose-400 font-medium"
          />
          <p className="text-right text-[10px] text-slate-400 mt-0.5">{comentario.length}/250</p>
        </div>

        <div className="space-y-2 pt-1">
          <button 
            onClick={enviar} 
            disabled={enviando}
            className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all disabled:opacity-50" 
            style={{ background: GRAD }}>
            {enviando ? <Loader2 size={18} className="animate-spin" /> : null}
            Enviar Calificación
          </button>
          <button 
            onClick={onClose} 
            className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors">
            Ahora no
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
