import { motion } from "motion/react";
import { ArrowLeft, MapPin, MessageSquare } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
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
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-slate-900 text-lg">{pedido.negocio_nombre}</h2>
            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white ${STATUS_COLOR[pedido.status] || "bg-slate-400"}`}>
              {STATUS_LABEL[pedido.status] || pedido.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {new Date(pedido.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

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
            {pedido.costo_envio != null && <div className="flex justify-between text-sm text-slate-500"><span>Envío</span><span>${Number(pedido.costo_envio).toFixed(2)}</span></div>}
            {pedido.propina > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Propina</span><span>${Number(pedido.propina).toFixed(2)}</span></div>}
            <div className="flex justify-between font-black text-slate-900 text-base mt-1"><span>Total</span><span>${Number(pedido.total).toFixed(2)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entrega</p>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-purple-600 shrink-0" />
            <p className="text-sm text-slate-700">{pedido.direccion_entrega}</p>
          </div>
        </div>

        {pedido.status === "en_camino" && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <span className="text-xl">🛵</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-purple-600 uppercase tracking-wider">En camino</p>
              <p className="text-sm font-bold text-slate-700">El repartidor va hacia ti</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {pedido.repartidor_rating && Number(pedido.repartidor_rating) < 5
                  ? "⭐ " + Number(pedido.repartidor_rating).toFixed(1) + " calificacion"
                  : "⭐ Nuevo repartidor"}
              </p>
              {repUbicacion ? (
                <div className="mt-2 rounded-xl overflow-hidden border border-purple-200" style={{ height: 160 }}>
                  <MapContainer center={[repUbicacion.lat, repUbicacion.lng]} zoom={15} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[repUbicacion.lat, repUbicacion.lng]} />
                    <MapUpdater lat={repUbicacion.lat} lng={repUbicacion.lng} />
                  </MapContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">Tiempo estimado: {pedido.tiempo_estimado || "15-30 min"}</p>
              )}
            </div>
          </div>
        )}

        {pedido.status === "preparando" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0"><span className="text-xl">👨‍🍳</span></div>
            <div>
              <p className="text-xs font-black text-orange-600 uppercase tracking-wider">Preparando</p>
              <p className="text-sm font-bold text-slate-700">El restaurante está preparando tu orden</p>
              <p className="text-xs text-slate-500 mt-0.5">Tiempo estimado: {pedido.tiempo_estimado || "10-20 min"}</p>
            </div>
          </div>
        )}

        {pedido.status === "listo" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0"><span className="text-xl">📦</span></div>
            <div>
              <p className="text-xs font-black text-yellow-600 uppercase tracking-wider">Listo</p>
              <p className="text-sm font-bold text-slate-700">Tu pedido está listo — esperando repartidor</p>
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
            <p className="text-sm text-slate-600 mb-4">Muestra esta palabra al repartidor. Él la seleccionará en su app para confirmar la entrega:</p>
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
