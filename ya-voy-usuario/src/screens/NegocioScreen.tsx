import { motion } from "motion/react";
import { ShoppingBag, ArrowLeft, ShoppingCart, Star, Plus, Minus } from "lucide-react";
import { GRAD } from "../lib/constants";
import type { CartItem } from "../lib/constants";
import type { Negocio, Producto } from "../types";
import { imgUrl } from "../lib/cloudinary";

interface Props {
  negocio: Negocio;
  productos: Producto[];
  cart: CartItem[];
  cartCount: number;
  total: number;
  onClose: () => void;
  onAddToCart: (p: any) => void;
  onRemoveFromCart: (cartKey: string) => void;
  onViewCart: () => void;
  onOpenProducto: (p: Producto) => void;
}

export default function NegocioScreen({ negocio, productos, cart, cartCount, total, onClose, onAddToCart, onRemoveFromCart, onViewCart, onOpenProducto }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      <div className="h-48 relative shrink-0" style={{ background: GRAD }}>
        {negocio.imagen_url
          ? <img src={imgUrl(negocio.imagen_url, 800)} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={64} className="text-white/50" /></div>}
        <button onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
          <ArrowLeft size={20} className="text-white" />
        </button>
        {cartCount > 0 && (
          <button onClick={onViewCart}
            className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <ShoppingCart size={18} className="text-purple-600" />
            <span className="font-black text-purple-600">{cartCount}</span>
          </button>
        )}
      </div>

      <div className="p-4 border-b border-slate-100 shrink-0">
        <h2 className="text-xl font-black text-slate-900">{negocio.nombre}</h2>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold">{Number(negocio.rating || 0).toFixed(1)}</span>
          </div>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500">{negocio.tipo}</span>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500">Envío $35</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {productos.length === 0
          ? <div className="text-center py-12 text-slate-400"><ShoppingBag size={40} className="mx-auto mb-3 opacity-30" /><p>Sin productos</p></div>
          : productos.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
              <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0 overflow-hidden">
                {p.imagen_url
                  ? <img src={imgUrl(p.imagen_url, 160)} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-sm">{p.nombre}</p>
                {p.descripcion && <p className="text-xs text-slate-500 line-clamp-2">{p.descripcion}</p>}
                <p className="font-black mt-1" style={{ color: "#6C3CE1" }}>${Number(p.precio).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const tieneOpciones = (p.opciones?.length ?? 0) > 0;
                  const itemsEnCarrito = cart.filter(i => i.productoId === p.id);
                  const cantidadTotal = itemsEnCarrito.reduce((a, i) => a + i.cantidad, 0);
                  const itemSimple = itemsEnCarrito.find(i => !i.opciones?.length);
                  if (tieneOpciones) {
                    return (
                      <>
                        {cantidadTotal > 0 && (
                          <span className="text-xs font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{cantidadTotal}</span>
                        )}
                        <button onClick={() => onOpenProducto(p)}
                          className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GRAD }}>
                          <Plus size={14} className="text-white" />
                        </button>
                      </>
                    );
                  }
                  return (
                    <>
                      {itemSimple && (
                        <>
                          <button onClick={() => onRemoveFromCart(itemSimple.cartKey)} className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Minus size={14} className="text-purple-600" />
                          </button>
                          <span className="font-black text-slate-900 w-4 text-center">{itemSimple.cantidad}</span>
                        </>
                      )}
                      <button onClick={() => onAddToCart(p)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GRAD }}>
                        <Plus size={14} className="text-white" />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
      </div>

      {cartCount > 0 && (
        <div className="p-4 border-t bg-white shrink-0">
          <button onClick={onViewCart} style={{ background: GRAD }}
            className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-between px-6">
            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">{cartCount}</span>
            <span>Ver pedido</span>
            <span>${total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
