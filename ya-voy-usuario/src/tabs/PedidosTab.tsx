import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Clock, RefreshCw, Loader2, Sparkles, MessageSquare, ShoppingBag, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { GRAD, STATUS_COLOR, STATUS_LABEL, API } from "../lib/constants";
import { imgUrl } from "../lib/cloudinary";
import type { CartItem } from "../lib/constants";
import type { Negocio, Pedido } from "../types";

const PALABRAS = ["TIGRE","LUNA","SOL","PUMA","RAYO","NUBE","MAR","RIO","VIENTO","FUEGO","TIERRA","AGUILA","LOBO","OSO","ZORRO","LEON","TORO","COBRA","FLOR","ROCA","PIEDRA","AGUA","BRISA","MONTE","CIELO"];

interface Props {
  pedidos: Pedido[];
  negocios: Negocio[];
  chatNoLeidos: Record<string, number>;
  loading?: boolean;
  hayMas?: boolean;
  masLoading?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onGoHome: () => void;
  onPedidoClick: (pedido: any) => void;
  onSetProductos: (ps: any[]) => void;
  onSetCart: (c: CartItem[]) => void;
  onSetNegocioSeleccionado: (n: any) => void;
  onSetShowCart: (v: boolean) => void;
  onSetTab: (t: "home") => void;
  calcularEnvio: (n: any) => void;
  onCalificarPedido?: (pedido: Pedido) => void;
}

export default function PedidosTab({ 
  pedidos, 
  negocios, 
  chatNoLeidos, 
  loading, 
  hayMas, 
  masLoading, 
  onRefresh, 
  onLoadMore, 
  onGoHome, 
  onPedidoClick, 
  onSetProductos, 
  onSetCart, 
  onSetNegocioSeleccionado, 
  onSetShowCart, 
  onSetTab, 
  calcularEnvio,
  onCalificarPedido
}: Props) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => { 
    touchStartY.current = e.touches[0].clientY; 
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.4, 60));
  };
  
  const onTouchEnd = async () => {
    if (pullY > 45 && onRefresh && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullY(0);
  };

  const handlePedidoClick = (p: any) => {
    if (["en_camino", "esperando_cliente"].includes(p.status)) {
      const pv = p.palabras_verificacion;
      const ops = (pv && pv.entrega && pv.entrega.length === 3)
        ? pv.entrega
        : (() => {
          const falsas = PALABRAS.filter(w => w !== p.codigo_entrega).sort(() => Math.random() - 0.5).slice(0, 2);
          return [p.codigo_entrega, falsas[0], falsas[1]].sort(() => Math.random() - 0.5);
        })();
      onPedidoClick({ ...p, _codigoOpciones: ops });
    } else {
      onPedidoClick(p);
    }
  };

  const pedirDeNuevo = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const nid = p.negocio_id || p.negocioId;
    const negocio = negocios.find((n: any) => n.id === nid) || { id: nid, nombre: p.negocio_nombre, imagen_url: p.negocio_imagen };
    onSetNegocioSeleccionado(negocio);
    calcularEnvio(negocio);
    const prods = await fetch(API + `/api/usuario/negocios/${nid}/productos`).then(r => r.json()).catch(() => []);
    const catalogoActual = Array.isArray(prods) ? prods : [];
    onSetProductos(catalogoActual);

    const carritoNuevo: CartItem[] = [];
    let omitidos = 0;
    for (const it of (p.items || [])) {
      const pid = it.productoId || it.id || it.nombre;
      const prodVigente = catalogoActual.length > 0
        ? catalogoActual.find((pr: any) => pr.id === pid || pr.nombre === it.nombre)
        : undefined;
      if (prodVigente && (prodVigente.agotado || prodVigente.disponible === false)) {
        omitidos++;
        continue;
      }
      const opciones = Array.isArray(it.opciones) ? it.opciones : undefined;
      const extrasTotal = (opciones || []).reduce((a: number, o: any) => a + (Number(o.precio) || 0), 0);
      const precioBase = prodVigente ? Number(prodVigente.precio) : Number(it.precioBase ?? (Number(it.precio) - extrasTotal));
      const precioFinal = prodVigente ? (precioBase + extrasTotal) : Number(it.precio);
      const finalProdId = prodVigente?.id || pid;
      const cartKey = opciones?.length
        ? `${finalProdId}-${opciones.map((o: any) => o.nombre).sort().join("-")}`
        : `${finalProdId}-${Date.now()}-${Math.random()}`;
      carritoNuevo.push({
        cartKey,
        productoId: finalProdId,
        nombre: prodVigente?.nombre || it.nombre,
        precio: precioFinal,
        precioBase,
        cantidad: it.cantidad || 1,
        negocioId: nid,
        opciones,
      });
    }
    if (carritoNuevo.length === 0) {
      toast.error("Los platillos de este pedido están agotados actualmente");
      return;
    }
    onSetCart(carritoNuevo);
    onSetShowCart(true);
    onSetTab("home");
    if (omitidos > 0) {
      toast.info(`Pedido cargado (${omitidos} platillo${omitidos > 1 ? "s" : ""} agotado${omitidos > 1 ? "s" : ""} omitido${omitidos > 1 ? "s" : ""})`);
    } else {
      toast.success("Pedido anterior cargado al carrito");
    }
  };

  return (
    <motion.div 
      key="pedidos" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="p-4 space-y-3.5"
      onTouchStart={onTouchStart} 
      onTouchMove={onTouchMove} 
      onTouchEnd={onTouchEnd}>
      
      {pullY > 0 && (
        <div className="flex justify-center -mt-2 mb-1" style={{ height: pullY }}>
          <Loader2 size={22} className={`text-rose-600 transition-all ${pullY > 45 ? "animate-spin" : ""}`} style={{ marginTop: pullY / 2 - 11 }} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Tus Pedidos</h2>
        <span className="text-xs font-bold text-slate-400">{pedidos.length} historial</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-4 flex items-center gap-3.5 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded-lg w-1/2" />
                <div className="h-3 bg-slate-200 rounded-lg w-1/3" />
                <div className="h-3 bg-slate-200 rounded-lg w-1/4" />
              </div>
              <div className="w-16 h-7 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <Clock size={48} className="mx-auto mb-3 opacity-25 text-rose-600" />
          <h3 className="font-black text-slate-800 text-lg">Aún no tienes pedidos</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Explora tus restaurantes favoritos y haz tu primera orden en minutos.
          </p>
          <button 
            onClick={onGoHome} 
            className="mt-5 px-6 py-3.5 rounded-2xl text-white text-xs font-black shadow-lg active:scale-95 transition-transform" 
            style={{ background: GRAD }}>
            ¡Empezar a ordenar!
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map(p => {
            const esEntregado = p.status === "entregado";
            const tieneRating = Boolean(p.rating_restaurante);

            return (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm space-y-3 transition-all">
                <button 
                  onClick={() => handlePedidoClick(p)}
                  className="w-full flex items-center gap-3.5 text-left active:scale-[0.99] transition-transform">
                  
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-slate-100 border border-slate-100">
                    {p.negocio_imagen ? (
                      <img src={imgUrl(p.negocio_imagen, 112)} alt={p.negocio_nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">{p.negocio_nombre || "Restaurante"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(p.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs font-black text-rose-600 mt-1">${Number(p.total).toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-white shadow-sm ${STATUS_COLOR[p.status] || "bg-slate-400"}`}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                    {(chatNoLeidos[p.id] || 0) > 0 && (
                      <span className="w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                        {chatNoLeidos[p.id]}
                      </span>
                    )}
                  </div>
                </button>

                {/* Acciones de la tarjeta */}
                <div className="flex gap-2 pt-1 border-t border-slate-50">
                  {esEntregado && !tieneRating && onCalificarPedido && (
                    <button 
                      onClick={() => onCalificarPedido(p)}
                      className="flex-1 py-2.5 rounded-2xl text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                      <Sparkles size={13} className="text-yellow-500" /> Calificar
                    </button>
                  )}
                  {esEntregado && (
                    <button 
                      onClick={(e) => pedirDeNuevo(p, e)}
                      className="flex-1 py-2.5 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all" 
                      style={{ background: GRAD }}>
                      <RefreshCw size={13} /> Pedir de nuevo
                    </button>
                  )}
                  {p.status === "pago_fallido" && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onGoHome(); }}
                      className="flex-1 py-2.5 rounded-2xl text-xs font-black text-white bg-red-500 flex items-center justify-center gap-1.5 shadow-sm">
                      💳 Reintentar pago
                    </button>
                  )}
                  {!esEntregado && p.status !== "pago_fallido" && (
                    <button 
                      onClick={() => handlePedidoClick(p)}
                      className="w-full py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-50 flex items-center justify-center gap-1">
                      <span>Ver seguimiento</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {hayMas && (
            <button 
              onClick={onLoadMore} 
              disabled={masLoading}
              className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
              {masLoading ? <Loader2 size={16} className="animate-spin text-rose-600" /> : null}
              Cargar pedidos anteriores
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
