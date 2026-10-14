import { motion } from "motion/react";
import { ArrowLeft, MapPin, MessageSquare, Clock, Star, Bike, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS_COLOR, STATUS_LABEL, GRAD } from "../lib/constants";
import type { Pedido } from "../types";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng]);
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PASOS = [
  { status: "nuevo",       label: "Recibido",   icon: "⏳" },
  { status: "preparando",  label: "Preparando", icon: "👨‍🍳" },
  { status: "listo",       label: "Listo",      icon: "📦" },
  { status: "en_camino",   label: "En camino",  icon: "🛵" },
  { status: "entregado",   label: "Entregado",  icon: "✅" },
];

const STATUS_IDX: Record<string, number> = {
  nuevo: 0, 
  preparando: 1, 
  listo: 2, 
  en_camino: 3,
  esperando_cliente: 3, 
  entregado: 4,
};

interface Props {
  pedido: Pedido;
  codigoConfirmado: boolean;
  repUbicacion: { lat: number; lng: number } | null;
  chatNoLeidos: Record<string, number>;
  onClose: () => void;
  onAbrirChat: (pedidoId: string) => void;
  onCancelar: () => void;
  onCalificar?: () => void;
}

export default function PedidoDetalle({ 
  pedido, 
  codigoConfirmado, 
  repUbicacion, 
  chatNoLeidos, 
  onClose, 
  onAbrirChat, 
  onCancelar,
  onCalificar
}: Props) {
  const pasoActual = STATUS_IDX[pedido.status] ?? -1;

  const etaMin = useMemo(() => {
    if (pedido.status !== "en_camino" || !repUbicacion || !pedido.lat_entrega || !pedido.lng_entrega) return null;
    const km = haversineKm(repUbicacion.lat, repUbicacion.lng, Number(pedido.lat_entrega), Number(pedido.lng_entrega));
    return Math.max(1, Math.round(km / 25 * 60));
  }, [repUbicacion, pedido.lat_entrega, pedido.lng_entrega, pedido.status]);

  const esPickup = (pedido as any).tipo_entrega === "pickup";

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 50 }}
      className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-y-auto">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <div className="text-center">
          <h1 className="font-black text-slate-900 text-sm">Detalle de tu Pedido</h1>
          <p className="text-[10px] text-slate-400 font-bold">#{pedido.id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="w-9" />
      </div>

      <div className="p-4 space-y-3 pb-24">

        {/* Card Resumen de Negocio y Status */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">{pedido.negocio_nombre}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(pedido.creado_en).toLocaleDateString("es-MX", { 
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" 
                })}
              </p>
            </div>
            <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-full text-white shrink-0 shadow-sm ${STATUS_COLOR[pedido.status] || "bg-slate-400"}`}>
              {STATUS_LABEL[pedido.status] || pedido.status}
            </span>
          </div>
          {esPickup && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
              <span className="text-xs font-black text-teal-700">🏪 Recoger en restaurante</span>
            </div>
          )}
        </div>

        {/* Tracker de Pasos Visual */}
        {!["cancelado", "pago_fallido", "programado"].includes(pedido.status) && (
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4">Progreso de la Orden</p>
            <div className="flex items-center">
              {PASOS.map((paso, i) => {
                const activo = i === pasoActual;
                const completado = i < pasoActual;
                return (
                  <div key={paso.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm transition-all ${
                        completado 
                          ? "bg-green-500 text-white font-bold" 
                          : activo 
                            ? "ring-4 ring-rose-100 text-white animate-pulse" 
                            : "bg-slate-100 text-slate-400"
                      }`}
                        style={activo ? { background: GRAD } : {}}>
                        {completado ? "✓" : paso.icon}
                      </div>
                      <p className={`text-[9px] font-black text-center leading-tight ${
                        activo ? "text-rose-600" : completado ? "text-green-600" : "text-slate-400"
                      }`}>
                        {paso.label}
                      </p>
                    </div>
                    {i < PASOS.length - 1 && (
                      <div className={`h-1 flex-1 mx-0.5 rounded-full transition-all ${completado ? "bg-green-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Estado: EN CAMINO con MAPA y ETA */}
        {pedido.status === "en_camino" && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <span className="text-2xl">🛵</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">¡Tu repartidor va en camino!</p>
                <p className="text-sm font-black text-slate-800">Preparando la entrega a tu puerta</p>
                {etaMin !== null ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} className="text-rose-600" />
                    <span className="text-xs font-black text-rose-700">Tiempo aproximado: ~{etaMin} min</span>
                  </div>
                ) : pedido.tiempo_estimado ? (
                  <p className="text-xs font-medium text-slate-600">Tiempo estimado: {pedido.tiempo_estimado}</p>
                ) : null}
              </div>
            </div>

            {/* Repartidor Info */}
            {(pedido.repartidor_rating || pedido.repartidor_vehiculo) && (
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-rose-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <Bike size={14} className="text-rose-600" />
                  <span className="font-bold text-slate-700">{pedido.repartidor_vehiculo || "Motocicleta"}</span>
                </div>
                {pedido.repartidor_rating && (
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-slate-700">{Number(pedido.repartidor_rating).toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}

            {repUbicacion && (
              <div className="rounded-2xl overflow-hidden border border-rose-200 shadow-inner" style={{ height: 180 }}>
                <MapContainer center={[repUbicacion.lat, repUbicacion.lng]} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[repUbicacion.lat, repUbicacion.lng]} />
                  <MapUpdater lat={repUbicacion.lat} lng={repUbicacion.lng} />
                </MapContainer>
              </div>
            )}
          </div>
        )}

        {/* Botón de Chat con Repartidor */}
        {["en_camino", "esperando_cliente"].includes(pedido.status) && (
          <button 
            onClick={() => onAbrirChat(pedido.id)}
            className="relative w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-[0.99] transition-all shadow-sm">
            <MessageSquare size={18} /> Chatear con el repartidor
            {(chatNoLeidos[pedido.id] || 0) > 0 && (
              <span className="absolute top-3 right-4 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                {chatNoLeidos[pedido.id]}
              </span>
            )}
          </button>
        )}

        {/* Código de Verificación al Llegar */}
        {["en_camino", "esperando_cliente"].includes(pedido.status) && !codigoConfirmado && pedido.codigo_entrega && (
          <div className="bg-white rounded-3xl border-2 border-rose-300 p-5 text-center shadow-md">
            <div className="flex items-center justify-center gap-1.5 mb-1 text-rose-600">
              <ShieldAlert size={16} />
              <p className="text-xs font-black uppercase tracking-wider">Código de Entrega Segura</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">Muestra esta palabra al repartidor para recibir tu paquete:</p>
            <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl py-4 px-4 mb-2 shadow-inner">
              <p className="text-3xl font-black tracking-widest text-rose-800 uppercase">{pedido.codigo_entrega}</p>
            </div>
            <p className="text-[10px] text-slate-400">Por seguridad, solo muéstrala en tu pantalla.</p>
          </div>
        )}

        {/* Estado: ENTREGADO y Botón de Calificar */}
        {(pedido.status === "entregado" || codigoConfirmado) && (
          <div className="bg-green-50 border border-green-200 rounded-3xl p-5 text-center shadow-sm space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle2 size={24} />
              <span className="font-black text-lg">¡Pedido entregado con éxito!</span>
            </div>
            <p className="text-xs text-slate-600">Esperamos que hayas disfrutado tu comida.</p>
            
            {onCalificar && !pedido.rating_restaurante && (
              <button 
                onClick={onCalificar}
                className="w-full py-3.5 rounded-2xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all"
                style={{ background: GRAD }}>
                <Sparkles size={16} className="text-yellow-300" /> Calificar mi pedido
              </button>
            )}
          </div>
        )}

        {/* Lista de Productos */}
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Productos del Pedido</p>
          <div className="space-y-2.5">
            {(Array.isArray(pedido.items) ? pedido.items : []).map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-start text-xs">
                <div className="flex-1 pr-2">
                  <span className="font-bold text-slate-800">{item.cantidad}× {item.nombre}</span>
                  {item.opciones?.length ? (
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.opciones.map((o: any) => o.nombre).join(' · ')}</p>
                  ) : null}
                </div>
                <span className="font-black text-slate-900">${(item.precio * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 mt-4 pt-3 space-y-1.5 text-xs">
            {pedido.costo_envio != null && !esPickup && (
              <div className="flex justify-between text-slate-500">
                <span>Costo de envío</span>
                <span className="font-bold">${Number(pedido.costo_envio).toFixed(2)}</span>
              </div>
            )}
            {esPickup && (
              <div className="flex justify-between text-teal-600 font-bold">
                <span>Envío</span>
                <span>Gratis (Recoger)</span>
              </div>
            )}
            {(pedido.propina ?? 0) > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Propina</span>
                <span>+${Number(pedido.propina).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-100 pt-2 mt-2">
              <span>Total pagado</span>
              <span className="text-rose-600">${Number(pedido.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Dirección de Entrega */}
        {!esPickup && pedido.direccion_entrega && (
          <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Entregar en</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5 leading-relaxed">{pedido.direccion_entrega}</p>
            </div>
          </div>
        )}

        {/* Botón de Cancelación */}
        {["nuevo", "preparando"].includes(pedido.status) && (
          <button 
            onClick={onCancelar}
            className="w-full py-3.5 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold text-xs transition-colors">
            ✕ Cancelar este pedido
          </button>
        )}

      </div>
    </motion.div>
  );
}
