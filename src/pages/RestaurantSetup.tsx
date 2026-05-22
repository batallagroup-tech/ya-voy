import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Utensils, MapPin, Phone, Save, Upload, Check, 
  AlertCircle, Smartphone, Map as MapIcon, Image as ImageIcon,
  FileText, ChevronRight, ChevronLeft, Mail, Loader2, Search,
  Camera, User, RefreshCw, X, CheckCircle2
} from 'lucide-react';
import Webcam from 'react-webcam';
import { useMap } from 'react-leaflet';
import { sql } from '../lib/db';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
});

const activeIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const mapContainerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '1.5rem',
  zIndex: 0
};

const center: [number, number] = [19.4326, -99.1332];

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  const markerRef = React.useRef<any>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
        }
      },
    }),
    [setPosition],
  );

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker 
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={activeIcon}
    />
  )
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function RestaurantSetup({ initialData, onCancelReapply }: { initialData?: any, onCancelReapply?: () => void }) {
  const [step, setStep] = useState(0);
  const { userId } = useAuth();
  const [businessType, setBusinessType] = useState<'restaurant' | 'store'>(initialData?.type || 'restaurant');
  const [name, setName] = useState(initialData?.nombre || '');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState(initialData?.direccion || '');
  const [streetNumber, setStreetNumber] = useState(initialData?.streetNumber || '');
  const [zipCode, setZipCode] = useState(initialData?.zipCode || '');
  const [location, setLocation] = useState<[number, number]>(
    initialData?.location ? [initialData.location.latitude, initialData.location.longitude] : center
  );
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [phone, setPhone] = useState(initialData?.telefono || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(initialData?.phoneVerified || false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [rfc, setRfc] = useState(initialData?.rfc || '');
  const [ineFront, setIneFront] = useState<File | null>(null);
  const [ineBack, setIneBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<string | null>(initialData?.selfieUrl || null);
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = React.useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setContactEmail(user.email);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.nombre || '');
      setContactEmail(initialData.email || auth.currentUser?.email || '');
      setAddress(initialData.direccion || '');
      setStreetNumber(initialData.streetNumber || '');
      setZipCode(initialData.zipCode || '');
      if (initialData.location) {
        setLocation([initialData.location.latitude, initialData.location.longitude]);
      }
      setPhone(initialData.telefono || '');
      setIsPhoneVerified(initialData.phoneVerified || false);
      setRfc(initialData.rfc || '');
      if (initialData.selfieUrl) setSelfie(initialData.selfieUrl);
    }
  }, [initialData]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (address.length >= 3 && !isSearching) {
        searchAddress(address);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [address]);

  const searchAddress = async (query: string) => {
    const fullQuery = `${query} ${streetNumber} ${zipCode}`.trim();
    if (!fullQuery || fullQuery.length < 3) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=5&countrycodes=mx`);
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Error searching address:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada por tu navegador.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation([latitude, longitude]);
        
        // Reverse geocode to get address
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          if (data.display_name) {
            setAddress(data.display_name);
            if (data.address?.postcode) {
              setZipCode(data.address.postcode);
            }
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error('Error getting location:', err);
        setError('No pudimos obtener tu ubicación. Por favor actívala en tu navegador.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    setLocation([lat, lon]);
    
    // Try to extract parts if possible, but for now just set the display name
    setAddress(suggestion.display_name);
    
    // If suggestion has postcode, set it
    if (suggestion.address?.postcode) {
      setZipCode(suggestion.address.postcode);
    }

    setSuggestions([]);
    setHasSearched(false);
  };

  const getFormattedPhone = (p: string) => {
    const cleaned = p.replace(/\D/g, '');
    if (p.startsWith('+')) {
      return p.replace(/[^\d+]/g, '');
    }
    return `+52${cleaned}`;
  };

  const handleStartVerification = async () => {
    const formattedPhone = getFormattedPhone(phone);
    if (!phone || formattedPhone.length < 10) {
      setError('Ingresa un número de teléfono válido (10 dígitos).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      console.log('Iniciando verificación para:', formattedPhone);
      const res = await fetch('/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el código.');
      }
      
      setVerificationSent(true);
      if (data.mocked) {
        setInfoMessage('MODO PRUEBA ACTIVADO: Usa el código 190506');
      }
      console.log('Verificación iniciada correctamente');
    } catch (err: any) {
      console.error('Verification Start Error:', err);
      setError('Error al enviar código: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!verificationCode) return;
    const formattedPhone = getFormattedPhone(phone);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone, code: verificationCode })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al validar el código.');
      }

      const data = await res.json();
      if (data.valid) {
        setIsPhoneVerified(true);
        setInfoMessage('¡Teléfono verificado con éxito!');
        // Small delay before clearing the code input to show success
        setTimeout(() => {
          setVerificationCode('');
        }, 1000);
      } else {
        setError('Código incorrecto o expirado.');
        setVerificationCode('');
      }
    } catch (err: any) {
      console.error('Verification Check Error:', err);
      setError('Error al verificar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (verificationCode.length === 6 && !isPhoneVerified && !loading) {
      handleCheckVerification();
    }
  }, [verificationCode, isPhoneVerified, loading]);

  const handleFileUpload = async (file: File | string, path: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user authenticated');

    const fileName = `${Date.now()}_${path}`;
    const filePath = `${user.id}/${fileName}`;
    
    let fileBody: any;
    if (typeof file === 'string') {
      const response = await fetch(file);
      fileBody = await response.blob();
    } else {
      fileBody = file;
    }

    const { data, error } = await supabase.storage
      .from('verifications')
      .upload(filePath, fileBody, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Error subiendo archivo ${path}: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('verifications')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  if (e && e.preventDefault) e.preventDefault();
  if (!ineFront || !ineBack || !selfie) {
    setError('Por favor completa todos los campos, incluyendo el selfie.');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // Subir archivos a Supabase Storage (solo para storage, no auth)
    const frontUrl  = await handleFileUpload(ineFront, 'ine_front');
    const backUrl   = await handleFileUpload(ineBack,  'ine_back');
    const selfieUrl = await handleFileUpload(selfie,   'selfie_verification');

    // Insertar en Neon con la estructura que espera el dashboard
    await sql`
      INSERT INTO solicitudes (usuario_id, tipo, status, datos, documentos)
      VALUES (
        ${userId},
        'negocio',
        'pendiente',
        ${JSON.stringify({
          nombre_negocio: name,
          tipo_negocio:   businessType === 'restaurant' ? 'Restaurante' : 'Tienda',
          email:          contactEmail,
          telefono:       getFormattedPhone(phone),
          direccion:      `${address} ${streetNumber}, CP ${zipCode}`.trim(),
          lat:            location[0],
          lng:            location[1],
          rfc:            rfc || null,
        })},
        ${JSON.stringify({
          ine_frente: frontUrl,
          ine_reverso: backUrl,
          selfie:      selfieUrl,
          rfc:         rfc || null,
        })}
      )
    `;

    setIsSubmitted(true);
  } catch (err: any) {
    console.error('Error guardando solicitud:', err);
    setError('Error al guardar: ' + (err.message || 'Revisa tu conexión.'));
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto no-scrollbar">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full sm:h-auto max-w-md bg-white p-6 md:p-8 sm:rounded-3xl shadow-xl border-none sm:border border-slate-100 overflow-y-auto no-scrollbar"
      >
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={40} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900">¡Registro Enviado!</h1>
              <p className="text-slate-500">Estamos revisando tu información. Te notificaremos en cuanto tu restaurante sea verificado.</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Próximos pasos:</p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full" />
                  Validación de documentos (INE/RFC)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full" />
                  Verificación de identidad facial
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full" />
                  Activación de tu perfil en la app
                </li>
              </ul>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Esta ventana se actualizará automáticamente una vez verificado.</p>
          </motion.div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="flex gap-2 mb-8">
              {[0, 1, 2, 3, 4].map((s) => (
                <div 
                  key={s} 
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    step >= s ? 'bg-[#FF6B00]' : 'bg-slate-100'
                  }`} 
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-1">Tipo de Negocio</h1>
                <p className="text-sm text-slate-500">¿Qué tipo de establecimiento deseas registrar?</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  type="button"
                  onClick={() => setBusinessType('restaurant')}
                  className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${
                    businessType === 'restaurant' 
                      ? 'border-[#FF6B00] bg-orange-50' 
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    businessType === 'restaurant' ? 'bg-[#FF6B00] text-white' : 'bg-white text-slate-400'
                  }`}>
                    <Utensils size={24} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Restaurante</p>
                    <p className="text-xs text-slate-500">Venta de comida preparada y platillos.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBusinessType('store')}
                  className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${
                    businessType === 'store' 
                      ? 'border-[#FF6B00] bg-orange-50' 
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    businessType === 'store' ? 'bg-[#FF6B00] text-white' : 'bg-white text-slate-400'
                  }`}>
                    <Search size={24} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">Tienda / Abarrotes</p>
                    <p className="text-xs text-slate-500">Venta de productos de consumo general.</p>
                  </div>
                </button>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                >
                  Continuar
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 mb-1">Información Básica</h1>
                  <p className="text-sm text-slate-500">Comencemos con el nombre, correo y tu teléfono.</p>
                </div>
                {onCancelReapply && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCancelReapply();
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Nombre del Restaurante</label>
                  <div className="relative">
                    <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-sm"
                      placeholder="Ej: La Parrilla de Juan"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-sm"
                      placeholder="restaurante@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Teléfono (WhatsApp)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={verificationSent || isPhoneVerified}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-sm disabled:opacity-50"
                        placeholder="55 1234 5678"
                        required
                      />
                      {isPhoneVerified && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Verificado</span>
                        </div>
                      )}
                    </div>
                    {!verificationSent && !isPhoneVerified && (
                      <button
                        type="button"
                        onClick={handleStartVerification}
                        disabled={!phone || loading}
                        className="px-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                      >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        Verificar
                      </button>
                    )}
                    {isPhoneVerified && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPhoneVerified(false);
                          setVerificationSent(false);
                          setVerificationCode('');
                        }}
                        className="px-3 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Cambiar número"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1 uppercase font-bold tracking-wider">No es necesario poner +52</p>
                </div>

                {verificationSent && !isPhoneVerified && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 bg-orange-50 p-5 rounded-3xl border border-orange-100 shadow-inner"
                  >
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Código de Verificación</label>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 6) {
                            setVerificationCode(val);
                            if (error) setError('');
                          }
                        }}
                        disabled={loading || isPhoneVerified}
                        className="w-full px-4 py-3.5 bg-white border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-center tracking-[0.5em] text-lg disabled:opacity-50"
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                      />
                      {!isPhoneVerified && (
                        <div className="flex justify-center">
                          {loading ? (
                            <div className="flex items-center gap-2 text-[#FF6B00] font-bold text-sm py-2">
                              <Loader2 className="animate-spin" size={16} />
                              Verificando...
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest py-2">
                              Ingresa los 6 dígitos para verificar automáticamente
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {error && error.includes('Código') && (
                      <p className="text-[10px] text-red-500 font-bold text-center animate-bounce">
                        {error}
                      </p>
                    )}
                    <div className="flex items-center justify-between px-1">
                      <button 
                        onClick={() => {
                          setVerificationSent(false);
                          setVerificationCode('');
                          setError('');
                          setInfoMessage('');
                        }}
                        className="text-xs text-slate-400 font-bold hover:text-slate-600"
                      >
                        Cambiar número
                      </button>
                      {infoMessage && (
                        <span className="text-[10px] text-orange-600 font-black animate-pulse">MODO PRUEBA ACTIVO</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {infoMessage && step === 1 && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-blue-700 text-sm font-medium">
                    {infoMessage}
                  </p>
                </div>
              )}

              {error && step === 1 && (
                <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">
                  {error}
                </p>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <ChevronLeft size={20} />
                  Atrás
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!name || !contactEmail || !isPhoneVerified}
                  className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                >
                  Siguiente paso
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-1">Ubicación</h1>
                <p className="text-sm text-slate-500">Escribe tu dirección y confirma en el mapa.</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Calle / Avenida</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (e.target.value.length < 3) setSuggestions([]);
                        }}
                        className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-sm"
                        placeholder="Ej: Av. Reforma"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => searchAddress(address)}
                        disabled={isSearching || !address}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#FF6B00] transition-colors"
                      >
                        {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                      </button>
                    </div>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                      {(suggestions.length > 0 || (hasSearched && !isSearching && address.length >= 3 && suggestions.length === 0)) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-[100] w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1 overflow-hidden max-h-[250px] overflow-y-auto"
                        >
                          <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                              {suggestions.length > 0 ? 'Sugerencias' : 'Sin resultados'}
                            </span>
                            <button 
                              type="button"
                              onClick={() => {
                                setSuggestions([]);
                                setHasSearched(false);
                              }}
                              className="text-[10px] font-bold text-[#FF6B00] hover:underline"
                            >
                              Cerrar
                            </button>
                          </div>
                          {suggestions.length > 0 ? (
                            suggestions.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSelectSuggestion(s)}
                                className="w-full p-3 text-left hover:bg-orange-50 border-b border-slate-50 last:border-none transition-colors flex items-start gap-3 group"
                              >
                                <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                                  <MapPin size={12} className="text-slate-400 group-hover:text-[#FF6B00]" />
                                </div>
                                <span className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">{s.display_name}</span>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center">
                              <p className="text-xs text-slate-400">No encontramos esa dirección. Intenta ser más específico.</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Número (Ext/Int)</label>
                    <input
                      type="text"
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-sm"
                      placeholder="Ej: 123 o S/N"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Código Postal</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-sm"
                      placeholder="Ej: 06700"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Confirma en el Mapa</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-orange-100 rounded-full text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-all flex items-center gap-1"
                      >
                        {isLocating ? <Loader2 className="animate-spin" size={10} /> : <MapPin size={10} />}
                        Mi Ubicación
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-full text-slate-500 hover:bg-[#FF6B00] hover:text-white transition-all"
                      >
                        {mapType === 'streets' ? 'Ver Satélite' : 'Ver Calles'}
                      </button>
                    </div>
                  </div>
                  <div className="h-[250px] w-full rounded-3xl overflow-hidden border border-slate-100 shadow-inner relative z-0">
                    <MapContainer 
                      center={location} 
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      {mapType === 'streets' ? (
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                      ) : (
                        <TileLayer
                          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                      )}
                      <MapUpdater center={location} />
                      <LocationMarker position={location} setPosition={setLocation} />
                    </MapContainer>
                  </div>
                  <p className="text-[10px] text-slate-400 italic ml-1">Arrastra el pin o toca el mapa para ajustar la ubicación exacta.</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <ChevronLeft size={20} />
                  Atrás
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!address}
                  className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Siguiente paso
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-1">Documentación</h1>
                <p className="text-sm text-slate-500">Sube fotos de tu INE y RFC para validación.</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">INE Frente</label>
                    <label className={`relative flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      ineFront ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-[#FF6B00] hover:bg-orange-50'
                    }`}>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => setIneFront(e.target.files?.[0] || null)}
                      />
                      {ineFront ? (
                        <>
                          <Check className="text-green-500 mb-1" size={24} />
                          <span className="text-[10px] text-green-600 font-bold truncate max-w-[80%]">{ineFront.name}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="text-slate-300 mb-1" size={24} />
                          <span className="text-[10px] text-slate-400 font-bold">Frente</span>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">INE Reverso</label>
                    <label className={`relative flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      ineBack ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-[#FF6B00] hover:bg-orange-50'
                    }`}>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => setIneBack(e.target.files?.[0] || null)}
                      />
                      {ineBack ? (
                        <>
                          <Check className="text-green-500 mb-1" size={24} />
                          <span className="text-[10px] text-green-600 font-bold truncate max-w-[80%]">{ineBack.name}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="text-slate-300 mb-1" size={24} />
                          <span className="text-[10px] text-slate-400 font-bold">Reverso</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">RFC (Opcional)</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={rfc}
                      onChange={(e) => setRfc(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none transition-all font-medium text-sm"
                      placeholder="Tu RFC de 13 caracteres"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">
                  {error}
                </p>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <ChevronLeft size={20} />
                  Atrás
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!ineFront || !ineBack}
                  className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Siguiente paso
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-1">Verificación Facial</h1>
                <p className="text-sm text-slate-500">Tómate una foto para confirmar tu identidad con tu INE.</p>
              </div>

              <div className="space-y-4">
                <div className="relative aspect-[3/4] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 flex items-center justify-center">
                  {selfie ? (
                    <div className="relative w-full h-full">
                      <img src={selfie} alt="Selfie" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => {
                          setSelfie(null);
                          setShowWebcam(true);
                        }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 shadow-lg"
                      >
                        <RefreshCw size={14} />
                        Repetir Foto
                      </button>
                    </div>
                  ) : showWebcam ? (
                    <div className="relative w-full h-full">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: 'user' }}
                        className="w-full h-full object-cover"
                        mirrored={true}
                        disablePictureInPicture={true}
                        forceScreenshotSourceSize={false}
                        imageSmoothing={true}
                        onUserMedia={() => {}}
                        onUserMediaError={() => {}}
                        screenshotQuality={0.92}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {/* Silhouette Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-[80%] h-[80%] border-4 border-white/50 border-dashed rounded-[100px] flex items-center justify-center">
                            <User size={120} className="text-white/30" />
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            const imageSrc = webcamRef.current?.getScreenshot();
                            if (imageSrc) {
                              setSelfie(imageSrc);
                              setShowWebcam(false);
                            }
                          }}
                          className="absolute bottom-6 w-16 h-16 bg-white rounded-full border-4 border-slate-200 shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
                        >
                          <div className="w-12 h-12 bg-[#FF6B00] rounded-full" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera size={32} className="text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium mb-6">Necesitamos una foto tuya para la validación de seguridad.</p>
                      <button
                        onClick={() => setShowWebcam(true)}
                        className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto"
                      >
                        <Camera size={18} />
                        Abrir Cámara
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3">
                  <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-orange-700 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                    Asegúrate de que tu rostro esté bien iluminado y dentro de la silueta. No uses lentes oscuros ni gorra.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-4 rounded-2xl border border-red-100">
                  {error}
                </p>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(3)}
                  disabled={loading}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <ChevronLeft size={20} />
                  Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !selfie}
                  className="flex-[2] py-4 bg-[#FF6B00] hover:bg-[#E65F00] text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Save size={24} />
                      Enviar Solicitud
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )}
  </motion.div>
</div>
);
}
