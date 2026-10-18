import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { setStatusBarDark } from "../lib/statusBar";
import { motion, AnimatePresence } from "motion/react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation, MapPin, CreditCard, Banknote, Check, ArrowRight, Loader2, ShoppingBag } from "lucide-react";
import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const pinIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41],
});

const GRAD = "linear-gradient(135deg, #9C0D38 0%, #7A0A2C 50%, #9C0D38 100%)";
const CENTER: [number, number] = [19.9342, -97.9612];

function DraggablePin({ position, setPosition }: { position: [number,number]; setPosition: (p:[number,number]) => void }) {
  const markerRef = useRef<any>(null);
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  return (
    <Marker draggable ref={markerRef} position={position} icon={pinIcon}
      eventHandlers={{ dragend() { const m = markerRef.current; if (m) { const l = m.getLatLng(); setPosition([l.lat, l.lng]); } } }} />
  );
}

function MapUpdater({ center }: { center: [number,number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 16); }, [center]);
  return null;
}

interface OnboardingProps {
  userName: string;
  onDone: (data: { location: [number,number]; address: string; pago: string; realName: string; phone: string }) => void;
}

export default function OnboardingFlow({ userName, onDone }: OnboardingProps) {
  useLayoutEffect(() => { setStatusBarDark(); }, []);
  const [step, setStep] = useState(0);
  const [realName, setRealName] = useState(userName !== "amigo" ? userName : "");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");

  const [location, setLocation] = useState<[number,number]>(CENTER);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [pago, setPago] = useState("efectivo");

  const [cardError, setCardError] = useState("");
  const [tcAceptado, setTcAceptado] = useState(false);

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: [number,number] = [pos.coords.latitude, pos.coords.longitude];
        setLocation(coords);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`);
          const d = await r.json();
          setAddress(d.display_name?.split(",").slice(0,3).join(", ") || "Mi ubicación");
        } catch { setAddress("Mi ubicación"); }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const updateAddressFromPin = async (coords: [number,number]) => {
    setLocation(coords);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[0]}&lon=${coords[1]}`);
      const d = await r.json();
      setAddress(d.display_name?.split(",").slice(0,3).join(", ") || "Ubicación seleccionada");
    } catch { setAddress("Ubicación seleccionada"); }
  };

  const handleConfirmName = () => {
    if (!realName.trim()) {
      setNameError("Por favor ingresa tu nombre completo real.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setNameError("El número de teléfono es obligatorio (10 dígitos) para contactarte en tus entregas.");
      return;
    }
    setNameError("");
    setStep(1);
  };

  const confirmLocation = () => {
    setLocationConfirmed(true);
    setTimeout(() => setStep(2), 500);
  };

  const handleNextPayment = () => {
    setStep(3);
  };

  const handleDone = () => {
    onDone({ location, address: address || "Mi ubicación", pago, realName: realName.trim(), phone: phone.trim() });
  };

  const steps = ["Datos", "Ubicación", "Pago", "¡Listo!"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col" style={{ background: GRAD, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Progress */}
      <div className="flex gap-2 px-6 pt-12 pb-4 shrink-0">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-white" : "bg-white/30"}`} />
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">

          {/* PASO 0 — DATOS PERSONALES */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col justify-between px-6 pb-6 pt-4">
              <div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
                  <ShoppingBag size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">¡Bienvenido a Ya Voy! 👋</h1>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  Para asegurarnos de entregar tus pedidos correctamente, confirma tu nombre real y un teléfono de contacto.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1">Nombre Completo Real</label>
                    <input 
                      type="text" 
                      value={realName} 
                      onChange={e => setRealName(e.target.value)} 
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:border-white font-medium text-sm backdrop-blur" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1">Teléfono Móvil (10 dígitos)</label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="Ej. 7971234567"
                      maxLength={10}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:border-white font-medium text-sm backdrop-blur" 
                    />
                  </div>
                </div>

                {nameError && (
                  <div className="mt-3 p-3 bg-red-500/30 border border-red-300/40 rounded-xl text-white text-xs font-bold text-center">
                    {nameError}
                  </div>
                )}
              </div>

              <button onClick={handleConfirmName}
                className="w-full bg-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-base mt-6 shadow-xl" style={{ color: "#9C0D38" }}>
                Siguiente Paso <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* PASO 1 — UBICACIÓN */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pb-3 shrink-0">
                <h1 className="text-2xl font-black text-white mb-1">Hola, {realName || userName} 👋</h1>
                <p className="text-white/70 text-sm">Mueve el pin exactamente donde quieres tu entrega.</p>
              </div>

              {/* Mapa */}
              <div className="flex-1 mx-4 rounded-3xl overflow-hidden border-2 border-white/30 min-h-[280px]">
                <MapContainer center={location} zoom={15} style={{ height: "100%", width: "100%", minHeight: 280 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <MapUpdater center={location} />
                  <DraggablePin position={location} setPosition={updateAddressFromPin} />
                </MapContainer>
              </div>

              {address && (
                <div className="mx-4 mt-3 bg-white/20 backdrop-blur rounded-2xl p-3 flex items-center gap-2 shrink-0">
                  <MapPin size={16} className="text-white shrink-0" />
                  <p className="text-white text-xs font-medium line-clamp-2">{address}</p>
                </div>
              )}

              <div className="px-4 pb-4 pt-3 space-y-2 shrink-0">
                <button onClick={detectLocation} disabled={locating}
                  className="w-full bg-white/20 backdrop-blur py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 border border-white/30">
                  {locating ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
                  {locating ? "Detectando..." : "Usar mi ubicación actual"}
                </button>
                <button onClick={confirmLocation}
                  className="w-full bg-white py-4 rounded-2xl font-black flex items-center justify-center gap-2" style={{ color: "#9C0D38" }}>
                  Confirmar este punto <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* PASO 2 — PAGO */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col overflow-y-auto px-6 pb-6">
              <div className="mb-6 shrink-0">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
                  <CreditCard size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-white mb-1">¿Cómo pagas?</h1>
                <p className="text-white/70 text-sm">Puedes cambiarlo en cada pedido o agregar tu tarjeta ahora.</p>
              </div>

              <div className="space-y-3 mb-4">
                {[
                  { id: "efectivo", label: "Efectivo", desc: "Paga al repartidor al recibir", icon: Banknote },
                  { id: "tarjeta", label: "Tarjeta de Débito / Crédito", desc: "Pago en línea 100% seguro con cifrado bancario", icon: CreditCard },
                ].map(({ id, label, desc, icon: Icon }) => (
                  <button key={id} onClick={() => { setPago(id); setCardError(""); }}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all ${pago === id ? "bg-white" : "bg-white/20 backdrop-blur border border-white/30"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pago === id ? "text-white" : "bg-white/20 text-white"}`}
                      style={pago === id ? { background: GRAD } : {}}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-black text-sm ${pago === id ? "text-slate-900" : "text-white"}`}>{label}</p>
                      <p className={`text-xs ${pago === id ? "text-slate-500" : "text-white/60"}`}>{desc}</p>
                    </div>
                    {pago === id && <Check size={18} className="text-rose-600" />}
                  </button>
                ))}
              </div>

              {pago === "tarjeta" && (
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <CreditCard size={20} className="text-white shrink-0" />
                  <p className="text-white text-xs">Tu tarjeta se guarda de forma encriptada y segura con estándares bancarios al realizar tu primer pedido.</p>
                </div>
              )}

              <button onClick={handleNextPayment}
                className="w-full bg-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 mt-auto" style={{ color: "#9C0D38" }}>
                Continuar <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* PASO 3 — LISTO */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                <span className="text-5xl">🎉</span>
              </motion.div>
              <h1 className="text-3xl font-black text-white mb-2">¡Todo listo, {realName.split(" ")[0]}!</h1>
              <p className="text-white/80 text-sm mb-6">Tu perfil está configurado correctamente</p>
              
              <div className="bg-white/20 backdrop-blur rounded-2xl p-4 w-full text-left space-y-2 mb-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-white shrink-0" />
                  <p className="text-white text-xs font-bold">{realName} {phone ? `(${phone})` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-white shrink-0" />
                  <p className="text-white text-xs line-clamp-1">{address || "Ubicación configurada"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {pago === "efectivo" ? <Banknote size={16} className="text-white" /> : <CreditCard size={16} className="text-white" />}
                  <p className="text-white text-xs">{pago === "efectivo" ? "Pago en efectivo" : "Tarjeta de débito/crédito protegida"}</p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer mb-4">
                <input type="checkbox" checked={tcAceptado} onChange={e => setTcAceptado(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded accent-rose-600 shrink-0 cursor-pointer" />
                <span className="text-white/80 text-xs leading-relaxed text-left">
                  He leído y acepto los{" "}
                  <a href="https://batallagroup-tech.github.io/ya-voy/terminos" target="_blank" rel="noopener noreferrer"
                    className="underline font-bold text-white">Términos y Condiciones</a>{" "}
                  y la{" "}
                  <a href="https://batallagroup-tech.github.io/ya-voy/privacidad" target="_blank" rel="noopener noreferrer"
                    className="underline font-bold text-white">Política de Privacidad</a>.
                </span>
              </label>

              <button onClick={handleDone} disabled={!tcAceptado}
                className="w-full bg-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40 shadow-xl" style={{ color: "#9C0D38" }}>
                <ShoppingBag size={22} /> ¡Empezar a pedir!
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {step < 3 && (
        <button onClick={() => setStep(prev => Math.min(prev + 1, 3))}
          className="text-white/50 text-xs font-bold pb-4 text-center hover:text-white/80 transition-colors shrink-0">
          Omitir por ahora
        </button>
      )}
    </motion.div>
  );
}
