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
  const grupos: OpcionGrupo[] = producto.opciones || [];
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

  const precioFinal = Number(producto.precio) + extrasTotal;

  const canAdd = grupos.every(g => !g.requerido || (seleccion[g.id]?.length ?? 0) > 0);

  const getSeleccionadas = (): OpcionSeleccionada[] =>
    grupos.flatMap(g =>
      g.opciones
        .filter(o => (seleccion[g.id] || []).includes(o.id))
        .map(o => ({ grupoNombre: g.nombre, nombre: o.nombre, precio: o.precio }))
    );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col">

        <div className="relative h-48 shrink-0">
          {producto.imagen_url
            ? <img src={producto.imagen_url} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: GRAD }}>🍽️</div>}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-black text-xl text-slate-900 flex-1">{producto.nombre}</h2>
            <span className="font-black text-xl ml-3" style={{ color: "#6C3CE1" }}>${Number(producto.precio).toFixed(2)}</span>
          </div>
          {producto.descripcion && (
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">{producto.descripcion}</p>
          )}

          {grupos.map(grupo => (
            <div key={grupo.id} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-black text-slate-800 text-sm">{grupo.nombre}</p>
                {grupo.requerido
                  ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: "#6C3CE1" }}>Requerido</span>
                  : <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full">Opcional</span>}
                <span className="text-[10px] text-slate-400 ml-auto">{grupo.tipo === 'unico' ? 'Elige 1' : 'Elige varios'}</span>
              </div>
              <div className="space-y-2">
                {grupo.opciones.map(opcion => {
                  const selected = (seleccion[grupo.id] || []).includes(opcion.id);
                  return (
                    <button key={opcion.id} onClick={() => toggle(grupo.id, opcion.id, grupo.tipo)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left ${selected ? 'border-purple-400 bg-purple-50' : 'border-slate-100 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-${grupo.tipo === 'unico' ? 'full' : 'md'} border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-purple-500 bg-purple-500' : 'border-slate-300'}`}>
                          {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{opcion.nombre}</span>
                      </div>
                      {opcion.precio > 0 && (
                        <span className="text-sm font-black text-purple-600">+${opcion.precio.toFixed(2)}</span>
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
            }} className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm mb-1 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              🏪 Ver todos los productos de {producto.negocio_nombre}
            </button>
          )}
        </div>

        <div className="p-4 border-t bg-white shrink-0">
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
            className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            style={{ background: GRAD }}>
            <Plus size={20} />
            Agregar — ${precioFinal.toFixed(2)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
