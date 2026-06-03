import { useState } from "react";
import { motion } from "motion/react";
import { Search, ChevronRight } from "lucide-react";
import { GRAD } from "../lib/constants";
import type { Negocio } from "../types";

interface Props {
  negocios: Negocio[];
  onOpenNegocio: (n: Negocio) => void;
}

export default function ExplorarTab({ negocios, onOpenNegocio }: Props) {
  const [search, setSearch] = useState("");

  const filtrados = negocios.filter(n => n.nombre?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div key="explorar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
      <h2 className="text-2xl font-black text-slate-900">Explorador</h2>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Busca comida, tiendas o productos..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 shadow-sm" />
      </div>
      {filtrados.map(n => (
        <button key={n.id} onClick={() => onOpenNegocio(n)}
          className="w-full bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 text-left hover:shadow-sm transition-all">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: GRAD }}>
            {n.imagen_url ? <img src={n.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">{n.nombre}</p>
            <p className="text-xs text-slate-500">{n.tipo} · Envío $35</p>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </button>
      ))}
      {search && filtrados.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin resultados para "{search}"</p>
        </div>
      )}
    </motion.div>
  );
}
