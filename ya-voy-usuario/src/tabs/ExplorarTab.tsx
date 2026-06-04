import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, ChevronRight, Star, X, Clock } from "lucide-react";
import { GRAD } from "../lib/constants";
import type { Negocio } from "../types";

const MAX_HISTORIAL = 5;
const KEY = "ya_voy_busquedas";

function getHistorial(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function guardarBusqueda(q: string) {
  const prev = getHistorial().filter(h => h !== q);
  localStorage.setItem(KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORIAL)));
}

function borrarHistorial() { localStorage.removeItem(KEY); }

interface Props {
  negocios: Negocio[];
  onOpenNegocio: (n: Negocio) => void;
}

export default function ExplorarTab({ negocios, onOpenNegocio }: Props) {
  const [search, setSearch] = useState("");
  const [historial, setHistorial] = useState<string[]>(getHistorial);
  const [focused, setFocused] = useState(false);

  const filtrados = negocios.filter(n => n.nombre?.toLowerCase().includes(search.toLowerCase()));

  const buscar = (q: string) => {
    setSearch(q);
    if (q.trim().length > 1) {
      guardarBusqueda(q.trim());
      setHistorial(getHistorial());
    }
    setFocused(false);
  };

  const limpiarHistorial = () => { borrarHistorial(); setHistorial([]); };

  const mostrarHistorial = focused && !search && historial.length > 0;

  return (
    <motion.div key="explorar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
      <h2 className="text-2xl font-black text-slate-900">Explorador</h2>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => { if (e.key === "Enter" && search.trim()) buscar(search); }}
          placeholder="Busca comida, tiendas o productos..."
          className="w-full pl-12 pr-10 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={16} />
          </button>
        )}

        {mostrarHistorial && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-lg z-10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Búsquedas recientes</span>
              <button onClick={limpiarHistorial} className="text-[10px] text-purple-500 font-bold">Limpiar</button>
            </div>
            {historial.map(h => (
              <button key={h} onMouseDown={() => buscar(h)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-all text-left">
                <Clock size={14} className="text-slate-300 shrink-0" />
                <span className="text-sm text-slate-700 font-medium">{h}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtrados.map(n => {
        const pausado = n.aceptando_pedidos === false;
        return (
          <button key={n.id} onClick={() => onOpenNegocio(n)}
            className={`w-full bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 text-left hover:shadow-sm transition-all ${pausado ? "opacity-70" : ""}`}>
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative" style={{ background: GRAD }}>
              {n.imagen_url ? <img src={n.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
              {pausado && <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl"><span className="text-white text-[8px] font-black">PAUSADO</span></div>}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">{n.nombre}</p>
              {pausado
                ? <p className="text-xs font-bold text-yellow-600">Pausado temporalmente</p>
                : <p className="text-xs text-slate-500">{n.tipo} · <Star size={10} className="inline text-yellow-400 fill-yellow-400" /> {Number(n.rating || 0).toFixed(1)}</p>}
              {n.direccion && <p className="text-[10px] text-slate-400 truncate mt-0.5">{n.direccion}</p>}
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
        );
      })}

      {search && filtrados.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin resultados para "{search}"</p>
        </div>
      )}
    </motion.div>
  );
}
