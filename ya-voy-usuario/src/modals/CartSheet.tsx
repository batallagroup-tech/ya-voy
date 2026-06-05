import { useState } from "react";
import { motion } from "motion/react";
import { X, Minus, Plus, Banknote, CreditCard, MapPin, Loader2, Trash2, Store, Calendar, Wallet } from "lucide-react";
import { toast } from "sonner";
import { GRAD, API } from "../lib/constants";
import type { CartItem } from "../lib/constants";
import type { Direccion } from "../components/DireccionesScreen";

interface CuponAplicado { codigo: string; descuento: number; tipo: string; valor: number; }

export interface PedidoExtras {
  cuponAplicado: CuponAplicado | null;
  tipoEntrega: "domicilio" | "pickup";
  programadoPara: string | null;
  walletMonto: number;
}

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
  propina: number;
  walletBalance: number;
  onPropinaChange: (p: number) => void;
  onAddToCart: (item: any) => void;
  onRemoveFromCart: (id: string) => void;
  onPedir: (extras: PedidoExtras) => void;
  onClearCart: () => void;
  onClose: () => void;
}

const PROPINAS = [0, 10, 20, 30];

export default function CartSheet({ cart, total, costoEnvio, costoEnvioLoading, metodoPago, onMetodoPagoChange, direccionPrincipal, loading, negocioId, propina, walletBalance, onPropinaChange, onAddToCart, onRemoveFromCart, onPedir, onClearCart, onClose }: Props) {
  const [cuponCodigo, setCuponCodigo] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState<CuponAplicado | null>(null);
  const [cuponLoading, setCuponLoading] = useState(false);
  const [cuponError, setCuponError] = useState("");
  const [propinaCustom, setPropinaCustom] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState<"domicilio" | "pickup">("domicilio");
  const [programarParaDespues, setProgramarParaDespues] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [horaProgramada, setHoraProgramada] = useState("");
  const [usarWallet, setUsarWallet] = useState(false);

  const walletAplicado = usarWallet ? Math.min(walletBalance, total + (tipoEntrega === "domicilio" ? costoEnvio : 0) + propina) : 0;
  const envioEfectivo = tipoEntrega === "pickup" ? 0 : costoEnvio;
  const totalFinal = Math.max(0, total + envioEfectivo + propina - (cuponAplicado?.descuento || 0) - walletAplicado);

  const programadoPara = programarParaDespues && fechaProgramada && horaProgramada
    ? `${fechaProgramada} ${horaProgramada}`
    : null;

  const aplicarCupon = async () => {
    if (!cuponCodigo.trim()) return;
    setCuponLoading(true); setCuponError("");
    try {
      const r = await fetch(API + "/api/usuario/cupones/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cuponCodigo.trim(), total: total + envioEfectivo, negocioId }),
      });
      const d = await r.json();
      if (!r.ok) { setCuponError(d.error || "Cupón inválido"); return; }
      setCuponAplicado(d);
      toast.success("Cupón aplicado: -$" + d.descuento.toFixed(2));
    } catch { setCuponError("Error al validar"); }
    finally { setCuponLoading(false); }
  };

  // Horas disponibles para programar (cada 30 min, desde ahora +1h)
  const horasDisponibles = (() => {
    const horas: string[] = [];
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() + 60);
    ahora.setMinutes(ahora.getMinutes() < 30 ? 0 : 30);
    for (let i = 0; i < 12; i++) {
      const h = ahora.getHours().toString().padStart(2, "0");
      const m = ahora.getMinutes().toString().padStart(2, "0");
      const fin = new Date(ahora.getTime() + 60 * 60 * 1000);
      const hf = fin.getHours().toString().padStart(2, "0");
      const mf = fin.getMinutes().toString().padStart(2, "0");
      horas.push(`${h}:${m}-${hf}:${mf}`);
      ahora.setMinutes(ahora.getMinutes() + 30);
    }
    return horas;
  })();

  const hoy = new Date().toISOString().slice(0, 10);
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end">
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black">Tu pedido</h3>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button onClick={() => { onClearCart(); onClose(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all">
                <Trash2 size={13} /> Vaciar
              </button>
            )}
            <button onClick={onClose}><X size={24} className="text-slate-400" /></button>
          </div>
        </div>

        {/* Items del carrito */}
        <div className="space-y-3 mb-4">
          {cart.map(item => (
            <div key={item.cartKey} className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button onClick={() => onRemoveFromCart(item.cartKey)} className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <Minus size={12} className="text-purple-600" />
                  </button>
                  <span className="font-black text-slate-900 w-5 text-center text-sm">{item.cantidad}</span>
                  <button onClick={() => onAddToCart(item)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: GRAD }}>
                    <Plus size={12} className="text-white" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{item.nombre}</p>
                  {item.opciones?.length ? (
                    <p className="text-xs text-slate-400 leading-relaxed">{item.opciones.map(o => o.nombre).join(' · ')}</p>
                  ) : null}
                </div>
              </div>
              <span className="font-bold shrink-0 pt-0.5">${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Tipo de entrega */}
        <div className="mb-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Tipo de entrega</p>
          <div className="grid grid-cols-2 gap-2">
            {(["domicilio", "pickup"] as const).map(tipo => (
              <button key={tipo} onClick={() => setTipoEntrega(tipo)}
                className={`py-3 rounded-xl text-sm font-black border-2 flex items-center justify-center gap-2 transition-all ${tipoEntrega === tipo ? "border-transparent text-white" : "border-slate-200 text-slate-600 bg-white"}`}
                style={tipoEntrega === tipo ? { background: GRAD } : {}}>
                {tipo === "domicilio" ? <MapPin size={16} /> : <Store size={16} />}
                {tipo === "domicilio" ? "A domicilio" : "Recoger aquí"}
              </button>
            ))}
          </div>
          {tipoEntrega === "pickup" && (
            <p className="text-xs text-teal-600 font-bold mt-2 text-center">🏪 Recogerás en el restaurante — sin costo de envío</p>
          )}
        </div>

        {/* Totales */}
        <div className="border-t pt-3 space-y-2 mb-3">
          <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
          {tipoEntrega === "domicilio" && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>Envío</span>
              <span>{costoEnvioLoading ? "..." : "$" + envioEfectivo.toFixed(2)}</span>
            </div>
          )}
          {tipoEntrega === "pickup" && <div className="flex justify-between text-sm text-teal-600 font-bold"><span>Envío</span><span>Gratis</span></div>}
          {cuponAplicado && (
            <div className="flex justify-between text-sm text-green-600 font-bold">
              <span>Cupón {cuponAplicado.codigo}</span><span>-${cuponAplicado.descuento.toFixed(2)}</span>
            </div>
          )}
          {walletAplicado > 0 && (
            <div className="flex justify-between text-sm text-indigo-600 font-bold">
              <span>Saldo aplicado</span><span>-${walletAplicado.toFixed(2)}</span>
            </div>
          )}
          {propina > 0 && (
            <div className="flex justify-between text-sm text-purple-600 font-bold">
              <span>Propina al repartidor</span><span>+${propina.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-slate-900 text-lg"><span>Total</span><span>${totalFinal.toFixed(2)}</span></div>
        </div>

        {/* Wallet */}
        {walletBalance > 0 && (
          <button onClick={() => setUsarWallet(v => !v)}
            className={`w-full flex items-center justify-between p-3 rounded-xl mb-3 border-2 transition-all ${usarWallet ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-2">
              <Wallet size={18} className={usarWallet ? "text-indigo-600" : "text-slate-400"} />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700">Usar saldo disponible</p>
                <p className="text-xs text-slate-500">${walletBalance.toFixed(2)} disponibles</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${usarWallet ? "border-indigo-500 bg-indigo-500" : "border-slate-300"}`}>
              {usarWallet && <span className="text-white text-[10px] font-black">✓</span>}
            </div>
          </button>
        )}

        {/* Propina */}
        {tipoEntrega === "domicilio" && (
          <div className="mb-4">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Propina al repartidor (opcional)</p>
            <div className="flex gap-2">
              {PROPINAS.map(p => (
                <button key={p} onClick={() => { onPropinaChange(p); setPropinaCustom(""); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-black border transition-all ${propina === p && !propinaCustom ? "text-white border-transparent" : "border-slate-200 text-slate-600 bg-white"}`}
                  style={propina === p && !propinaCustom ? { background: GRAD } : {}}>
                  {p === 0 ? "Sin propina" : `$${p}`}
                </button>
              ))}
              <input type="number" min="0" max="500" placeholder="Otra" value={propinaCustom}
                onChange={e => { const v = Math.max(0, Math.min(500, Number(e.target.value) || 0)); setPropinaCustom(e.target.value); onPropinaChange(v); }}
                className="w-16 px-2 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 text-center outline-none focus:border-purple-400" />
            </div>
          </div>
        )}

        {/* Cupón */}
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

        {/* Pago */}
        {totalFinal > 0 && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-3">
            <div className="flex items-center gap-2">
              {metodoPago === "efectivo" ? <Banknote size={18} className="text-slate-600" /> : <CreditCard size={18} className="text-slate-600" />}
              <span className="text-sm font-bold text-slate-600">{metodoPago === "efectivo" ? "Pago en efectivo" : "Pago con tarjeta"}</span>
            </div>
            <button onClick={() => onMetodoPagoChange(metodoPago === "efectivo" ? "tarjeta" : "efectivo")}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 bg-white">
              Cambiar
            </button>
          </div>
        )}

        {/* Dirección */}
        {tipoEntrega === "domicilio" && direccionPrincipal && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl mb-3">
            <MapPin size={18} className="text-purple-600" />
            <span className="text-sm font-medium text-slate-600 truncate">{direccionPrincipal.label}: {direccionPrincipal.direccion}</span>
          </div>
        )}

        {/* Programar para después */}
        <button onClick={() => setProgramarParaDespues(v => !v)}
          className={`w-full flex items-center gap-2 p-3 rounded-xl mb-3 border-2 transition-all text-sm font-bold ${programarParaDespues ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-500 bg-white"}`}>
          <Calendar size={16} /> {programarParaDespues ? "Cancelar programación" : "Programar para después"}
        </button>
        {programarParaDespues && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-3 space-y-3">
            <div>
              <p className="text-xs font-bold text-orange-700 mb-1">Fecha</p>
              <div className="flex gap-2">
                {[hoy, manana].map(d => (
                  <button key={d} onClick={() => setFechaProgramada(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${fechaProgramada === d ? "border-orange-500 bg-orange-100 text-orange-700" : "border-slate-200 bg-white text-slate-600"}`}>
                    {d === hoy ? "Hoy" : "Mañana"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-orange-700 mb-1">Franja horaria</p>
              <div className="grid grid-cols-3 gap-1.5">
                {horasDisponibles.slice(0, 9).map(h => (
                  <button key={h} onClick={() => setHoraProgramada(h)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all ${horaProgramada === h ? "border-orange-500 bg-orange-100 text-orange-700" : "border-slate-200 bg-white text-slate-500"}`}>
                    {h.split("-")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={() => setShowConfirm(true)} disabled={loading || cart.length === 0 || (programarParaDespues && (!fechaProgramada || !horaProgramada))} style={{ background: GRAD }}
          className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={20} /> : null}
          Revisar pedido
        </button>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl overflow-y-auto max-h-[90vh]">
              <h3 className="font-black text-slate-900 text-lg mb-4">¿Confirmar pedido?</h3>
              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.cartKey} className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.cantidad}× {item.nombre}</span>
                    <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
                {tipoEntrega === "domicilio" && <div className="border-t pt-2 flex justify-between text-sm text-slate-500"><span>Envío</span><span>${envioEfectivo.toFixed(2)}</span></div>}
                {tipoEntrega === "pickup" && <div className="border-t pt-2 flex justify-between text-sm text-teal-600 font-bold"><span>Envío</span><span>Gratis</span></div>}
                {propina > 0 && <div className="flex justify-between text-sm text-purple-600"><span>Propina</span><span>+${propina.toFixed(2)}</span></div>}
                {cuponAplicado && <div className="flex justify-between text-sm text-green-600 font-bold"><span>Cupón</span><span>-${cuponAplicado.descuento.toFixed(2)}</span></div>}
                {walletAplicado > 0 && <div className="flex justify-between text-sm text-indigo-600 font-bold"><span>Saldo</span><span>-${walletAplicado.toFixed(2)}</span></div>}
                <div className="flex justify-between font-black text-slate-900 text-base border-t pt-2"><span>Total</span><span>${totalFinal.toFixed(2)}</span></div>
              </div>
              {tipoEntrega === "domicilio" && direccionPrincipal && (
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl mb-3 text-sm">
                  <MapPin size={14} className="text-purple-600 shrink-0" />
                  <span className="text-slate-600 truncate">{direccionPrincipal.label}: {direccionPrincipal.direccion}</span>
                </div>
              )}
              {tipoEntrega === "pickup" && (
                <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-xl mb-3 text-sm">
                  <Store size={14} className="text-teal-600 shrink-0" />
                  <span className="text-teal-700 font-bold">Recoges en el restaurante</span>
                </div>
              )}
              {programadoPara && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-xl mb-3 text-sm">
                  <Calendar size={14} className="text-orange-600 shrink-0" />
                  <span className="text-orange-700 font-bold">{programadoPara}</span>
                </div>
              )}
              <p className="text-xs text-slate-400 text-center mb-4">
                {totalFinal === 0 ? "Cubierto con saldo o cupón" : metodoPago === "tarjeta" ? "Se procesará el cobro con tu tarjeta" : "Pago en efectivo al repartidor"}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl">Cancelar</button>
                <button onClick={() => { setShowConfirm(false); onPedir({ cuponAplicado, tipoEntrega, programadoPara, walletMonto: walletAplicado }); }} disabled={loading} style={{ background: GRAD }}
                  className="flex-1 py-3 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Pedir
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
