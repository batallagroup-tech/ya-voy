import { motion } from "motion/react";
import { ShoppingBag, ArrowLeft, ShoppingCart, Star, Plus, Minus, Clock, MapPin, Sparkles } from "lucide-react";
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

const DIAS_MAP = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];

function HorarioHoy({ horarios }: { horarios?: Negocio['horarios'] }) {
  if (!horarios) return null;
  const diaKey = DIAS_MAP[new Date().getDay()];
  const hoy = horarios[diaKey];
  if (!hoy) return null;
  if (!hoy.abierto) return <span className="text-xs font-bold text-red-500">Cerrado hoy</span>;
  return (
    <span className="text-xs text-slate-500 flex items-center gap-1">
      <Clock size={12} className="text-rose-600 inline" /> Hoy {hoy.desde} – {hoy.hasta}
    </span>
  );
}

export default function NegocioScreen({ 
  negocio, 
  productos, 
  cart, 
  cartCount, 
  total, 
  onClose, 
  onAddToCart, 
  onRemoveFromCart, 
  onViewCart, 
  onOpenProducto 
}: Props) {
  const costoEnvioBase = negocio.costo_envio_base || 35;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden">
      
      {/* Hero Image */}
      <div className="h-52 relative shrink-0" style={{ background: GRAD }}>
        {negocio.imagen_url ? (
          <img 
            src={imgUrl(negocio.imagen_url, 800)} 
            alt={negocio.nombre}
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={64} className="text-white/40" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        <button 
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white shadow-lg active:scale-95 transition-transform"
          style={{ marginTop: "env(safe-area-inset-top)" }}>
          <ArrowLeft size={20} />
        </button>

        {cartCount > 0 && (
          <button 
            onClick={onViewCart}
            className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 shadow-xl border border-white/40 active:scale-95 transition-transform"
            style={{ marginTop: "env(safe-area-inset-top)" }}>
            <ShoppingCart size={18} className="text-rose-600" />
            <span className="font-black text-rose-600 text-xs">{cartCount} items</span>
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="p-4 bg-white border-b border-slate-100 shadow-sm shrink-0">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-black text-slate-900 leading-tight">{negocio.nombre}</h2>
          {negocio.aceptando_pedidos === false && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 shrink-0">
              PAUSADO
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 mt-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-200/60">
            <Star size={13} className="text-yellow-500 fill-yellow-500" />
            <span className="font-black text-slate-800">{Number(negocio.rating || 0).toFixed(1)}</span>
          </div>
          <span className="text-slate-300">·</span>
          <span className="font-bold text-slate-600 capitalize">{negocio.tipo}</span>
          <span className="text-slate-300">·</span>
          <span className="font-bold text-slate-600">Envío desde ${costoEnvioBase}</span>
          {negocio.horarios && (
            <>
              <span className="text-slate-300">·</span>
              <HorarioHoy horarios={negocio.horarios} />
            </>
          )}
        </div>

        {negocio.direccion && (
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 truncate">
            <MapPin size={13} className="shrink-0 text-slate-400" />
            <span className="truncate">{negocio.direccion}</span>
          </p>
        )}
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Menú Disponible</h3>
          <span className="text-xs font-bold text-slate-400">{productos.length} platillos</span>
        </div>

        {productos.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShoppingBag size={48} className="mx-auto mb-3 opacity-25" />
            <p className="font-bold text-sm">Sin productos disponibles por ahora</p>
            <p className="text-xs text-slate-400 mt-1">El restaurante actualizará su menú en breve</p>
          </div>
        ) : (
          productos.map(p => {
            let rawOps = p.opciones;
            if (typeof rawOps === 'string') {
              try { rawOps = JSON.parse(rawOps); } catch { rawOps = []; }
            }
            const tieneOpciones = Array.isArray(rawOps) && rawOps.length > 0;
            const itemsEnCarrito = cart.filter(i => i.productoId === p.id);
            const cantidadTotal = itemsEnCarrito.reduce((a, i) => a + i.cantidad, 0);
            const itemSimple = itemsEnCarrito.find(i => !Array.isArray(i.opciones) || i.opciones.length === 0);

            return (
              <div 
                key={p.id} 
                onClick={() => {
                  if (p.agotado) return;
                  if (tieneOpciones) onOpenProducto(p);
                  else onAddToCart(p);
                }}
                className={`bg-white rounded-3xl border border-slate-100 p-3.5 flex items-center gap-3.5 shadow-sm transition-all ${
                  p.agotado 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:shadow-md cursor-pointer active:scale-[0.99]"
                }`}>
                
                <div className="w-20 h-20 bg-slate-100 rounded-2xl shrink-0 overflow-hidden relative border border-slate-100">
                  {p.imagen_url ? (
                    <img 
                      src={imgUrl(p.imagen_url, 200)} 
                      alt={p.nombre}
                      className="w-full h-full object-cover" 
                      loading="lazy" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                  )}
                  {p.agotado && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-full bg-red-600">Agotado</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-black text-slate-900 text-sm truncate">{p.nombre}</p>
                    {p.destacado && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">⭐ Top</span>
                    )}
                  </div>
                  {p.descripcion && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{p.descripcion}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-black text-base text-rose-600">${Number(p.precio).toFixed(2)}</span>
                    {tieneOpciones && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Personalizable</span>
                    )}
                  </div>
                </div>

                {/* Botones de Carrito */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {tieneOpciones ? (
                    <button 
                      onClick={() => onOpenProducto(p)}
                      disabled={p.agotado}
                      className="px-3 py-2 rounded-2xl text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-transform disabled:opacity-30" 
                      style={{ background: GRAD }}>
                      {cantidadTotal > 0 ? (
                        <span className="w-4 h-4 bg-white text-rose-600 rounded-full flex items-center justify-center text-[10px] font-black mr-0.5">
                          {cantidadTotal}
                        </span>
                      ) : <Plus size={14} />}
                      <span>{cantidadTotal > 0 ? "Más" : "Elegir"}</span>
                    </button>
                  ) : (
                    <>
                      {itemSimple && (
                        <>
                          <button 
                            onClick={() => onRemoveFromCart(itemSimple.cartKey)} 
                            className="w-8 h-8 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 hover:bg-rose-200 active:scale-90 transition-all">
                            <Minus size={14} />
                          </button>
                          <span className="font-black text-slate-900 w-5 text-center text-xs">{itemSimple.cantidad}</span>
                        </>
                      )}
                      <button 
                        onClick={() => onAddToCart(p)} 
                        disabled={p.agotado}
                        className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-sm active:scale-90 transition-all disabled:opacity-30" 
                        style={{ background: GRAD }}>
                        <Plus size={16} />
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 shrink-0 shadow-lg" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <button 
            onClick={onViewCart} 
            style={{ background: GRAD }}
            className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-between px-6 shadow-xl active:scale-[0.99] transition-transform">
            <span className="bg-white/25 px-2.5 py-1 rounded-xl text-xs font-black">{cartCount} items</span>
            <span className="text-sm uppercase tracking-wider">Ver mi Pedido</span>
            <span className="text-base font-black">${total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
