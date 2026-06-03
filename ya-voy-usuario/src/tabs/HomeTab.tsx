import { motion } from "motion/react";
import { ShoppingBag, Utensils, Store, Package, Star, ChevronRight, Plus } from "lucide-react";
import { GRAD } from "../lib/constants";
import type { CartItem } from "../lib/constants";
import type { Negocio, Producto } from "../types";
import { imgUrl } from "../lib/cloudinary";

const SUB_CATEGORIAS: Record<string, string[]> = {
  comida: ["Todos", "Tacos", "Hamburguesas", "Pizza", "Sushi", "Comida Corrida", "Alitas", "Ensaladas", "Mariscos", "Postres", "Bebidas"],
  tienda: ["Todos"],
  envio: [],
};

interface Props {
  categoria: "comida" | "tienda" | "envio";
  subCategoria: string;
  negocios: Negocio[];
  productosFeed: Producto[];
  cart: CartItem[];
  loading: boolean;
  onCategoriaChange: (c: "comida" | "tienda" | "envio") => void;
  onSubCategoriaChange: (s: string) => void;
  onOpenNegocio: (n: Negocio) => void;
  onAddToCart: (p: Producto) => void;
  onProductoClick: (p: Producto) => void;
}

export default function HomeTab({ categoria, subCategoria, negocios, productosFeed, cart, loading, onCategoriaChange, onSubCategoriaChange, onOpenNegocio, onAddToCart, onProductoClick }: Props) {
  const negociosFiltrados = negocios.filter(n => {
    const tipo = categoria === "comida" ? "restaurante" : "tienda";
    return n.tipo?.toLowerCase().includes(tipo);
  });

  const productosFiltrados = productosFeed.filter(p =>
    subCategoria === "Todos" || p.categoria === subCategoria
  );

  return (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {([
          { id: "comida", label: "COMIDA", icon: Utensils },
          { id: "tienda", label: "TIENDA", icon: Store },
          { id: "envio", label: "ENVÍO", icon: Package },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { onCategoriaChange(id); onSubCategoriaChange("Todos"); }}
            className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${categoria === id ? "text-white shadow-lg" : "bg-white border border-slate-100 text-slate-500"}`}
            style={categoria === id ? { background: GRAD } : {}}>
            <Icon size={28} />
            <span className="text-[11px] font-black tracking-wider">{label}</span>
          </button>
        ))}
      </div>

      {categoria === "envio" && (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f3f0ff" }}>
            <Package size={40} style={{ color: "#6C3CE1" }} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Envío de Paquetes</h2>
          <p className="text-slate-500 text-sm mb-4">Envía lo que quieras a donde quieras de forma segura y rápida.</p>
          <span className="px-6 py-3 rounded-full font-black text-white text-sm" style={{ background: GRAD }}>PRÓXIMAMENTE</span>
        </div>
      )}

      {categoria !== "envio" && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {SUB_CATEGORIAS[categoria].map(s => (
              <button key={s} onClick={() => onSubCategoriaChange(s)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0 ${subCategoria === s ? "text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                style={subCategoria === s ? { background: GRAD } : {}}>
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-20 h-20 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                    <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                    <div className="h-4 bg-slate-200 rounded-lg w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : negociosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay negocios disponibles</p>
              <p className="text-sm mt-1">Intenta más tarde o activa tu ubicación</p>
            </div>
          ) : categoria === "comida" ? (
            productosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay platillos disponibles</p>
              </div>
            ) : productosFiltrados.map(p => (
              <div key={p.id} onClick={() => onProductoClick(p)}
                className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden mb-3 text-left hover:shadow-md transition-all flex items-center gap-3 p-3 cursor-pointer">
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                  {p.imagen_url ? <img src={imgUrl(p.imagen_url, 200)} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 truncate">{p.nombre}</h4>
                  <p className="text-xs text-slate-400 truncate">{p.negocio_nombre}</p>
                  <p className="font-black text-base mt-0.5" style={{ color: "#6C3CE1" }}>${Number(p.precio).toFixed(2)}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); onAddToCart({ id: p.id, nombre: p.nombre, precio: p.precio, negocioId: p.negocio_id }); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: GRAD }}>
                  <Plus size={16} />
                </button>
              </div>
            ))
          ) : negociosFiltrados.map(n => (
            <button key={n.id} onClick={() => onOpenNegocio(n)}
              className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden mb-3 text-left hover:shadow-md transition-all flex items-center gap-3 p-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: GRAD }}>
                {n.imagen_url ? <img src={imgUrl(n.imagen_url, 160)} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-900 truncate">{n.nombre}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1"><Star size={11} className="text-yellow-400 fill-yellow-400" /><span className="text-xs font-bold text-slate-600">{Number(n.rating || 0).toFixed(1)}</span></div>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">Envío $35</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </>
      )}
    </motion.div>
  );
}
