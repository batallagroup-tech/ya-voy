import { useState } from "react";
import { motion } from "motion/react";
import { X, Minus, Plus, Banknote, CreditCard, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GRAD, API } from "../lib/constants";
import type { CartItem } from "../lib/constants";
import type { Direccion } from "../components/DireccionesScreen";

interface CuponAplicado { codigo: string; descuento: number; tipo: string; valor: number; }

interface Props {
  cart: CartItem[];
  total: number;
  costoEnvio: number;
  costoEnvioLoading: boolean;
  metodoPago: string;
  onMetodoPagoChange: (pago: string) => void;
  direccionPrincipal: Direccion | undefined;
  loading: boolean;
  negocioId: string | undefined;
  onAddToCart: (item: any) => void;
  onRemoveFromCart: (id: string) => void;
  onPedir: (cuponAplicado: CuponAplicado | null) => void;
  onClose: () => void;
}

export default function CartSheet({ cart, total, costoEnvio, costoEnvioLoading, metodoPago, onMetodoPagoChange, direccionPrincipal, loading, negocioId, onAddToCart, onRemoveFromCart, onPedir, onClose }: Props) {
  const [cuponCodigo, setCuponCodigo] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState<CuponAplicado | null>(null);
  const [cuponLoading, setCuponLoading] = useState(false);
  const [cuponError, setCuponError] = useState("");

  const aplicarCupon = async () => {
    if (!cuponCodigo.trim()) return;
    setCuponLoading(true); setCuponError("");
    try {
      const r = await fetch(API + "/api/usuario/cupones/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cuponCodigo.trim(), total: total + costoEnvio, negocioId }),
      });
      const d = await r.json();
      if (!r.ok) { setCuponError(d.error || "Cupón inválido"); return; }
      setCuponAplicado(d);
      toast.success("Cupón aplicado: -$" + d.descuento.toFixed(2));
    } catch { setCuponError("Error al validar"); }
    finally { setCuponLoading(false); }
  };

  const totalFinal = total + costoEnvio - (cuponAplicado?.descuento || 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end">
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black">Tu pedido</h3>
          <button onClick={onClose}><X size={24} className="text-slate-400" /></button>
        </div>

        <div className="space-y-3 mb-4">
          {cart.map(item => (
            <div key={item.productoId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => onRemoveFromCart(item.productoId)} className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <Minus size={12} className="text-purple-600" />
                  </button>
                  <span className="font-black text-slate-900 w-5 text-center text-sm">{item.cantidad}</span>
                  <button onClick={() => onAddToCart({ id: item.productoId, nombre: item.nombre, precio: item.precio })} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: GRAD }}>
                    <Plus size={12} className="text-white" />
                  </button>
                </div>
                <span className="text-sm font-medium text-slate-700">{item.nombre}</span>
              </div>
              <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-2 mb-3">
          <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Envío</span>
            <span>{costoEnvioLoading ? "..." : "$" + costoEnvio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500"><span>Servicio</span><span>$8.50</span></div>
          {cuponAplicado && (
            <div className="flex justify-between text-sm text-green-600 font-bold">
              <span>Cupón {cuponAplicado.codigo}</span>
              <span>-${cuponAplicado.descuento.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-slate-900 text-lg"><span>Total</span><span>${totalFinal.toFixed(2)}</span></div>
        </div>

        <div className="flex gap-2 mb-3">
          <input value={cuponCodigo} onChange={e => { setCuponCodigo(e.target.value.toUpperCase()); setCuponError(""); }}
            placeholder="Código de cupón"
            className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-purple-400 font-medium" />
          <button onClick={aplicarCupon} disabled={cuponLoading || !!cuponAplicado}
            className="px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50" style={{ background: GRAD }}>
            {cuponLoading ? "..." : cuponAplicado ? "OK" : "Aplicar"}
          </button>
          {cuponAplicado && (
            <button onClick={() => { setCuponAplicado(null); setCuponCodigo(""); }} className="px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 border border-red-200">X</button>
          )}
        </div>
        {cuponError && <p className="text-xs text-red-500 font-bold -mt-2 mb-3">{cuponError}</p>}

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
          <div className="flex items-center gap-2">
            {metodoPago === "efectivo" ? <Banknote size={18} className="text-slate-600" /> : <CreditCard size={18} className="text-slate-600" />}
            <span className="text-sm font-bold text-slate-600">{metodoPago === "efectivo" ? "Pago en efectivo" : "Pago con tarjeta"}</span>
          </div>
          <button onClick={() => {
            const nuevo = metodoPago === "efectivo" ? "tarjeta" : "efectivo";
            onMetodoPagoChange(nuevo);
          }} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 bg-white">
            Cambiar
          </button>
        </div>

        {direccionPrincipal && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl mb-4">
            <MapPin size={18} className="text-purple-600" />
            <span className="text-sm font-medium text-slate-600 truncate">{direccionPrincipal.label}: {direccionPrincipal.direccion}</span>
          </div>
        )}

        <button onClick={() => onPedir(cuponAplicado)} disabled={loading} style={{ background: GRAD }}
          className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={20} /> : null}
          Confirmar pedido
        </button>
      </motion.div>
    </motion.div>
  );
}
