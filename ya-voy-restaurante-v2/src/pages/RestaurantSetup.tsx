import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import Webcam from 'react-webcam';
import {
  Utensils, MapPin, Smartphone, Save, Check, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, Search, Camera,
  User, RefreshCw, X, FileText, Image as ImageIcon
} from 'lucide-react';
import { enviarSolicitud } from '../lib/api';
import 'leaflet/dist/leaflet.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const activeIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

const CENTER: [number, number] = [19.4326, -99.1332];

function LocationMarker({ position, setPosition }: { position: [number, number]; setPosition: (p: [number, number]) => void }) {
  const markerRef = useRef<any>(null);
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); } });
  return (
    <Marker draggable ref={markerRef} position={position} icon={activeIcon}
      eventHandlers={{ dragend() { const m = markerRef.current; if (m) { const l = m.getLatLng(); setPosition([l.lat, l.lng]); } } }} />
  );
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

interface Props {
  userId: string;
  userEmail: string;
  initialData?: any;
  onSubmit: () => void;
  onCancel?: () => void;
}

export default function RestaurantSetup({ userId, userEmail, initialData, onSubmit, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState<'restaurant' | 'store'>(initialData?.datos?.tipo_negocio === 'Tienda' ? 'store' : 'restaurant');
  const [name, setName] = useState(initialData?.datos?.nombre_negocio || '');
  const [phone, setPhone] = useState(initialData?.datos?.telefono || '');
  const [address, setAddress] = useState(initialData?.datos?.direccion || '');
  const [streetNumber, setStreetNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [location, setLocation] = useState<[number, number]>(
    initialData?.datos?.lat ? [initialData.datos.lat, initialData.datos.lng] : CENTER
  );
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [rfc, setRfc] = useState(initialData?.documentos?.rfc || '');
  const [ineFront, setIneFront] = useState<File | null>(null);
  const [ineBack, setIneBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchAddress = async (q: string) => {
    if (q.length < 3) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=mx`);
      setSuggestions(await res.json());
    } catch {} finally { setIsSearching(false); }
  };



  const detectLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setLocation([coords.latitude, coords.longitude]);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
        const d = await res.json();
        if (d.display_name) setAddress(d.display_name);
        if (d.address?.postcode) setZipCode(d.address.postcode);
      } catch {} finally { setIsLocating(false); }
    }, () => setIsLocating(false), { enableHighAccuracy: true });
  };

  const uploadToCloudinary = async (file: File | string, folder: string): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const formData = new FormData();

  if (typeof file === 'string') {
    // base64 (selfie)
    const res = await fetch(file);
    const blob = await res.blob();
    formData.append('file', blob, 'selfie.jpg');
  } else {
    formData.append('file', file);
  }

  formData.append('upload_preset', preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
  method: 'POST',
  body: formData,
});
const data = await res.json();;
if (!res.ok) throw new Error(data.error?.message || 'Error subiendo imagen');
return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!ineFront || !ineBack || !selfie) { setError('Por favor completa todos los campos incluyendo la foto.'); return; }
    setLoading(true); setError('');
    try {
      const frontUrl  = await uploadToCloudinary(ineFront, 'ine');
      const backUrl   = await uploadToCloudinary(ineBack, 'ine');
      const selfieUrl = await uploadToCloudinary(selfie, 'selfies');
      await enviarSolicitud({
        userId,
        tipo: 'negocio',
        datos: {
          nombre_negocio: name,
          tipo_negocio: businessType === 'restaurant' ? 'Restaurante' : 'Tienda',
          email: userEmail,
          telefono: phone.startsWith('+') ? phone : `+52${phone.replace(/\D/g, '')}`,
          direccion: `${address} ${streetNumber}, CP ${zipCode}`.trim(),
          lat: location[0],
          lng: location[1],
          rfc: rfc || null,
        },
        documentos: { ine_frente: frontUrl, ine_reverso: backUrl, selfie: selfieUrl, rfc: rfc || null },
      });
      onSubmit();
    } catch (e: any) {
      setError(e.message || 'Error al enviar solicitud.');
    } finally { setLoading(false); }
  };

  const steps = [
    { label: 'Tipo' }, { label: 'Info' }, { label: 'Ubicacion' },
    { label: 'Docs' }, { label: 'Foto' }
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full sm:h-auto max-w-md bg-white p-6 md:p-8 sm:rounded-3xl shadow-xl overflow-y-auto">

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-[#FF6B00]' : 'bg-slate-100'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 0 — Tipo de negocio */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">Tipo de Negocio</h1>
                <p className="text-sm text-slate-500">Que tipo de establecimiento deseas registrar?</p>
              </div>
              <div className="grid gap-4">
                {[
                  { id: 'restaurant', label: 'Restaurante', desc: 'Venta de comida preparada y platillos.', icon: Utensils },
                  { id: 'store', label: 'Tienda / Abarrotes', desc: 'Venta de productos de consumo general.', icon: Search },
                ].map(({ id, label, desc, icon: Icon }) => (
                  <button key={id} onClick={() => setBusinessType(id as any)}
                    className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${businessType === id ? 'border-[#FF6B00] bg-orange-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${businessType === id ? 'bg-[#FF6B00] text-white' : 'bg-white text-slate-400'}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                Continuar <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {/* STEP 1 — Info bsica */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 mb-1">Informacin Bsica</h1>
                  <p className="text-sm text-slate-500">Nombre de tu negocio y telfono de contacto.</p>
                </div>
                {onCancel && <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"><X size={20} /></button>}
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del negocio</label>
                  <div className="relative">
                    <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: La Parrilla de Juan"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none text-sm font-medium" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telfono</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="55 1234 5678"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none text-sm font-medium" />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1 uppercase font-bold tracking-wider">No es necesario poner +52</p>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(0)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                  <ChevronLeft size={20} /> Atrs
                </button>
                <button onClick={() => setStep(2)} disabled={!name || !phone}
                  className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50">
                  Siguiente <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Ubicacin */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">Ubicacin</h1>
                <p className="text-sm text-slate-500">Escribe tu direccin y confirma en el mapa.</p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={address} onChange={e => { setAddress(e.target.value); if (e.target.value.length < 3) setSuggestions([]); }}
                    placeholder="Calle / Avenida"
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none text-sm font-medium" />
                  <button onClick={() => searchAddress(address)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                    {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => { setAddress(s.display_name); setLocation([parseFloat(s.lat), parseFloat(s.lon)]); setSuggestions([]); }}
                        className="w-full p-3 text-left hover:bg-orange-50 border-b border-slate-50 last:border-none text-xs text-slate-600 font-medium">
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="Nmero (Ext/Int)"
                    className="px-4 py-3.5 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none text-sm font-medium" />
                  <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Cdigo Postal"
                    className="px-4 py-3.5 bg-slate-50 rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none text-sm font-medium" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirma en el mapa</label>
                  <div className="flex gap-2">
                    <button onClick={detectLocation} disabled={isLocating}
                      className="text-[10px] font-black uppercase px-3 py-1 bg-orange-100 rounded-full text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-all flex items-center gap-1">
                      {isLocating ? <Loader2 className="animate-spin" size={10} /> : <MapPin size={10} />} Mi ubicacin
                    </button>
                    <button onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
                      className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 rounded-full text-slate-500 hover:bg-[#FF6B00] hover:text-white transition-all">
                      {mapType === 'streets' ? 'Satlite' : 'Calles'}
                    </button>
                  </div>
                </div>
                <div className="h-[220px] rounded-3xl overflow-hidden border border-slate-100">
                  <MapContainer center={location} zoom={15} style={{ height: '100%', width: '100%' }}>
                    {mapType === 'streets'
                      ? <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      : <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' />}
                    <MapUpdater center={location} />
                    <LocationMarker position={location} setPosition={setLocation} />
                  </MapContainer>
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                  <ChevronLeft size={20} /> Atrs
                </button>
                <button onClick={() => setStep(3)} disabled={!address}
                  className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50">
                  Siguiente <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Documentos */}
{step === 3 && (
  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
    <div>
      <h1 className="text-2xl font-black text-slate-900 mb-1">Documentacin</h1>
      <p className="text-sm text-slate-500">Sube fotos de tu INE por ambos lados.</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {[
        { label: 'INE Frente', file: ineFront, setFile: setIneFront, id: 'ine-front' },
        { label: 'INE Reverso', file: ineBack, setFile: setIneBack, id: 'ine-back' },
      ].map(({ label, file, setFile, id }) => (
        <div key={id} className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
          <div className={`flex flex-col items-center justify-center h-36 border-2 border-dashed rounded-2xl transition-all ${file ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
            {file ? (
              <div className="flex flex-col items-center gap-2 p-2 w-full">
                <Check className="text-green-500" size={24} />
                <span className="text-[10px] text-green-600 font-bold truncate max-w-[90%] text-center">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-[10px] text-red-400 font-bold hover:text-red-600"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 w-full px-2">
                <ImageIcon className="text-slate-300" size={24} />
                <span className="text-[10px] text-slate-400 font-bold text-center">{label}</span>
                <div className="flex gap-2 w-full">
                  <label className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all text-[10px] font-bold text-slate-500">
                    <input type="file" className="hidden" accept="image/*" capture="environment"
                      onChange={e => setFile(e.target.files?.[0] || null)} />
                    📷 Foto
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all text-[10px] font-bold text-slate-500">
                    <input type="file" className="hidden" accept="image/*"
                      onChange={e => setFile(e.target.files?.[0] || null)} />
                    🖼️ Galera
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* RFC */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-between ml-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">RFC <span className="text-slate-400 normal-case font-medium">(Opcional)</span></label>
        {rfc.length > 0 && (
          <span className={`text-xs font-bold ${rfc.length === 12 || rfc.length === 13 ? 'text-green-500' : 'text-red-400'}`}>
            {rfc.length}/13
          </span>
        )}
      </div>
      <div className="relative">
        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={rfc}
          onChange={e => {
            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9&]/g, '');
            if (val.length <= 13) setRfc(val);
          }}
          placeholder="Ej: XAXX010101000"
          maxLength={13}
          className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-2xl outline-none text-sm font-medium transition-all ${
            rfc.length === 0 ? 'focus:ring-2 focus:ring-[#FF6B00]'
            : rfc.length === 12 || rfc.length === 13 ? 'ring-2 ring-green-400'
            : 'ring-2 ring-red-300'
          }`}
        />
      </div>
      {rfc.length > 0 && rfc.length < 12 && (
        <p className="text-[11px] text-red-400 font-bold ml-1">El RFC debe tener 12 o 13 caracteres</p>
      )}
      {(rfc.length === 12 || rfc.length === 13) && (
        <p className="text-[11px] text-green-500 font-bold ml-1">✓ RFC vlido</p>
      )}
    </div>

    {error && (
      <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">{error}</p>
    )}

    <div className="flex gap-4 pt-2">
      <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
        <ChevronLeft size={20} /> Atrs
      </button>
      <button onClick={() => setStep(4)} disabled={!ineFront || !ineBack || (rfc.length > 0 && rfc.length < 12)}
        className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50">
        Siguiente <ChevronRight size={20} />
      </button>
    </div>
  </motion.div>
)}
          {/* STEP 4 — Selfie */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900 mb-1">Verificacin Facial</h1>
                <p className="text-sm text-slate-500">Tmate una foto para confirmar tu identidad.</p>
              </div>
              <div className="relative aspect-[3/4] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 flex items-center justify-center">
                {selfie ? (
                  <div className="relative w-full h-full">
                    <img src={selfie} alt="Selfie" className="w-full h-full object-cover" />
                    <button onClick={() => { setSelfie(null); setShowWebcam(true); }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 shadow-lg">
                      <RefreshCw size={14} /> Repetir foto
                    </button>
                  </div>
                ) : showWebcam ? (
                  <div className="relative w-full h-full">
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user' }} className="w-full h-full object-cover" mirrored />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[80%] h-[80%] border-4 border-white/50 border-dashed rounded-[100px] flex items-center justify-center">
                        <User size={120} className="text-white/30" />
                      </div>
                    </div>
                    <button onClick={() => { const img = webcamRef.current?.getScreenshot(); if (img) { setSelfie(img); setShowWebcam(false); } }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-200 shadow-xl flex items-center justify-center">
                      <div className="w-12 h-12 bg-[#FF6B00] rounded-full" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera size={32} className="text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium mb-6">Necesitamos una foto para verificacin de identidad.</p>
                    <button onClick={() => setShowWebcam(true)}
                      className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto">
                      <Camera size={18} /> Abrir cmara
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3">
                <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                <p className="text-orange-700 text-xs font-bold uppercase tracking-wider leading-relaxed">
                  Asegurate de que tu rostro este bien iluminado y dentro de la silueta.
                </p>
              </div>
              {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">{error}</p>}
              <div className="flex gap-4 pt-2">
                <button onClick={() => setStep(3)} disabled={loading} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                  <ChevronLeft size={20} /> Atrs
                </button>
                <button onClick={handleSubmit} disabled={loading || !selfie}
                  className="flex-[2] py-4 bg-[#FF6B00] hover:bg-[#E65F00] text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg">
                  {loading ? <><Loader2 className="animate-spin" size={24} /> Enviando...</> : <><Save size={24} /> Enviar Solicitud</>}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
