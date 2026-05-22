import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Utensils, ChevronRight, Check, Loader2, Heart, X, Smartphone, ShieldCheck, Camera, Layers, Navigation } from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from './FirebaseProvider';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DriverVerification } from './DriverVerification';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OnboardingFlowProps {
  user: any;
  onFinish: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, onFinish }) => {
  const { profile, sendPhoneCode, confirmPhoneCode } = useAuth();
  const [step, setStep] = useState(0); // 0: Phone, 1: Address/Map, 2: Preferences, 3: Verification
  const [subStep, setSubStep] = useState<'input' | 'verify' | 'success'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [phone, setPhone] = useState(profile?.phoneNumber || '');
  const [code, setCode] = useState('');
  
  const [address, setAddress] = useState({
    label: 'Casa',
    address: '',
    references: '',
    type: 'home' as const,
    primary: true,
    location: { lat: 19.4326, lng: -99.1332 } // Default CDMX
  });

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAddressChange = (val: string) => {
    setAddress(prev => ({ ...prev, address: val }));
    
    // Debounced geocoding
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    
    if (val.length > 5) {
      geocodeTimeoutRef.current = setTimeout(async () => {
        setIsGeocoding(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=1`);
          const data = await response.json();
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            setAddress(prev => ({
              ...prev,
              location: { lat: parseFloat(lat), lng: parseFloat(lon) }
            }));
          }
        } catch (err) {
          console.error("Geocoding error:", err);
        } finally {
          setIsGeocoding(false);
        }
      }, 1500);
    }
  };

  const [preferences, setPreferences] = useState<string[]>([]);

  const foodTypes = [
    { id: 'mexicana', name: 'Mexicana', icon: '🌮' },
    { id: 'italiana', name: 'Italiana', icon: '🍕' },
    { id: 'japonesa', name: 'Japonesa', icon: '🍣' },
    { id: 'hamburguesas', name: 'Burgers', icon: '🍔' },
    { id: 'ensaladas', name: 'Saludable', icon: '🥗' },
    { id: 'postres', name: 'Postres', icon: '🍰' },
    { id: 'china', name: 'China', icon: '🥡' },
    { id: 'pollo', name: 'Pollo', icon: '🍗' }
  ];

  // Get current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAddress(prev => ({
            ...prev,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
          }));
        },
        (err) => console.warn("Error getting location:", err)
      );
    }
  }, []);

  const togglePreference = (id: string) => {
    setPreferences(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSendCode = async () => {
    if (!phone) return;
    setLoading(true);
    setError(null);
    try {
      await sendPhoneCode(phone);
      setSubStep('verify');
    } catch (err: any) {
      setError(err.message || "Error al enviar el código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      await confirmPhoneCode(phone, code);
      setSubStep('success');
      setTimeout(() => {
        setStep(1);
        setSubStep('input');
      }, 1500);
    } catch (err: any) {
      setError("Código incorrecto");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Save address
      if (address.address) {
        await addDoc(collection(db, 'users', user.uid, 'addresses'), {
          ...address,
          userId: user.uid,
          createdAt: Timestamp.now()
        });
      }

      // Save preferences and mark onboarding as completed
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        preferences,
        onboardingCompleted: true,
        updatedAt: Timestamp.now()
      });

      onFinish();
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const LocationMarker = () => {
    const map = useMapEvents({
      click(e) {
        setAddress(prev => ({
          ...prev,
          location: { lat: e.latlng.lat, lng: e.latlng.lng }
        }));
      },
    });

    // Update map center when address location changes from geocoding
    useEffect(() => {
      map.flyTo([address.location.lat, address.location.lng], map.getZoom());
    }, [address.location.lat, address.location.lng]);

    return (
      <Marker 
        position={[address.location.lat, address.location.lng]} 
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            setAddress(prev => ({
              ...prev,
              location: { lat: position.lat, lng: position.lng }
            }));
          },
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-[250] bg-white flex flex-col">
      <div className="p-6 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center space-x-2">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-purple-600' : 'w-4 bg-slate-100'}`}
            />
          ))}
        </div>
        {step === 3 && (
          <button 
            onClick={handleFinish}
            className="text-xs font-black uppercase text-slate-400 hover:text-purple-600 transition-colors"
          >
            Omitir por ahora
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                  Verifica tu<br />
                  <span className="text-purple-600">teléfono</span>
                </h2>
                <p className="text-slate-400 font-bold">Te enviaremos un código SMS para asegurar tu cuenta.</p>
              </div>

              <div className="space-y-4">
                {subStep === 'input' ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Número de Celular</label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input 
                          type="tel" 
                          placeholder="55 1234 5678"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-purple-100 transition-all"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div id="recaptcha-container"></div>
                    <button
                      onClick={handleSendCode}
                      disabled={loading || !phone}
                      className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Código'}
                    </button>
                  </div>
                ) : subStep === 'verify' ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest text-center block">Código de 6 dígitos</label>
                      <input 
                        type="text" 
                        maxLength={6}
                        placeholder="000000"
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center text-3xl tracking-[0.5em] outline-none focus:ring-2 ring-purple-100 transition-all"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                    <button
                      onClick={handleVerifyCode}
                      disabled={loading || code.length < 6}
                      className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verificar'}
                    </button>
                    <button 
                      onClick={() => setSubStep('input')}
                      className="w-full text-xs font-black uppercase text-slate-400 hover:text-purple-600 transition-colors"
                    >
                      Cambiar número
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4 text-green-600 animate-in zoom-in">
                    <div className="p-6 bg-green-50 rounded-full"><Check size={48} /></div>
                    <p className="font-black uppercase italic">¡Teléfono Verificado!</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <div className="p-8 pb-4 space-y-2">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                  ¿Dónde te<br />
                  <span className="text-purple-600">entregamos?</span>
                </h2>
                <p className="text-slate-400 font-bold">Mueve el pin para ser lo más exacto posible.</p>
              </div>

              <div className="flex-1 relative min-h-[300px]">
                <MapContainer 
                  center={[address.location.lat, address.location.lng]} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url={mapType === 'streets' 
                      ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    }
                  />
                  <LocationMarker />
                </MapContainer>

                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                  <button 
                    onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
                    className="p-3 bg-white rounded-xl shadow-lg text-slate-600 active:scale-95 transition-all"
                  >
                    <Layers size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setAddress(prev => ({
                            ...prev,
                            location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                          }));
                        });
                      }
                    }}
                    className="p-3 bg-white rounded-xl shadow-lg text-purple-600 active:scale-95 transition-all"
                  >
                    <Navigation size={20} />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Dirección Escrita</label>
                  <input 
                    type="text" 
                    placeholder="Calle, Número, Colonia"
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-purple-100 transition-all"
                    value={address.address}
                    onChange={e => handleAddressChange(e.target.value)}
                  />
                  {isGeocoding && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="animate-spin text-purple-600" size={16} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!address.address}
                  className="w-full py-5 bg-purple-600 text-white rounded-[25px] font-black uppercase tracking-tighter text-lg shadow-xl shadow-purple-100 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  Confirmar Ubicación
                </button>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                  ¿Qué te<br />
                  <span className="text-purple-600">apetece hoy?</span>
                </h2>
                <p className="text-slate-400 font-bold">Selecciona tus gustos para personalizar tu menú.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {foodTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => togglePreference(type.id)}
                    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center space-y-3 active:scale-95 relative ${
                      preferences.includes(type.id) 
                        ? 'border-purple-600 bg-purple-50' 
                        : 'border-slate-50 bg-white hover:border-slate-100'
                    }`}
                  >
                    <span className="text-3xl">{type.icon}</span>
                    <span className={`font-black text-xs uppercase tracking-widest ${
                      preferences.includes(type.id) ? 'text-purple-600' : 'text-slate-400'
                    }`}>
                      {type.name}
                    </span>
                    {preferences.includes(type.id) && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={preferences.length === 0}
                className="w-full py-5 bg-purple-600 text-white rounded-[25px] font-black uppercase tracking-tighter text-lg shadow-xl shadow-purple-100 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                Siguiente
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                  Verifica tu<br />
                  <span className="text-purple-600">identidad</span>
                </h2>
                <p className="text-slate-400 font-bold">Sube tus documentos para una cuenta 100% segura. Puedes hacerlo ahora o después.</p>
              </div>

              <div className="bg-slate-50 rounded-[40px] p-6">
                <DriverVerification onComplete={handleFinish} />
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-purple-600 transition-colors"
              >
                Omitir por el momento
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
