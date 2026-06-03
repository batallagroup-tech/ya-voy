import { motion } from "motion/react";
import { X, Plus } from "lucide-react";
import { GRAD } from "../lib/constants";

interface Props {
  producto: any;
  onClose: () => void;
  onAddToCart: (p: any) => void;
  onVerNegocio: (negocio: any) => void;
}

export default function ProductoModal({ producto, onClose, onAddToCart, onVerNegocio }: Props) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="relative h-52 shrink-0">
          {producto.imagen_url
            ? <img src={producto.imagen_url} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: GRAD }}>🍽️</div>}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
            <X size={18} className="text-white" />
          </button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex items-start justify-between mb-2">
            <h2 className="font-black text-xl text-slate-900 flex-1">{producto.nombre}</h2>
            <span className="font-black text-xl ml-3" style={{ color: "#6C3CE1" }}>${Number(producto.precio).toFixed(2)}</span>
          </div>
          {producto.descripcion && (
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">{producto.descripcion}</p>
          )}
          <button onClick={() => {
            onVerNegocio({ id: producto.negocio_id, nombre: producto.negocio_nombre, imagen_url: producto.negocio_imagen, rating: producto.negocio_rating, tipo: "restaurante" });
            onClose();
          }} className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm mb-3 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            🏪 Ver todos los productos de {producto.negocio_nombre}
          </button>
        </div>
        <div className="p-4 border-t bg-white shrink-0">
          <button onClick={() => {
            onAddToCart({ id: producto.id, nombre: producto.nombre, precio: producto.precio, negocioId: producto.negocio_id });
            onClose();
          }} className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2" style={{ background: GRAD }}>
            <Plus size={20} /> Agregar al carrito
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
