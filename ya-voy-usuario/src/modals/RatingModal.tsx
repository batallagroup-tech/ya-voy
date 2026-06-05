import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { GRAD, API } from "../lib/constants";

interface Props {
  pedido: any;
  onClose: () => void;
}

const FRASES: Record<number, Record<"rest" | "rep", string[]>> = {
  1: { rest: ["Tardaron mucho", "Comida fría", "Orden incorrecta", "Mala atención"], rep: ["Llegó tarde", "Mala actitud", "Comida dañada", "No siguió instrucciones"] },
  2: { rest: ["Tardaron mucho", "Comida fría", "Orden incorrecta", "Mala atención"], rep: ["Llegó tarde", "Mala actitud", "Comida dañada", "No siguió instrucciones"] },
  3: { rest: ["Bien en general", "Podría mejorar", "Comida correcta"], rep: ["Bien en general", "Entrega correcta", "Puntual"] },
  4: { rest: ["Excelente comida", "Rápido", "Todo perfecto", "Lo recomiendo"], rep: ["Muy amable", "Entrega rápida", "Excelente servicio", "Lo recomiendo"] },
  5: { rest: ["Excelente comida", "Rápido", "Todo perfecto", "Lo recomiendo"], rep: ["Muy amable", "Entrega rápida", "Excelente servicio", "Lo recomiendo"] },
};

function Estrella({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1 transition-transform hover:scale-110">
      <svg width="36" height="36" viewBox="0 0 24 24" fill={filled ? "#F59E0B" : "none"} stroke={filled ? "#F59E0B" : "#CBD5E1"} strokeWidth="1.5">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </button>
  );
}

export default function RatingModal({ pedido, onClose }: Props) {
  const [ratingRest, setRatingRest] = useState(0);
  const [ratingRep, setRatingRep] = useState(0);
  const [fraseRest, setFraseRest] = useState("");
  const [fraseRep, setFraseRep] = useState("");
  const [comentario, setComentario] = useState("");

  const enviar = async () => {
    if (!ratingRest || !ratingRep) { toast.error("Califica ambos para continuar"); return; }
    const partes = [fraseRest, fraseRep, comentario.trim()].filter(Boolean);
    await fetch(API + "/api/usuario/pedidos/" + pedido.id + "/rating", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating_restaurante: ratingRest, rating_repartidor: ratingRep, comentario_rating: partes.join(" | ") }),
    });
    toast.success("¡Gracias por tu calificación!");
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[70] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl p-6 space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">⭐</div>
          <h2 className="font-black text-xl text-slate-900">¿Cómo te fue?</h2>
          <p className="text-sm text-slate-500 mt-1">Tu opinión ayuda a mejorar el servicio</p>
        </div>

        {(["rest", "rep"] as const).map(tipo => {
          const [rating, setRating] = tipo === "rest" ? [ratingRest, setRatingRest] : [ratingRep, setRatingRep];
          const [frase, setFrase] = tipo === "rest" ? [fraseRest, setFraseRest] : [fraseRep, setFraseRep];
          const label = tipo === "rest" ? "🍽️ Restaurante" : "🛵 Repartidor";
          const frases = rating > 0 ? (FRASES[rating]?.[tipo] || []) : [];
          return (
            <div key={tipo}>
              <p className="font-bold text-slate-700 mb-3 text-sm">{label}</p>
              <div className="flex justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(i => <Estrella key={i} filled={i <= rating} onClick={() => { setRating(i); setFrase(""); }} />)}
              </div>
              {rating > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {frases.map(f => (
                    <button key={f} onClick={() => setFrase(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${frase === f ? (tipo === "rest" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-pink-500 bg-pink-50 text-pink-700") : "border-slate-200 text-slate-500"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div>
          <p className="font-bold text-slate-700 mb-2 text-sm">💬 Comentario (opcional)</p>
          <textarea
            value={comentario} onChange={e => setComentario(e.target.value.slice(0, 200))}
            placeholder="¿Qué tal estuvo? Cuéntanos más..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm resize-none outline-none focus:border-purple-400 font-medium"
          />
          <p className="text-right text-xs text-slate-400 mt-1">{comentario.length}/200</p>
        </div>

        <button onClick={enviar} className="w-full py-4 rounded-2xl text-white font-black text-lg" style={{ background: GRAD }}>
          Enviar calificación
        </button>
        <button onClick={onClose} className="w-full py-2 text-slate-400 text-sm font-bold">Omitir</button>
      </motion.div>
    </motion.div>
  );
}
