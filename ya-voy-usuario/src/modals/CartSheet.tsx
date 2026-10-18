import { useState } from "react";
import { motion } from "motion/react";
import { X, Minus, Plus, Banknote, CreditCard, MapPin, Loader2, Trash2, Store, Calendar, Wallet, Check, Ticket, Sparkles, AlertCircle } from "lucide-react";
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
  tarjetas?: any[];
  onManageCards?: () => void;
  onPropinaChange: (p: number) => void;
  onAddToCart: (item: any) => void;
  onRemoveFromCart: (id: string) => void;
  onPedir: (extras: PedidoExtras) => void;
  onClearCart: () => void;
  onClose: () => void;
}

const PROPINAS = [0, 10, 20, 30];

export default function CartSheet({ 
  cart, 
  total, 
  costoEnvio, 
  costoEnvioLoading, 
  metodoPago, 
  onMetodoPagoChange, 
  direccionPrincipal, 
  loading, 
  negocioId, 
  propina, 
  walletBalance, 
  tarjetas,
  onManageCards,
  onPropinaChange, 
  onAddToCart, 
  onRemoveFromCart, 
  onPedir, 
  onClearCart, 
  onClose 
}: Props) {
  const [cuponCodigo, setCuponCodigo] = useState("");
  const [cuponAplicado, setCuponAplicado] = useState<CuponAplicado | null>(null);
  const [cuponLoading, setCuponLoading] = useState(false);
  const [cuponError, setCuponError] = useState("");
  const [propinaCustom, setPropinaCustom] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmVaciar, setShowConfirmVaciar] = useState(false);
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
    setCuponLoading(true); 
    setCuponError("");
    try {
      const r = await fetch(API + "/api/usuario/cupones/validar", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: cuponCodigo.trim(), total: total + envioEfectivo, negocioId }),
      });
      const d = await r.json();
      if (!r.ok) { 
        setCuponError(d.error || "Cupón inválido o expirado"); 
        return; 
      }
      setCuponAplicado(d);
      toast.success(`¡Cupón aplicado! -$${d.descuento.toFixed(2)} de descuento`);
    } catch { 
      setCuponError("Error al validar el cupón"); 
    } finally { 
      setCuponLoading(false); 
    }
  };

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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/60 z-[60] flex items-end backdrop-blur-sm">
      <motion.div 
        initial={{ y: 350 }} 
        animate={{ y: 0 }} 
        exit={{ y: 350 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-900">Tu Pedido</h3>
            <p className="text-xs text-slate-400">{cart.reduce((a, i) => a + i.cantidad, 0)} platillos seleccionados</p>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={() => setShowConfirmVaciar(true)} 
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors">
                <Trash2 size={13} /> Vaciar
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal de confirmación para vaciar carrito */}
        {showConfirmVaciar && (
          <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={24} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-slate-900 text-lg">¿Vaciar carrito?</h4>
                <p className="text-xs text-slate-500 mt-1">Se eliminarán todos los platillos y productos seleccionados de tu pedido.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setShowConfirmVaciar(false)} 
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-200">
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setShowConfirmVaciar(false);
                    onClearCart();
                    onClose();
                  }} 
                  className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl text-xs hover:bg-red-600 shadow-md">
                  Sí, vaciar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tipo de Entrega Toggle */}
        <div className="mb-4 bg-slate-100 p-1 rounded-2xl grid grid-cols-2 gap-1 shrink-0">
          {(["domicilio", "pickup"] as const).map(tipo => (
            <button 
              key={tipo} 
              onClick={() => setTipoEntrega(tipo)}
              className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                tipoEntrega === tipo 
                  ? "text-white shadow-sm" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              style={tipoEntrega === tipo ? { background: GRAD } : {}}>
              {tipo === "domicilio" ? <MapPin size={15} /> : <Store size={15} />}
              {tipo === "domicilio" ? "A domicilio" : "Recoger en tienda"}
            </button>
          ))}
        </div>

        {tipoEntrega === "pickup" && (
          <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-xl py-2 px-3 mb-4 font-bold text-center">
            🏪 Recogerás tu orden en el restaurante sin costo de envío
          </p>
        )}

        {/* Items del Carrito */}
        <div className="space-y-3 mb-4 flex-1">
          {cart.map(item => (
            <div key={item.cartKey} className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <button 
                    onClick={() => onRemoveFromCart(item.cartKey)} 
                    className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-rose-600 active:scale-90 shadow-2xs">
                    <Minus size={12} />
                  </button>
                  <span className="font-black text-slate-900 w-5 text-center text-xs">{item.cantidad}</span>
                  <button 
                    onClick={() => onAddToCart(item)} 
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white active:scale-90 shadow-2xs" 
                    style={{ background: GRAD }}>
                    <Plus size={12} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{item.nombre}</p>
                  {Array.isArray(item.opciones) && item.opciones.length > 0 ? (
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.opciones.map(o => o.nombre).join(' · ')}</p>
                  ) : null}
                </div>
              </div>
              <span className="font-black text-xs text-rose-700 shrink-0 pt-0.5">
                ${(item.precio * item.cantidad).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Cupón */}
        <div className="mb-3 space-y-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ticket size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={cuponCodigo} 
                onChange={e => { setCuponCodigo(e.target.value.toUpperCase()); setCuponError(""); }}
                placeholder="Código de cupón" 
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-2xl text-xs border border-slate-200 outline-none focus:border-rose-400 font-bold uppercase tracking-wider" 
              />
            </div>
            <button 
              onClick={aplicarCupon} 
              disabled={cuponLoading || !!cuponAplicado || !cuponCodigo.trim()}
              className="px-4 py-2.5 rounded-2xl text-xs font-black text-white disabled:opacity-50 shadow-sm" 
              style={{ background: GRAD }}>
              {cuponLoading ? <Loader2 size={14} className="animate-spin" /> : cuponAplicado ? "OK" : "Aplicar"}
            </button>
            {cuponAplicado && (
              <button 
                onClick={() => { setCuponAplicado(null); setCuponCodigo(""); }} 
                className="px-3 py-2.5 rounded-2xl text-xs font-bold text-red-500 border border-red-200 bg-red-50">
                ✕
              </button>
            )}
          </div>
          {cuponError && <p className="text-[11px] text-red-500 font-bold px-1">{cuponError}</p>}
        </div>

        {/* Monedero Wallet Toggle */}
        {walletBalance > 0 && (
          <button 
            onClick={() => setUsarWallet(v => !v)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl mb-3 border-2 transition-all ${
              usarWallet ? "border-indigo-400 bg-indigo-50/70" : "border-slate-200 bg-white"
            }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${usarWallet ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                <Wallet size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-slate-800">Usar saldo en monedero</p>
                <p className="text-[10px] text-slate-400">${walletBalance.toFixed(2)} disponibles</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${usarWallet ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
              {usarWallet && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        )}

        {/* Propina */}
        {tipoEntrega === "domicilio" && (
          <div className="mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Propina al Repartidor (Opcional)</p>
            <div className="flex gap-2">
              {PROPINAS.map(p => (
                <button 
                  key={p} 
                  onClick={() => { onPropinaChange(p); setPropinaCustom(""); }}
                  className={`flex-1 py-2 rounded-2xl text-xs font-black border transition-all ${
                    propina === p && !propinaCustom 
                      ? "text-white border-transparent shadow-sm" 
                      : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                  }`}
                  style={propina === p && !propinaCustom ? { background: GRAD } : {}}>
                  {p === 0 ? "Sin propina" : `$${p}`}
                </button>
              ))}
              <input 
                type="number" 
                min="0" 
                max="500" 
                placeholder="Otra" 
                value={propinaCustom}
                onChange={e => { 
                  const v = Math.max(0, Math.min(500, Number(e.target.value) || 0)); 
                  setPropinaCustom(e.target.value); 
                  onPropinaChange(v); 
                }}
                className="w-16 px-2 py-2 rounded-2xl text-xs font-bold border border-slate-200 text-slate-700 text-center outline-none focus:border-rose-400" 
              />
            </div>
          </div>
        )}

        {/* Método de Pago */}
        {totalFinal > 0 && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-600 shadow-2xs">
                  {metodoPago === "efectivo" ? <Banknote size={16} /> : <CreditCard size={16} />}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {metodoPago === "efectivo" ? "Pago en Efectivo al recibir" : "Pago con Tarjeta bancaria"}
                  </span>
                  {metodoPago === "tarjeta" && (
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {tarjetas && tarjetas.length > 0 
                        ? `Tarjeta vinculada •••• ${tarjetas[0].card?.last4 || tarjetas[0].last4 || "guardada"}`
                        : "Sin tarjeta vinculada aún"}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => onMetodoPagoChange(metodoPago === "efectivo" ? "tarjeta" : "efectivo")}
                className="text-[11px] font-black px-3 py-1.5 rounded-xl border border-slate-200 text-rose-600 bg-white hover:bg-slate-50 transition-colors shadow-2xs">
                {metodoPago === "efectivo" ? "Pagar con Tarjeta" : "Pagar con Efectivo"}
              </button>
            </div>

            {/* Acciones de tarjeta si el método es tarjeta */}
            {metodoPago === "tarjeta" && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <CreditCard size={13} className="text-rose-600" />
                  {tarjetas && tarjetas.length > 0 ? (
                    <span className="font-semibold text-slate-700">
                      {tarjetas[0].card?.brand ? `${tarjetas[0].card.brand.toUpperCase()} ` : ""}•••• {tarjetas[0].card?.last4 || tarjetas[0].last4}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">Debes ingresar tu tarjeta</span>
                  )}
                </div>
                <button
                  onClick={() => onManageCards?.()}
                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200/80 active:scale-95 transition-all">
                  {tarjetas && tarjetas.length > 0 ? "Cambiar / Nueva tarjeta" : "+ Agregar tarjeta (real)"}
                </button>
              </div>
            )}

            {/* Alerta de límite de efectivo para cuentas nuevas */}
            {metodoPago === "efectivo" && totalFinal > 400 && (
              <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2 text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-tight">
                  <span className="font-bold">Límite de seguridad:</span> En órdenes en efectivo de más de $400 MXN para cuentas nuevas, se requiere pago con tarjeta. Te sugerimos seleccionar tarjeta bancaria.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Resumen de Costos */}
        <div className="border-t border-slate-100 pt-3 space-y-1.5 mb-4 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-bold">${total.toFixed(2)}</span>
          </div>
          {tipoEntrega === "domicilio" && (
            <div className="flex justify-between text-slate-500">
              <span>Envío</span>
              <span className="font-bold">{costoEnvioLoading ? "..." : `$${envioEfectivo.toFixed(2)}`}</span>
            </div>
          )}
          {tipoEntrega === "pickup" && (
            <div className="flex justify-between text-teal-700 font-bold">
              <span>Envío</span>
              <span>Gratis</span>
            </div>
          )}
          {cuponAplicado && (
            <div className="flex justify-between text-green-600 font-bold">
              <span>Cupón {cuponAplicado.codigo}</span>
              <span>-${cuponAplicado.descuento.toFixed(2)}</span>
            </div>
          )}
          {walletAplicado > 0 && (
            <div className="flex justify-between text-indigo-600 font-bold">
              <span>Saldo aplicado</span>
              <span>-${walletAplicado.toFixed(2)}</span>
            </div>
          )}
          {propina > 0 && (
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Propina al repartidor</span>
              <span>+${propina.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-slate-900 text-base border-t border-slate-100 pt-2 mt-2">
            <span>Total a Pagar</span>
            <span className="text-rose-600">${totalFinal.toFixed(2)}</span>
          </div>
        </div>

        {/* Botón Principal */}
        <button 
          onClick={() => {
            if (metodoPago === "tarjeta" && totalFinal > 0 && (!tarjetas || tarjetas.length === 0)) {
              toast.info("Por favor ingresa los datos de tu tarjeta bancaria");
              onManageCards?.();
              return;
            }
            setShowConfirm(true);
          }} 
          disabled={loading || cart.length === 0} 
          style={{ background: GRAD }}
          className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] transition-transform disabled:opacity-50 text-sm">
          {loading ? <Loader2 className="animate-spin" size={20} /> : null}
          Confirmar y Ordenar
        </button>

        {/* Diálogo de Confirmación Final */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <h3 className="font-black text-slate-900 text-lg">¿Todo listo para tu pedido?</h3>
              <div className="space-y-2 text-xs">
                {cart.map(item => (
                  <div key={item.cartKey} className="flex justify-between">
                    <span className="text-slate-600">{item.cantidad}× {item.nombre}</span>
                    <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-sm border-t border-slate-100 pt-2 text-rose-600">
                  <span>Total final</span>
                  <span>${totalFinal.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                {metodoPago === "tarjeta" && totalFinal > 0 ? "Se procesará de forma segura con Stripe" : "Pagas en efectivo al recibir tu comida"}
              </p>
              <div className="flex gap-3 pt-1">
                <button 
                  onClick={() => setShowConfirm(false)} 
                  className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-colors">
                  Volver
                </button>
                <button 
                  onClick={() => { 
                    setShowConfirm(false); 
                    onPedir({ cuponAplicado, tipoEntrega, programadoPara, walletMonto: walletAplicado }); 
                  }} 
                  disabled={loading} 
                  style={{ background: GRAD }}
                  className="flex-1 py-3.5 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform disabled:opacity-50">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Sí, Pedir Ahora
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
