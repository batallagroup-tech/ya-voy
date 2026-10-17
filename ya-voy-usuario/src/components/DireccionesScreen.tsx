import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Home, Briefcase, Star, Plus, Pencil, Trash2, X, Check, ArrowLeft, Loader2, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getDirecciones, addDireccion, updateDireccion, setPrincipalDireccion, deleteDireccion } from "../lib/api";
import { GRAD, COLOR_CARMINE } from "../lib/constants";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
});

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

function MapMover({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng]);
  return null;
}

interface Props {
  onBack: () => void;
  onSelect?: (d: Direccion) => void;
  userId?: string;
  getToken?: () => Promise<string | null>;
}

export default function DireccionesScreen({ onBack, onSelect, userId, getToken }: Props) {
  const [direcciones, setDirecciones] = useState<Direccion[]>(() => {
    try { const d = JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]"); return Array.isArray(d) ? d : []; }
    catch { return []; }
  });
  const [loadingBD, setLoadingBD] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Direccion | null>(null);
  const [form, setForm] = useState({ label: "Casa", icono: "casa" as "casa"|"trabajo"|"otro", direccion: "", lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [sugerencias, setSugerencias] = useState<any[]>([]);

  // Cargar desde BD al montar
  useEffect(() => {
    if (!userId || !getToken) return;
    setLoadingBD(true);
    getToken().then(token => {
      if (!token) return;
      getDirecciones(userId, token)
        .then(data => {
          let activeId: string | null = null;
          let currentLocal: Direccion[] = [];
          try {
            currentLocal = JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]");
            activeId = currentLocal.find(x => x.principal)?.id || null;
          } catch {}

          const dbIds = new Set(data.map((d: any) => d.id));
          const localOnly = currentLocal.filter(d => !dbIds.has(d.id));

          const mapped: Direccion[] = data.map(d => ({
            id: d.id, 
            label: d.label, 
            icono: d.icono as Direccion["icono"],
            direccion: d.direccion, 
            lat: d.lat, 
            lng: d.lng, 
            principal: activeId ? d.id === activeId : d.principal,
          }));

          const combined = [...mapped, ...localOnly];
          if (!combined.some(x => x.principal) && combined.length > 0) {
            combined[0].principal = true;
          }

          setDirecciones(combined);
          localStorage.setItem("ya_voy_direcciones", JSON.stringify(combined));
        })
        .catch(() => {})
        .finally(() => setLoadingBD(false));
    });
  }, [userId]);

  const syncLocal = (dirs: Direccion[]) => {
    setDirecciones(dirs);
    localStorage.setItem("ya_voy_direcciones", JSON.stringify(dirs));
  };

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

  const guardar = async () => {
    if (!form.direccion.trim()) {
      toast.error("Ingresa o selecciona una dirección válida");
      return;
    }
    setSaving(true);
    try {
      if (editando) {
        if (userId && getToken) {
          const token = await getToken();
          if (token) {
            const updated = await updateDireccion(editando.id, { label: form.label, icono: form.icono, direccion: form.direccion, lat: form.lat, lng: form.lng }, token);
            syncLocal(direcciones.map(d => d.id === editando.id ? { ...d, label: updated.label, icono: updated.icono, direccion: updated.direccion, lat: updated.lat, lng: updated.lng } : d));
          }
        } else {
          syncLocal(direcciones.map(d => d.id === editando.id ? { ...d, ...form } : d));
        }
        toast.success("Dirección actualizada");
      } else {
        if (userId && getToken) {
          const token = await getToken();
          if (token) {
            const nueva = await addDireccion({ userId, label: form.label, icono: form.icono, direccion: form.direccion, lat: form.lat, lng: form.lng }, token);
            const mapped: Direccion = { id: nueva.id, label: nueva.label, icono: nueva.icono, direccion: nueva.direccion, lat: nueva.lat, lng: nueva.lng, principal: nueva.principal };
            syncLocal([...direcciones, mapped]);
          } else {
            const nueva: Direccion = { id: Date.now().toString(), ...form, principal: direcciones.length === 0 };
            syncLocal([...direcciones, nueva]);
          }
        } else {
          const nueva: Direccion = { id: Date.now().toString(), ...form, principal: direcciones.length === 0 };
          syncLocal([...direcciones, nueva]);
        }
        toast.success("Dirección guardada con éxito");
      }
    } catch (e: any) { 
      console.warn("Error guardando dirección en servidor:", e);
      // Fallback local para que el usuario no pierda su dirección
      if (editando) {
        syncLocal(direcciones.map(d => d.id === editando.id ? { ...d, ...form } : d));
      } else {
        const nueva: Direccion = { id: Date.now().toString(), ...form, principal: direcciones.length === 0 };
        syncLocal([...direcciones, nueva]);
      }
      toast.success("Dirección guardada en tu dispositivo");
    } finally { 
      setSaving(false); 
      setShowForm(false);
      setEditando(null);
      setForm({ label: "Casa", icono: "casa", direccion: "", lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    }
  };

  const setPrincipal = async (id: string) => {
    if (userId && getToken) {
      const token = await getToken();
      if (token) await setPrincipalDireccion(id, userId, token).catch(() => {});
    }
    syncLocal(direcciones.map(d => ({ ...d, principal: d.id === id })));
  };

  const eliminar = async (id: string) => {
    if (userId && getToken) {
      const token = await getToken();
      if (token) await deleteDireccion(id, token).catch(() => {});
    }
    const nuevas = direcciones.filter(d => d.id !== id);
    if (nuevas.length > 0 && !nuevas.find(d => d.principal)) nuevas[0].principal = true;
    syncLocal(nuevas);
    setShowDeleteConfirm(null);
  };

  const abrirEditar = (d: Direccion) => {
    setEditando(d);
    setForm({ label: d.label, icono: d.icono, direccion: d.direccion, lat: d.lat ?? DEFAULT_LAT, lng: d.lng ?? DEFAULT_LNG });
    setShowForm(true);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-2xs" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-sm font-black text-slate-900">Mis Direcciones de Entrega</h1>
        </div>
        {loadingBD && <Loader2 size={16} className="animate-spin text-[#9C0D38] mr-2" />}
      </div>

      {/* Address Cards List */}
      <div className="p-4 space-y-3 flex-1 pb-20">
        {direcciones.length > 0 && (
          <p className="text-[11px] text-slate-400 font-medium px-1 flex items-center justify-between">
            <span>Tus ubicaciones guardadas</span>
            <span className="text-[10px] text-slate-400 italic">Desliza a la izquierda para eliminar</span>
          </p>
        )}
        {direcciones.map(d => {
          const Icon = ICONOS[d.icono];
          return (
            <div key={d.id} className="relative overflow-hidden rounded-3xl group">
              {/* Fondo de acción al deslizar a la izquierda */}
              <div 
                onClick={() => setShowDeleteConfirm(d.id)}
                className="absolute inset-0 bg-red-500 rounded-3xl flex items-center justify-end px-5 text-white font-bold text-xs gap-1.5 cursor-pointer active:bg-red-600 transition-colors">
                <Trash2 size={18} />
                <span>Eliminar</span>
              </div>

              {/* Tarjeta deslizable */}
              <motion.div 
                layout 
                drag="x"
                dragConstraints={{ left: -90, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) {
                    setShowDeleteConfirm(d.id);
                  }
                }}
                onClick={() => onSelect?.(d)}
                className={`relative bg-white rounded-3xl p-4 flex items-center gap-3.5 border-2 shadow-sm transition-all select-none ${
                  d.principal ? "border-[#9C0D38]/80 bg-rose-50/30" : "border-slate-100"
                } ${onSelect ? "cursor-pointer active:scale-[0.99]" : ""}`}>
                
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ background: d.principal ? GRAD : "#f1f5f9" }}>
                  <Icon size={20} className={d.principal ? "text-white" : "text-slate-500"} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 text-xs">{d.label}</p>
                    {d.principal && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white shadow-2xs" style={{ background: GRAD }}>
                        PRINCIPAL
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{d.direccion}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!d.principal && (
                    <button 
                      onClick={e => { e.stopPropagation(); setPrincipal(d.id); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 transition-colors"
                      title="Marcar como principal">
                      <Star size={16} />
                    </button>
                  )}
                  <button 
                    onClick={e => { e.stopPropagation(); abrirEditar(d); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#9C0D38] hover:bg-rose-50 transition-colors"
                    title="Editar">
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={e => { e.stopPropagation(); setShowDeleteConfirm(d.id); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar">
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })}

        <button 
          onClick={() => { 
            setEditando(null); 
            setForm({ label: "Casa", icono: "casa", direccion: "", lat: DEFAULT_LAT, lng: DEFAULT_LNG }); 
            setShowForm(true); 
          }}
          className="w-full border-2 border-dashed border-slate-300 rounded-3xl p-4 flex items-center justify-center gap-2 text-slate-500 hover:border-[#9C0D38] hover:text-[#9C0D38] bg-white/50 active:scale-[0.99] transition-all text-xs font-bold shadow-2xs">
          <Plus size={18} /> Agregar nueva dirección
        </button>
      </div>

      {/* Formulario Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end backdrop-blur-sm">
            <motion.div 
              initial={{ y: 400 }} 
              animate={{ y: 0 }} 
              exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
              
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900">{editando ? "Editar dirección" : "Nueva dirección"}</h3>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <MapPin size={12} className="text-[#9C0D38]" /> Toca o arrastra el pin en el mapa
                </label>
                <div className="relative w-full h-52 rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
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
                    <MapMover lat={form.lat} lng={form.lng} />
                  </MapContainer>
                  <button
                    type="button"
                    onClick={() => { 
                      navigator.geolocation?.getCurrentPosition(pos => { 
                        handleMapClick(pos.coords.latitude, pos.coords.longitude); 
                      }, () => {}); 
                    }}
                    className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md shadow-lg rounded-2xl p-2.5 border border-slate-200 text-[#9C0D38] hover:bg-rose-50 active:scale-90 transition-all"
                    title="Mi ubicación GPS"
                  >
                    <Navigation size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">Tipo de lugar</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["casa", "trabajo", "otro"] as const).map(tipo => {
                    const Icon = ICONOS[tipo];
                    const activo = form.icono === tipo;
                    return (
                      <button 
                        key={tipo}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, icono: tipo, label: tipo === "casa" ? "Casa" : tipo === "trabajo" ? "Trabajo" : "Otro" }))}
                        className={`py-3 rounded-2xl flex flex-col items-center gap-1 text-xs font-black capitalize transition-all ${
                          activo ? "text-white shadow-sm" : "bg-slate-50 text-slate-600 border border-slate-100"
                        }`}
                        style={activo ? { background: GRAD } : {}}>
                        <Icon size={18} />
                        {tipo === "casa" ? "Casa" : tipo === "trabajo" ? "Trabajo" : "Otro"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">Nombre de la ubicación</label>
                <input 
                  value={form.label} 
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Ej: Casa, Oficina, Casa de mamá"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-200 outline-none focus:border-[#9C0D38]" 
                />
              </div>

              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block flex items-center justify-between">
                  <span>Calle y número / Referencias</span>
                  {geocoding && <span className="text-[#9C0D38] flex items-center gap-1 font-bold"><Loader2 size={10} className="animate-spin" /> Buscando...</span>}
                </label>
                <input 
                  value={form.direccion} 
                  onChange={e => { 
                    const v = e.target.value; 
                    setForm(f => ({ ...f, direccion: v })); 
                    if (v.length > 3) { 
                      clearTimeout((window as any)._gt); 
                      (window as any)._gt = setTimeout(async () => { 
                        try { 
                          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(v)}&countrycodes=mx&limit=5`); 
                          const res = await r.json(); 
                          setSugerencias(res); 
                        } catch {} 
                      }, 500); 
                    } else { 
                      setSugerencias([]); 
                    } 
                  }}
                  placeholder="Calle, número exterior, colonia o referencia"
                  className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-200 outline-none focus:border-[#9C0D38]" 
                />
                {sugerencias.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-2xl shadow-xl mt-1 overflow-hidden">
                    {sugerencias.map((s: any) => (
                      <button 
                        key={s.place_id} 
                        type="button" 
                        onClick={() => { 
                          setForm(f => ({ ...f, direccion: s.display_name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) })); 
                          setSugerencias([]); 
                        }}
                        className="w-full px-4 py-3 text-left text-xs text-slate-700 hover:bg-rose-50 border-b border-slate-100 last:border-0 truncate font-medium">
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={guardar} 
                disabled={!form.direccion.trim() || saving}
                className="w-full py-4 text-white font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-transform text-xs"
                style={{ background: GRAD }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                Guardar Dirección
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminación */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">¿Eliminar esta dirección?</h3>
                <p className="text-xs text-slate-500 mt-1">Ya no podrás seleccionarla para entregas futuras.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={() => eliminar(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl text-xs hover:bg-red-600 active:scale-95 transition-all shadow-md">
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
