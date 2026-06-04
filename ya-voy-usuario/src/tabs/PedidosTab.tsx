import { motion } from "motion/react";
import { Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { GRAD, STATUS_COLOR, STATUS_LABEL, API } from "../lib/constants";
import type { CartItem } from "../lib/constants";
import type { Negocio, Pedido } from "../types";

const PALABRAS = ["TIGRE","LUNA","SOL","PUMA","RAYO","NUBE","MAR","RIO","VIENTO","FUEGO","TIERRA","AGUILA","LOBO","OSO","ZORRO","LEON","TORO","COBRA","FLOR","ROCA","PIEDRA","AGUA","BRISA","MONTE","CIELO"];

interface Props {
  pedidos: Pedido[];
  negocios: Negocio[];
  chatNoLeidos: Record<string, number>;
  loading?: boolean;
  onGoHome: () => void;
  onPedidoClick: (pedido: any) => void;
  onSetProductos: (ps: any[]) => void;
  onSetCart: (c: CartItem[]) => void;
  onSetNegocioSeleccionado: (n: any) => void;
  onSetShowCart: (v: boolean) => void;
  onSetTab: (t: "home") => void;
  calcularEnvio: (n: any) => void;
}

export default function PedidosTab({ pedidos, negocios, chatNoLeidos, loading, onGoHome, onPedidoClick, onSetProductos, onSetCart, onSetNegocioSeleccionado, onSetShowCart, onSetTab, calcularEnvio }: Props) {
  const handlePedidoClick = (p: any) => {
    if (p.status === "en_camino") {
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
    const negocio = negocios.find((n: any) => n.id === p.negocio_id) || { id: p.negocio_id, nombre: p.negocio_nombre, imagen_url: p.negocio_imagen };
    onSetNegocioSeleccionado(negocio);
    calcularEnvio(negocio);
    const prods = await fetch(API + `/api/usuario/negocios/${p.negocio_id}/productos`).then(r => r.json()).catch(() => []);
    onSetProductos(Array.isArray(prods) ? prods : []);
    const carritoNuevo: CartItem[] = (p.items || []).map((it: any) => ({
      cartKey: `${it.nombre}-${Date.now()}-${Math.random()}`,
      productoId: it.id || it.nombre,
      nombre: it.nombre,
      precio: it.precio,
      precioBase: it.precio,
      cantidad: it.cantidad || 1,
      negocioId: p.negocio_id,
    }));
    onSetCart(carritoNuevo);
    onSetShowCart(true);
    onSetTab("home");
    toast.success("Pedido anterior cargado al carrito");
  };

  return (
    <motion.div key="pedidos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
      <h2 className="text-2xl font-black text-slate-900">Tus Pedidos</h2>
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 animate-pulse">
              <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded-lg w-1/2" />
                <div className="h-3 bg-slate-200 rounded-lg w-1/3" />
                <div className="h-3 bg-slate-200 rounded-lg w-1/4" />
              </div>
              <div className="w-16 h-6 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin pedidos aún</p>
          <button onClick={onGoHome} className="mt-4 px-6 py-2 rounded-full text-white text-sm font-bold" style={{ background: GRAD }}>
            Pedir ahora
          </button>
        </div>
      ) : pedidos.map(p => (
        <div key={p.id} className="w-full space-y-1">
          <button onClick={() => handlePedidoClick(p)}
            className="w-full bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 text-left hover:shadow-sm transition-all">
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
              {p.negocio_imagen ? <img src={p.negocio_imagen} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 truncate">{p.negocio_nombre || "Negocio"}</p>
              <p className="text-xs text-slate-500">{new Date(p.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">${Number(p.total).toFixed(2)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full text-white shrink-0 ${STATUS_COLOR[p.status] || "bg-slate-400"}`}>
                {STATUS_LABEL[p.status] || p.status}
              </span>
              {(chatNoLeidos[p.id] || 0) > 0 && (
                <span className="w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">
                  {chatNoLeidos[p.id]}
                </span>
              )}
            </div>
          </button>
          {p.status === "entregado" && (
            <button onClick={(e) => pedirDeNuevo(p, e)}
              className="w-full mt-1 py-2 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1" style={{ background: GRAD }}>
              <RefreshCw size={12} /> Pedir de nuevo
            </button>
          )}
        </div>
      ))}
    </motion.div>
  );
}
