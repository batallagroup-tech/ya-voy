import { motion } from "motion/react";
import { ArrowLeft, MapPin, MessageSquare, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS_COLOR, STATUS_LABEL } from "../lib/constants";
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
  nuevo: 0, preparando: 1, listo: 2, en_camino: 3,
  esperando_cliente: 3, entregado: 4,
};

interface Props {
  pedido: Pedido;
  codigoConfirmado: boolean;
  repUbicacion: { lat: number; lng: number } | null;
  chatNoLeidos: Record<string, number>;
  onClose: () => void;
  onAbrirChat: (pedidoId: string) => void;
  onCancelar: () => void;
}

export default function PedidoDetalle({ pedido, codigoConfirmado, repUbicacion, chatNoLeidos, onClose, onAbrirChat, onCancelar }: Props) {
  const pasoActual = STATUS_IDX[pedido.status] ?? -1;

  const etaMin = useMemo(() => {
    if (pedido.status !== "en_camino" || !repUbicacion || !pedido.lat_entrega || !pedido.lng_entrega) return null;
    const km = haversineKm(repUbicacion.lat, repUbicacion.lng, Number(pedido.lat_entrega), Number(pedido.lng_entrega));
    return Math.max(1, Math.round(km / 25 * 60));
  }, [repUbicacion, pedido.lat_entrega, pedido.lng_entrega, pedido.status]);

  const esPickup = (pedido as any).tipo_entrega === "pickup";

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
      className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="font-black text-slate-900">Detalle del pedido</h1>
      </div>

      <div className="p-4 space-y-4">

        {/* Header del pedido */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-black text-slate-900 text-lg">{pedido.negocio_nombre}</h2>
            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white ${STATUS_COLOR[pedido.status] || "bg-slate-400"}`}>
              {STATUS_LABEL[pedido.status] || pedido.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {new Date(pedido.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
          {esPickup && (
            <div className="mt-2 inline-flex items-center gap-1 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
              <span className="text-xs font-bold text-teal-700">🏪 Recoger en tienda</span>
            </div>
          )}
        </div>

        {/* Tracker visual */}
        {!["cancelado", "pago_fallido", "programado"].includes(pedido.status) && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Estado del pedido</p>
            <div className="flex items-center">
              {PASOS.map((paso, i) => {
                const activo = i === pasoActual;
                const completado = i < pasoActual;
                return (
                  <div key={paso.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
                        completado ? "bg-green-500" : activo ? "ring-2 ring-offset-2 ring-purple-500" : "bg-slate-100"
                      } ${activo ? "animate-pulse" : ""}`}
                        style={activo ? { background: "linear-gradient(135deg,#6C3CE1,#E91E8C)" } : {}}>
                        {completado ? "✓" : paso.icon}
                      </div>
                      <p className={`text-[9px] font-bold text-center leading-tight ${activo ? "text-purple-700" : completado ? "text-green-600" : "text-slate-400"}`}>
                        {paso.label}
                      </p>
                    </div>
                    {i < PASOS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 transition-all ${completado ? "bg-green-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Productos */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Productos</p>
          <div className="space-y-2">
            {(Array.isArray(pedido.items) ? pedido.items : []).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600">{item.cantidad}x {item.nombre}</span>
                <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 space-y-1">
            {pedido.costo_envio != null && !esPickup && <div className="flex justify-between text-sm text-slate-500"><span>Envío</span><span>${Number(pedido.costo_envio).toFixed(2)}</span></div>}
            {esPickup && <div className="flex justify-between text-sm text-teal-600 font-bold"><span>Envío</span><span>Gratis (recoger)</span></div>}
            {pedido.propina > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Propina</span><span>${Number(pedido.propina).toFixed(2)}</span></div>}
            <div className="flex justify-between font-black text-slate-900 text-base mt-1"><span>Total</span><span>${Number(pedido.total).toFixed(2)}</span></div>
          </div>
        </div>

        {/* Dirección */}
        {!esPickup && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entrega</p>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-purple-600 shrink-0" />
              <p className="text-sm text-slate-700">{pedido.direccion_entrega}</p>
            </div>
          </div>
        )}

        {/* ETA + mapa cuando va en camino */}
        {pedido.status === "en_camino" && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-xl">🛵</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-purple-600 uppercase tracking-wider">En camino</p>
                <p className="text-sm font-bold text-slate-700">El repartidor va hacia ti</p>
                {etaMin !== null ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={12} className="text-purple-500" />
                    <p className="text-xs font-black text-purple-700">~{etaMin} min</p>
                  </div>
                ) : pedido.tiempo_estimado ? (
                  <p className="text-xs text-slate-500 mt-0.5">Tiempo estimado: {pedido.tiempo_estimado}</p>
                ) : null}
              </div>
            </div>
            {repUbicacion && (
              <div className="rounded-xl overflow-hidden border border-purple-200" style={{ height: 160 }}>
                <MapContainer center={[repUbicacion.lat, repUbicacion.lng]} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[repUbicacion.lat, repUbicacion.lng]} />
                  <MapUpdater lat={repUbicacion.lat} lng={repUbicacion.lng} />
                </MapContainer>
              </div>
            )}
          </div>
        )}

        {pedido.status === "preparando" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0"><span className="text-xl">👨‍🍳</span></div>
            <div>
              <p className="text-xs font-black text-orange-600 uppercase tracking-wider">Preparando</p>
              <p className="text-sm font-bold text-slate-700">El restaurante está preparando tu orden</p>
              {pedido.tiempo_estimado && <p className="text-xs text-slate-500 mt-0.5">Tiempo estimado: {pedido.tiempo_estimado}</p>}
            </div>
          </div>
        )}

        {pedido.status === "listo" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0"><span className="text-xl">📦</span></div>
            <div>
              <p className="text-xs font-black text-yellow-600 uppercase tracking-wider">Listo</p>
              <p className="text-sm font-bold text-slate-700">{esPickup ? "Tu pedido está listo para recoger" : "Tu pedido está listo — buscando repartidor"}</p>
            </div>
          </div>
        )}

        {pedido.status === "nuevo" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><span className="text-xl">⏳</span></div>
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Recibido</p>
              <p className="text-sm font-bold text-slate-700">Esperando confirmación del restaurante</p>
            </div>
          </div>
        )}

        {(pedido as any).status === "programado" && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0"><span className="text-xl">📅</span></div>
            <div>
              <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">Programado</p>
              <p className="text-sm font-bold text-slate-700">Tu pedido se enviará en la franja programada</p>
              {(pedido as any).programado_para && <p className="text-xs text-slate-500 mt-0.5">{(pedido as any).programado_para}</p>}
            </div>
          </div>
        )}

        {["nuevo", "preparando"].includes(pedido.status) && (
          <button onClick={onCancelar}
            className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 font-bold text-sm mt-2 mb-2">
            ✕ Cancelar pedido
          </button>
        )}

        {["en_camino", "esperando_cliente"].includes(pedido.status) && (
          <button onClick={() => onAbrirChat(pedido.id)}
            className="relative w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-purple-200 text-purple-600 bg-purple-50">
            <MessageSquare size={18} /> Chatear con el repartidor
            {(chatNoLeidos[pedido.id] || 0) > 0 && (
              <span className="absolute top-2 right-3 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">
                {chatNoLeidos[pedido.id]}
              </span>
            )}
          </button>
        )}

        {["en_camino", "esperando_cliente"].includes(pedido.status) && !codigoConfirmado && pedido.codigo_entrega && (
          <div className="bg-white rounded-2xl border-2 border-purple-200 p-4 text-center">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">El repartidor llegó</p>
            <p className="text-sm text-slate-600 mb-4">Muestra esta palabra al repartidor:</p>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl py-6 px-4 mb-2">
              <p className="text-4xl font-black tracking-widest text-purple-700">{pedido.codigo_entrega}</p>
            </div>
            <p className="text-xs text-slate-400">Solo muestra esta palabra — no la digas en voz alta</p>
          </div>
        )}

        {(pedido.status === "entregado" || codigoConfirmado) && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">✅</p>
            <p className="font-black text-green-700">¡Pedido entregado!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
