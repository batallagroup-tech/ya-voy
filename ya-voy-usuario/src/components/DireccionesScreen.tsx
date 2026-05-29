import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Home, Briefcase, Star, Plus, Pencil, Trash2, X, Check, ArrowLeft, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GRAD = "linear-gradient(135deg, #6C3CE1 0%, #9B59B6 50%, #E91E8C 100%)";
const DEFAULT_LAT = 19.9342;
const DEFAULT_LNG = -97.9612;

export interface Direccion {
  id: string;
  label: string;
  icono: "casa" | "trabajo" | "otro";
  direccion: string;
  lat?: number;
  lng?: number;
  principal?: boolean;
}

const ICONOS = { casa: Home, trabajo: Briefcase, otro: Star };

function PinHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMove(e.latlng.lat, e.latlng.lng); } });
  return null;
}

interface Props {
  onBack: () => void;
  onSelect?: (d: Direccion) => void;
}

export default function DireccionesScreen({ onBack, onSelect }: Props) {
  const [direcciones, setDirecciones] = useState<Direccion[]>(() => {
    try { return JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]"); }
    catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Direccion | null>(null);
  const [form, setForm] = useState({ label: "Casa", icono: "casa" as "casa"|"trabajo"|"otro", direccion: "", lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [sugerencias, setSugerencias] = useState<any[]>([]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const d = await r.json();
      if (d.display_name) setForm(f => ({ ...f, direccion: d.display_name, lat, lng }));
      else setForm(f => ({ ...f, lat, lng }));
    } catch { setForm(f => ({ ...f, lat, lng })); }
    finally { setGeocoding(false); }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setForm(f => ({ ...f, lat, lng }));
    reverseGeocode(lat, lng);
  };

  useEffect(() => {
    if (!showForm) return;
    if (editando?.lat && editando?.lng) {
      setForm(f => ({ ...f, lat: editando.lat!, lng: editando.lng! }));
    } else {
      navigator.geolocation?.getCurrentPosition(
        pos => setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
        () => {}
      );
    }
  }, [showForm]);

  const save = (dirs: Direccion[]) => {
    setDirecciones(dirs);
    localStorage.setItem("ya_voy_direcciones", JSON.stringify(dirs));
  };

  const guardar = () => {
    if (!form.direccion.trim()) return;
    if (editando) {
      save(direcciones.map(d => d.id === editando.id ? { ...d, ...form } : d));
    } else {
      const nueva: Direccion = { id: Date.now().toString(), ...form, principal: direcciones.length === 0 };
      save([...direcciones, nueva]);
    }
    setShowForm(false);
    setEditando(null);
    setForm({ label: "Casa", icono: "casa", direccion: "", lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  };

  const setPrincipal = (id: string) => save(direcciones.map(d => ({ ...d, principal: d.id === id })));

  const eliminar = (id: string) => {
    const nuevas = direcciones.filter(d => d.id !== id);
    if (nuevas.length > 0 && !nuevas.find(d => d.principal)) nuevas[0].principal = true;
    save(nuevas);
    setShowDeleteConfirm(null);
  };

  const abrirEditar = (d: Direccion) => {
    setEditando(d);
    setForm({ label: d.label, icono: d.icono, direccion: d.direccion, lat: d.lat ?? DEFAULT_LAT, lng: d.lng ?? DEFAULT_LNG });
    setShowForm(true);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-black text-slate-900">Mis direcciones</h1>
      </div>

      <div className="p-4 space-y-3">
        {direcciones.map(d => {
          const Icon = ICONOS[d.icono];
          return (
            <motion.div key={d.id} layout onClick={() => onSelect?.(d)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all ${d.principal ? "border-purple-500" : "border-slate-100"} ${onSelect ? "cursor-pointer" : ""}`}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: d.principal ? GRAD : "#f1f5f9" }}>
                <Icon size={20} className={d.principal ? "text-white" : "text-slate-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-900">{d.label}</p>
                  {d.principal && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: GRAD }}>PRINCIPAL</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{d.direccion}</p>
              </div>
              {!onSelect && (
                <div className="flex items-center gap-1">
                  {!d.principal && (
                    <button onClick={e => { e.stopPropagation(); setPrincipal(d.id); }}
                      className="p-2 text-slate-300 hover:text-purple-600 transition-colors">
                      <Star size={16} />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); abrirEditar(d); }}
                    className="p-2 text-slate-300 hover:text-purple-600 transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(d.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
        <button onClick={() => { setEditando(null); setForm({ label: "Casa", icono: "casa", direccion: "", lat: DEFAULT_LAT, lng: DEFAULT_LNG }); setShowForm(true); }}
          className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:border-purple-400 hover:text-purple-600 transition-all">
          <Plus size={18} /> Nueva dirección
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">{editando ? "Editar dirección" : "Nueva dirección"}</h3>
                <button onClick={() => setShowForm(false)}><X size={22} className="text-slate-400" /></button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  <MapPin size={12} className="inline mr-1" />Toca el mapa para marcar tu ubicacion
                </label>
                <div className="relative w-full h-52 rounded-2xl overflow-hidden border-2 border-slate-100">
                  <MapContainer
                    center={[form.lat, form.lng]}
                    zoom={16}
                    style={{ width: "100%", height: "100%" }}
                    zoomControl={false}
                    key={`map-${showForm}`}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker
                      position={[form.lat, form.lng]}
                      draggable
                      eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); handleMapClick(p.lat, p.lng); } }}
                    />
                    <PinHandler onMove={handleMapClick} />
                  </MapContainer>
                  <button
                    type="button"
                    onClick={() => { navigator.geolocation?.getCurrentPosition(pos => { handleMapClick(pos.coords.latitude, pos.coords.longitude); }, () => {}); }}
                    className="absolute bottom-3 right-3 z-[1000] bg-white shadow-lg rounded-xl p-2 border border-slate-200 hover:bg-purple-50 transition-all"
                    title="Ir a mi ubicacion"
                  >
                    <MapPin size={18} className="text-purple-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo</label>
                <div className="flex gap-2">
                  {(["casa", "trabajo", "otro"] as const).map(tipo => {
                    const Icon = ICONOS[tipo];
                    return (
                      <button key={tipo}
                        onClick={() => setForm(f => ({ ...f, icono: tipo, label: tipo === "casa" ? "Casa" : tipo === "trabajo" ? "Trabajo" : "Otro" }))}
                        className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-bold capitalize transition-all ${form.icono === tipo ? "text-white" : "bg-slate-100 text-slate-500"}`}
                        style={form.icono === tipo ? { background: GRAD } : {}}>
                        <Icon size={18} />
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nombre</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Ej: Casa, Trabajo, Casa de mama"
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400" />
              </div>

              <div className="relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Direccion {geocoding && <Loader2 size={12} className="inline animate-spin text-purple-400 ml-1" />}
                </label>
                <input value={form.direccion} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, direccion: v })); if (v.length > 3) { clearTimeout((window as any)._gt); (window as any)._gt = setTimeout(async () => { try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(v)}&countrycodes=mx&limit=5`); const res = await r.json(); setSugerencias(res); } catch {} }, 500); } else { setSugerencias([]); } }}
                  placeholder="Escribe una direccion o toca el mapa"
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400" />
                {sugerencias.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                    {sugerencias.map((s: any) => (
                      <button key={s.place_id} type="button" onClick={() => { setForm(f => ({ ...f, direccion: s.display_name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) })); setSugerencias([]); }}
                        className="w-full px-4 py-3 text-left text-xs text-slate-700 hover:bg-purple-50 border-b border-slate-100 last:border-0 truncate">
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={guardar} disabled={!form.direccion.trim()}
                className="w-full py-4 text-white font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: GRAD }}>
                <Check size={18} /> Guardar direccion
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">¿Eliminar dirección?</h3>
              <p className="text-sm text-slate-500 mb-6">Esta accion no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancelar</button>
                <button onClick={() => eliminar(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl">Eliminar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

