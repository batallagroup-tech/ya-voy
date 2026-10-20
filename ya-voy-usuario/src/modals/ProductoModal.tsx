import { useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Check } from "lucide-react";
import { GRAD } from "../lib/constants";
import type { OpcionGrupo, OpcionSeleccionada } from "../types";

interface Props {
  producto: any;
  onClose: () => void;
  onAddToCart: (p: any, opciones?: OpcionSeleccionada[]) => void;
  onVerNegocio: (negocio: any) => void;
}

export default function ProductoModal({ producto, onClose, onAddToCart, onVerNegocio }: Props) {
  if (!producto) return null;

  let rawGrupos = producto.opciones;
  if (typeof rawGrupos === 'string') {
    try { rawGrupos = JSON.parse(rawGrupos); } catch { rawGrupos = []; }
  }
  const grupos: OpcionGrupo[] = (Array.isArray(rawGrupos) ? rawGrupos : [])
    .filter(g => g && typeof g === 'object' && g.nombre && String(g.nombre).trim().length > 0)
    .map(g => {
      let rawOps = g.opciones;
      if (typeof rawOps === 'string') {
        try { rawOps = JSON.parse(rawOps); } catch { rawOps = []; }
      }
      const validOptions = (Array.isArray(rawOps) ? rawOps : [])
        .filter(o => o && typeof o === 'object' && o.nombre && String(o.nombre).trim().length > 0)
        .map(o => ({
          ...o,
          nombre: String(o.nombre).trim(),
          precio: Number(o.precio) || 0
        }));
      return {
        ...g,
        nombre: String(g.nombre).trim(),
        opciones: validOptions
      };
    })
    .filter(g => g.opciones.length > 0);
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>({});

  const toggle = (grupoId: string, opcionId: string, tipo: 'unico' | 'multiple') => {
    setSeleccion(prev => {
      if (tipo === 'unico') {
        return { ...prev, [grupoId]: prev[grupoId]?.[0] === opcionId ? [] : [opcionId] };
      }
      const cur = prev[grupoId] || [];
      return { ...prev, [grupoId]: cur.includes(opcionId) ? cur.filter(id => id !== opcionId) : [...cur, opcionId] };
    });
  };

  const extrasTotal = grupos.reduce((sum, g) => {
    const ids = seleccion[g.id] || [];
    return sum + g.opciones.filter(o => ids.includes(o.id)).reduce((a, o) => a + o.precio, 0);
  }, 0);

  const precioFinal = Number(producto.precio || 0) + extrasTotal;

  const canAdd = grupos.every(g => !g.requerido || (seleccion[g.id]?.length ?? 0) > 0);

  const getSeleccionadas = (): OpcionSeleccionada[] =>
    grupos.flatMap(g =>
      g.opciones
        .filter(o => (seleccion[g.id] || []).includes(o.id))
        .map(o => ({ grupoNombre: g.nombre, nombre: o.nombre, precio: o.precio }))
    );

  const [ isWideImg, setIsWideImg ] = useState<boolean | null>(null);

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex flex-col justify-end backdrop-blur-[2px]">
      {/* Tap backdrop to close */}
      <div 
        className="flex-1 w-full cursor-pointer" 
        onClick={onClose} 
      />

      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 90 || info.velocity.y > 400) {
            onClose();
          }
        }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full rounded-t-[32px] overflow-hidden max-h-[92vh] flex flex-col relative shadow-2xl">

        {/* Top Handle bar (tap or drag down to dismiss) */}
        <div 
          onClick={onClose}
          className="w-full pt-3 pb-1 flex justify-center items-center cursor-pointer active:opacity-60 shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Big accessible Close Button */}
        <button 
          type="button"
          onClick={onClose}
          aria-label="Cerrar platillo"
          className="absolute top-3.5 right-3.5 z-30 w-11 h-11 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-transform cursor-pointer">
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="flex-1 overflow-y-auto">
          <div className={`relative w-full bg-slate-100 overflow-hidden ${
            producto.imagen_url
              ? (isWideImg === true ? "aspect-video" : isWideImg === false ? "aspect-square max-h-[360px]" : "aspect-video")
              : "h-44"
          }`}>
            {producto.imagen_url ? (
              <img
                src={producto.imagen_url}
                alt={producto.nombre}
                onLoad={e => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setIsWideImg(img.naturalWidth / img.naturalHeight > 1.25);
                  }
                }}
                className="w-full h-full object-contain bg-slate-900/5"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: GRAD }}>🍽️</div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-black text-xl text-slate-900 flex-1">{producto.nombre}</h2>
              <span className="font-black text-xl ml-3" style={{ color: "#9C0D38" }}>${Number(producto.precio).toFixed(2)}</span>
            </div>
            {producto.descripcion && (
              <p className="text-slate-500 text-sm mb-4 leading-relaxed">{producto.descripcion}</p>
            )}

            {grupos.map(grupo => (
              <div key={grupo.id} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-black text-slate-800 text-sm">{grupo.nombre}</p>
                  {grupo.requerido
                    ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: "#9C0D38" }}>Requerido</span>
                    : <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full">Opcional</span>}
                  <span className="text-[10px] text-slate-400 ml-auto">{grupo.tipo === 'unico' ? 'Elige 1' : 'Elige varios'}</span>
                </div>
                <div className="space-y-2">
                  {grupo.opciones.map(opcion => {
                    const selected = (seleccion[grupo.id] || []).includes(opcion.id);
                    return (
                      <button key={opcion.id} onClick={() => toggle(grupo.id, opcion.id, grupo.tipo)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left ${selected ? 'border-rose-400 bg-rose-50' : 'border-slate-100 bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-${grupo.tipo === 'unico' ? 'full' : 'md'} border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`}>
                            {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className="font-medium text-slate-800 text-sm">{opcion.nombre}</span>
                        </div>
                        {opcion.precio > 0 && (
                          <span className="text-sm font-black text-rose-600">+${opcion.precio.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {producto.negocio_nombre && (
              <button onClick={() => {
                onVerNegocio({ id: producto.negocio_id, nombre: producto.negocio_nombre, imagen_url: producto.negocio_imagen, rating: producto.negocio_rating, tipo: "restaurante" });
                onClose();
              }} className="w-full py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs mb-1 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-[0.99]">
                🏪 Ver todos los productos de {producto.negocio_nombre}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          {!canAdd && (
            <p className="text-xs text-center text-slate-400 mb-2">Selecciona las opciones requeridas para continuar</p>
          )}
          <button onClick={() => {
            onAddToCart(
              { id: producto.id, nombre: producto.nombre, precio: producto.precio, negocioId: producto.negocio_id || producto.negocioId },
              getSeleccionadas()
            );
            onClose();
          }} disabled={!canAdd}
            className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity active:scale-[0.99] shadow-lg shadow-rose-900/10 cursor-pointer"
            style={{ background: GRAD }}>
            <Plus size={18} />
            Agregar — ${precioFinal.toFixed(2)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
