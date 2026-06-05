import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Search, ChevronRight, Star, X, Clock, SlidersHorizontal } from "lucide-react";
import { GRAD, API } from "../lib/constants";
import { imgUrl } from "../lib/cloudinary";
import type { Negocio } from "../types";

function SkeletonCard() {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-2 bg-slate-200 rounded w-1/2" />
        <div className="h-2 bg-slate-200 rounded w-1/3" />
      </div>
    </div>
  );
}

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

type FiltroTipo = "todos" | "comida" | "tienda";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  negocios: Negocio[];
  userLocation: [number, number] | null;
  onOpenNegocio: (n: Negocio) => void;
}

export default function ExplorarTab({ negocios, userLocation, onOpenNegocio }: Props) {
  const [search, setSearch] = useState("");
  const [historial, setHistorial] = useState<string[]>(getHistorial);
  const [focused, setFocused] = useState(false);
  const [resultados, setResultados] = useState<{ negocios: Negocio[], productos: any[] } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [ordenRating, setOrdenRating] = useState(false);
  const [ordenDistancia, setOrdenDistancia] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) { setResultados(null); return; }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/api/usuario/buscar?q=${encodeURIComponent(search.trim())}`);
        const data = await r.json();
        setResultados(data);
      } catch { setResultados(null); }
      finally { setBuscando(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const base = resultados
    ? resultados.negocios as Negocio[]
    : negocios.filter(n => n.nombre?.toLowerCase().includes(search.toLowerCase()));

  const filtrados = base
    .filter(n => filtroTipo === "todos" || n.tipo?.toLowerCase() === filtroTipo)
    .sort((a, b) => {
      if (ordenDistancia && userLocation && a.lat && b.lat) {
        const da = haversineKm(userLocation[0], userLocation[1], a.lat, a.lng!);
        const db = haversineKm(userLocation[0], userLocation[1], b.lat, b.lng!);
        return da - db;
      }
      if (ordenRating) return Number(b.rating || 0) - Number(a.rating || 0);
      return 0;
    });

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

  const hayFiltros = filtroTipo !== "todos" || ordenRating || ordenDistancia;

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
        {search && !buscando && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            <X size={16} />
          </button>
        )}
        {buscando && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
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

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
        {(["todos", "comida", "tienda"] as FiltroTipo[]).map(tipo => (
          <button key={tipo} onClick={() => setFiltroTipo(tipo)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black border transition-all capitalize ${
              filtroTipo === tipo
                ? "text-white border-transparent"
                : "border-slate-200 text-slate-500 bg-white"
            }`}
            style={filtroTipo === tipo ? { background: GRAD } : {}}>
            {tipo === "todos" ? "Todos" : tipo === "comida" ? "Comida" : "Tienda"}
          </button>
        ))}
        <button onClick={() => setOrdenRating(v => !v)}
          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
            ordenRating
              ? "text-white border-transparent"
              : "border-slate-200 text-slate-500 bg-white"
          }`}
          style={ordenRating ? { background: GRAD } : {}}>
          <Star size={11} className={ordenRating ? "fill-white text-white" : "text-slate-400"} />
          Mejor rating
        </button>
        {userLocation && (
          <button onClick={() => { setOrdenDistancia(v => !v); if (!ordenDistancia) setOrdenRating(false); }}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
              ordenDistancia ? "text-white border-transparent" : "border-slate-200 text-slate-500 bg-white"
            }`}
            style={ordenDistancia ? { background: GRAD } : {}}>
            📍 Más cercano
          </button>
        )}
        {hayFiltros && (
          <button onClick={() => { setFiltroTipo("todos"); setOrdenRating(false); setOrdenDistancia(false); }}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-black border border-slate-200 text-slate-400 bg-white flex items-center gap-1">
            <X size={10} /> Limpiar
          </button>
        )}
      </div>

      {filtrados.map(n => {
        const pausado = n.aceptando_pedidos === false;
        return (
          <button key={n.id} onClick={() => onOpenNegocio(n)}
            className={`w-full bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 text-left hover:shadow-sm transition-all ${pausado ? "opacity-70" : ""}`}>
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative" style={{ background: GRAD }}>
              {n.imagen_url ? <img src={imgUrl(n.imagen_url, 96)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
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

      {resultados && resultados.productos.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1 mb-2">Productos</p>
          {resultados.productos.map((p: any) => (
            <button key={p.id} onClick={() => {
              const negocio = negocios.find((n: any) => n.id === p.negocio_id);
              if (negocio) onOpenNegocio(negocio);
            }}
              className="w-full bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 text-left hover:shadow-sm transition-all mb-2">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                {p.imagen_url ? <img src={imgUrl(p.imagen_url, 80)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-sm">{p.nombre}</p>
                <p className="text-xs text-slate-400">{p.negocio_nombre} · <span className="font-bold text-slate-600">${Number(p.precio).toFixed(2)}</span></p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          ))}
        </div>
      )}

      {buscando && !resultados && [1,2,3].map(i => <SkeletonCard key={i} />)}

      {!search && filtrados.length === 0 && negocios.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <span className="text-5xl block mb-3">🕙</span>
          <p className="font-black text-slate-600 text-base">Sin restaurantes abiertos</p>
          <p className="text-sm mt-1">Los restaurantes suelen abrir a partir de las 10:00am</p>
        </div>
      )}

      {!search && filtrados.length === 0 && negocios.length > 0 && (
        <div className="text-center py-8 text-slate-400">
          <SlidersHorizontal size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Sin resultados con estos filtros</p>
          <button onClick={() => { setFiltroTipo("todos"); setOrdenRating(false); }}
            className="mt-3 text-xs font-bold text-purple-500">Limpiar filtros</button>
        </div>
      )}

      {search && !buscando && filtrados.length === 0 && (!resultados || resultados.productos.length === 0) && (
        <div className="text-center py-8 text-slate-400">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Sin resultados para "{search}"</p>
          <p className="text-xs mt-1">Intenta con otra palabra clave</p>
        </div>
      )}
    </motion.div>
  );
}
