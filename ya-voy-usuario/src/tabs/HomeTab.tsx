import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShoppingBag, Utensils, Store, Package, Star, Plus, Heart, Map, List, MapPin, Sparkles, Flame } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GRAD } from "../lib/constants";
import type { CartItem } from "../lib/constants";
import type { Negocio, Producto, Pedido } from "../types";
import { imgUrl } from "../lib/cloudinary";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
});

const redPinIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [28, 44],
  iconAnchor: [14, 44],
  popupAnchor: [0, -40],
});

const storePinIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [24, 38],
  iconAnchor: [12, 38],
  popupAnchor: [0, -35],
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 14));
  }, [center, map]);
  return null;
}

const SUB_CATEGORIAS: Record<string, string[]> = {
  comida: ["Todos", "Tacos", "Hamburguesas", "Pizza", "Sushi", "Comida Corrida", "Alitas", "Ensaladas", "Mariscos", "Postres", "Bebidas"],
  tienda: ["Todos"],
  envio: [],
};

interface Props {
  categoria: "comida" | "tienda" | "envio";
  subCategoria: string;
  negocios: Negocio[];
  productosFeed: Producto[];
  cart: CartItem[];
  loading: boolean;
  favoritos: Negocio[];
  favoritosIds: Set<string>;
  pedidos: Pedido[];
  userLocation: [number, number] | null;
  direccionPrincipal?: { id?: string; label?: string; direccion?: string; lat?: number; lng?: number } | null;
  onCategoriaChange: (c: "comida" | "tienda" | "envio") => void;
  onSubCategoriaChange: (s: string) => void;
  onOpenNegocio: (n: Negocio) => void;
  onAddToCart: (p: Producto) => void;
  onProductoClick: (p: Producto) => void;
  onToggleFavorito: (n: Negocio) => void;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomeTab({ 
  categoria, 
  subCategoria, 
  negocios, 
  productosFeed, 
  cart, 
  loading, 
  favoritos, 
  favoritosIds, 
  pedidos, 
  userLocation, 
  direccionPrincipal,
  onCategoriaChange, 
  onSubCategoriaChange, 
  onOpenNegocio, 
  onAddToCart, 
  onProductoClick, 
  onToggleFavorito 
}: Props) {
  const [vistaLista, setVistaLista] = useState(true);

  const mapCenter: [number, number] = (direccionPrincipal?.lat && direccionPrincipal?.lng)
    ? [direccionPrincipal.lat, direccionPrincipal.lng]
    : (userLocation ?? [19.9342, -97.9612]);

  const negociosFiltrados = negocios.filter(n => {
    const rawTipo = (n.tipo || 'restaurante').toLowerCase().trim();
    if (categoria === "comida") {
      return rawTipo === "restaurante" || rawTipo === "comida";
    }
    if (categoria === "tienda") {
      return rawTipo === "tienda" || rawTipo === "abarrotes" || rawTipo === "tiendita";
    }
    return true;
  });

  const productosFiltrados = productosFeed.filter(p =>
    subCategoria === "Todos" || p.categoria === subCategoria
  );

  // Frecuentes: top 5 restaurantes por número de pedidos entregados
  const frecuentes = (() => {
    const conteo: Record<string, number> = {};
    pedidos.filter(p => p.status === "entregado").forEach(p => {
      conteo[(p as any).negocio_id] = (conteo[(p as any).negocio_id] || 0) + 1;
    });
    return Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => negocios.find(n => n.id === id))
      .filter(Boolean) as Negocio[];
  })();

  const negMapaData = negociosFiltrados.filter(n => n.lat && n.lng);

  return (
    <motion.div 
      key="home" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="p-4 space-y-4">
      
      {/* Category Pills Header */}
      <div className="grid grid-cols-3 gap-2.5">
        {([
          { id: "comida", label: "COMIDA", icon: Utensils },
          { id: "tienda", label: "TIENDA", icon: Store },
          { id: "envio", label: "ENVÍOS", icon: Package },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button 
            key={id} 
            onClick={() => { onCategoriaChange(id); onSubCategoriaChange("Todos"); }}
            className={`py-3.5 px-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all ${
              categoria === id 
                ? "text-white shadow-lg shadow-rose-500/25 scale-[1.02]" 
                : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
            }`}
            style={categoria === id ? { background: GRAD } : {}}>
            <Icon size={24} />
            <span className="text-[10px] font-black tracking-wider uppercase">{label}</span>
          </button>
        ))}
      </div>

      {categoria === "envio" && (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-4">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: "linear-gradient(135deg,#f3f0ff,#fdf2f8)" }}>
            <Package size={40} className="text-rose-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Envío de Paquetes</h2>
            <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
              Envía llaves, documentos o paquetes a cualquier punto de la ciudad de forma rápida y segura.
            </p>
          </div>
          <span className="inline-block px-5 py-2.5 rounded-full font-black text-white text-xs shadow-md" style={{ background: GRAD }}>
            🚀 PRÓXIMAMENTE
          </span>
        </div>
      )}

      {categoria !== "envio" && (
        <>
          {/* Frecuentes / Ya pedí aquí */}
          {frecuentes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Flame size={14} className="text-orange-500" />
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Ya pedí aquí</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                {frecuentes.map(n => (
                  <button 
                    key={n.id} 
                    onClick={() => onOpenNegocio(n)}
                    className="shrink-0 flex flex-col items-center gap-1.5 w-16 group active:scale-95 transition-transform">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-rose-200 bg-slate-100 shadow-sm group-hover:border-rose-400 transition-colors">
                      {n.imagen_url ? (
                        <img src={imgUrl(n.imagen_url, 120)} alt={n.nombre} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 text-center leading-tight w-full truncate">{n.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Favoritos */}
          {favoritos.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Heart size={14} className="text-red-500 fill-red-500" />
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Mis Favoritos</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                {favoritos.map(n => (
                  <button 
                    key={n.id} 
                    onClick={() => onOpenNegocio(n)}
                    className="shrink-0 flex flex-col items-center gap-1.5 w-16 group active:scale-95 transition-transform">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm group-hover:border-rose-300 transition-colors">
                      {n.imagen_url ? (
                        <img src={imgUrl(n.imagen_url, 120)} alt={n.nombre} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 text-center leading-tight w-full truncate">{n.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subcategorías Chips y Toggle Vista */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1 no-scrollbar">
              {SUB_CATEGORIAS[categoria].map(s => (
                <button 
                  key={s} 
                  onClick={() => onSubCategoriaChange(s)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all shrink-0 ${
                    subCategoria === s 
                      ? "text-white shadow-sm" 
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                  style={subCategoria === s ? { background: GRAD } : {}}>
                  {s}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setVistaLista(v => !v)}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 active:scale-90 transition-all">
              {vistaLista ? <Map size={18} /> : <List size={18} />}
            </button>
          </div>

          {/* Vista de Mapa */}
          {!vistaLista && (
            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative" style={{ height: 380 }}>
              <MapContainer
                center={mapCenter}
                zoom={14} 
                style={{ height: "100%", width: "100%" }} 
                zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapRecenter center={mapCenter} />

                {/* Marcador de destino / entrega */}
                <Marker position={mapCenter} icon={redPinIcon}>
                  <Popup>
                    <div style={{ minWidth: 150 }}>
                      <p className="font-black text-xs text-[#9C0D38] uppercase tracking-wider mb-0.5">📍 Entregar aquí</p>
                      <p className="font-black text-xs text-slate-800">{direccionPrincipal?.label || "Mi ubicación"}</p>
                      {direccionPrincipal?.direccion && (
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{direccionPrincipal.direccion}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Marcadores de locales y restaurantes cercanos */}
                {negMapaData.map(n => (
                  <Marker key={n.id} position={[n.lat!, n.lng!]} icon={storePinIcon}>
                    <Popup>
                      <div style={{ minWidth: 150 }}>
                        <p className="font-black text-sm mb-0.5">{n.nombre}</p>
                        <p className="text-[11px] text-slate-500 mb-2">⭐ {Number(n.rating || 0).toFixed(1)} · {n.tipo}</p>
                        <button 
                          onClick={() => onOpenNegocio(n)}
                          className="w-full py-1.5 rounded-xl text-white text-xs font-black shadow-xs active:scale-95 transition-transform"
                          style={{ background: GRAD }}>
                          Ver Menú
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}

          {/* Vista de Lista */}
          {vistaLista && (
            loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-3xl border border-slate-100 p-3.5 flex items-center gap-3.5 animate-pulse">
                    <div className="w-20 h-20 rounded-2xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                      <div className="h-4 bg-slate-200 rounded-lg w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : negociosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-100 p-6">
                <ShoppingBag size={48} className="mx-auto mb-3 opacity-25" />
                <p className="font-bold text-sm text-slate-600">No hay restaurantes disponibles</p>
                <p className="text-xs text-slate-400 mt-1">Revisa tu ubicación o vuelve en unos minutos</p>
              </div>
            ) : categoria === "comida" ? (
              productosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-100 p-6">
                  <ShoppingBag size={48} className="mx-auto mb-3 opacity-25" />
                  <p className="font-bold text-sm text-slate-600">Sin platillos en esta categoría</p>
                  <p className="text-xs text-slate-400 mt-1">Prueba seleccionando otra categoría arriba</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productosFiltrados.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => !p.agotado && onProductoClick(p)}
                      className={`w-full bg-white rounded-3xl border border-slate-100 overflow-hidden text-left transition-all flex items-center gap-3.5 p-3.5 ${
                        p.agotado 
                          ? "opacity-50 cursor-not-allowed" 
                          : "hover:shadow-md cursor-pointer active:scale-[0.99] shadow-sm"
                      }`}>
                      
                      <div className="w-24 rounded-2xl overflow-hidden shrink-0 bg-slate-100 relative border border-slate-100 flex items-center justify-center min-h-[4.25rem]">
                        {p.imagen_url ? (
                          <img src={imgUrl(p.imagen_url, 240)} alt={p.nombre} className="w-full h-auto max-h-24 object-contain" loading="lazy" />
                        ) : (
                          <div className="w-20 h-20 flex items-center justify-center text-3xl">🍽️</div>
                        )}
                        {p.agotado && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-full bg-red-600">Agotado</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-slate-900 text-sm truncate">{p.nombre}</h4>
                          {p.destacado && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">⭐</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{p.negocio_nombre}</p>
                        <p className="font-black text-base mt-1 text-rose-600">${Number(p.precio).toFixed(2)}</p>
                      </div>

                      <button 
                        onClick={e => { e.stopPropagation(); if (!p.agotado) onAddToCart(p); }}
                        disabled={p.agotado}
                        className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm active:scale-90 transition-transform disabled:opacity-30" 
                        style={{ background: GRAD }}>
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-3">
                {negociosFiltrados.map(n => {
                  const pausado = n.aceptando_pedidos === false;
                  const distKm = n.distancia_km ?? (userLocation && n.lat && n.lng
                    ? haversineKm(userLocation[0], userLocation[1], n.lat, n.lng)
                    : null);

                  return (
                    <div 
                      key={n.id} 
                      className={`w-full bg-white rounded-3xl border border-slate-100 overflow-hidden flex items-center gap-3.5 p-3.5 shadow-sm hover:shadow-md transition-all ${
                        pausado ? "opacity-75" : ""
                      }`}>
                      <button onClick={() => onOpenNegocio(n)} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
                        <div className="w-20 rounded-2xl overflow-hidden shrink-0 relative bg-slate-100 border border-slate-100 flex items-center justify-center min-h-[3.75rem]">
                          {n.imagen_url ? (
                            <img src={imgUrl(n.imagen_url, 200)} alt={n.nombre} className="w-full h-auto max-h-20 object-contain" loading="lazy" />
                          ) : (
                            <div className="w-16 h-16 flex items-center justify-center text-3xl">🏪</div>
                          )}
                          {pausado && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
                              <span className="text-white text-[9px] font-black">PAUSADO</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-900 text-sm truncate">{n.nombre}</h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                            <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-lg border border-yellow-200/50">
                              <Star size={11} className="text-yellow-500 fill-yellow-500" />
                              <span className="text-[11px] font-black text-slate-700">{Number(n.rating || 0).toFixed(1)}</span>
                            </div>
                            {distKm !== null && (
                              <div className="flex items-center gap-0.5 text-slate-400">
                                <MapPin size={11} />
                                <span className="text-[11px]">{distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`}</span>
                              </div>
                            )}
                            {pausado ? (
                              <span className="text-[11px] font-black text-yellow-700">Pausado</span>
                            ) : (
                              <span className="text-[11px] text-slate-500">Envío ${n.costo_envio ?? n.costo_envio_base ?? 35}</span>
                            )}
                          </div>
                        </div>
                      </button>

                      <button 
                        onClick={e => { e.stopPropagation(); onToggleFavorito(n); }}
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-red-50 active:scale-90 transition-all">
                        <Heart size={18} className={favoritosIds.has(n.id) ? "fill-red-500 text-red-500" : "text-slate-300"} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </motion.div>
  );
}
