import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, Phone, Mail, MapPin, ShieldCheck, Clock, Camera, 
  ChevronRight, ChevronLeft, Check, Loader2, AlertCircle, 
  Upload, Navigation, X, Calendar, Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from './FirebaseProvider';
import { db, storage, OperationType, handleFirestoreError } from '../firebase';
import { doc, setDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

// Fix Leaflet marker icon issue
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const STEPS = [
  { id: 1, title: 'Básicos', icon: <Store size={20} /> },
  { id: 2, title: 'Ubicación', icon: <MapPin size={20} /> },
  { id: 3, title: 'Legal', icon: <ShieldCheck size={20} /> },
  { id: 4, title: 'Operación', icon: <Clock size={20} /> }
];

const DAYS = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' }
];

export const RestaurantRegistration = ({ onComplete }: { onComplete: () => void }) => {
  const { user, profile, sendPhoneCode, confirmPhoneCode, setRole } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: profile?.phoneNumber || '',
    email: profile?.email || '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      references: ''
    },
    location: {
      lat: 19.4326, // Default CDMX
      lng: -99.1332
    },
    legal: {
      rfc: '',
      officialIdUrl: '',
      officialIdBackUrl: ''
    },
    logoUrl: '',
    schedule: DAYS.reduce((acc, day) => ({
      ...acc,
      [day.id]: { open: '09:00', close: '20:00', isClosed: false }
    }), {})
  });

  // Verification State
  const [phoneVerified, setPhoneVerified] = useState(profile?.phoneVerified || false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // File states
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Geocoding logic
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const geocodeAddress = async () => {
    const { street, number, neighborhood } = formData.address;
    if (!street || !neighborhood) return;

    const query = `${street} ${number}, ${neighborhood}, Mexico`;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setFormData(prev => ({
          ...prev,
          location: { lat: parseFloat(lat), lng: parseFloat(lon) }
        }));
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  useEffect(() => {
    if (currentStep === 2) {
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      geocodeTimeoutRef.current = setTimeout(() => {
        geocodeAddress();
      }, 1500);
    }
    return () => {
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
  }, [formData.address.street, formData.address.number, formData.address.neighborhood]);

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return (
          formData.name.trim().length >= 3 &&
          formData.phone.length === 10 &&
          emailRegex.test(formData.email) &&
          phoneVerified
        );
      case 2:
        return (
          formData.address.street.trim().length > 0 &&
          formData.address.number.trim().length > 0 &&
          formData.address.neighborhood.trim().length > 0 &&
          formData.location.lat !== 0 &&
          formData.location.lng !== 0
        );
      case 3:
        return formData.legal.officialIdUrl !== '' && formData.legal.officialIdBackUrl !== '';
      case 4:
        return formData.logoUrl !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!isStepValid(currentStep)) {
      toast.error('Por favor completa todos los campos obligatorios.');
      return;
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSendCode = async () => {
    if (!formData.phone) {
      toast.error('Ingresa un número de teléfono válido.');
      return;
    }
    setIsSendingCode(true);
    try {
      await sendPhoneCode(formData.phone);
      setShowCodeInput(true);
      toast.success('Código enviado por SMS.');
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar el código.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) return;
    setLoading(true);
    try {
      await confirmPhoneCode(formData.phone, verificationCode);
      setPhoneVerified(true);
      setShowCodeInput(false);
      toast.success('Teléfono verificado con éxito.');
    } catch (err) {
      console.error(err);
      toast.error('Código incorrecto.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, path: string) => {
    if (!user) return '';
    const storageRef = ref(storage, `restaurants/${user.uid}/${path}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const onFileChange = async (file: File | null, type: 'front' | 'back' | 'logo') => {
    if (!file) return;
    
    if (type === 'front') {
      setIsUploadingFront(true);
      setIdFrontFile(file);
      try {
        const url = await handleFileUpload(file, 'legal/ine_frente.jpg');
        setFormData(prev => ({ ...prev, legal: { ...prev.legal, officialIdUrl: url } }));
        toast.success('INE frontal subida.');
      } catch (err) {
        toast.error('Error al subir INE frontal.');
      } finally {
        setIsUploadingFront(false);
      }
    } else if (type === 'back') {
      setIsUploadingBack(true);
      setIdBackFile(file);
      try {
        const url = await handleFileUpload(file, 'legal/ine_reverso.jpg');
        setFormData(prev => ({ ...prev, legal: { ...prev.legal, officialIdBackUrl: url } }));
        toast.success('INE reverso subida.');
      } catch (err) {
        toast.error('Error al subir INE reverso.');
      } finally {
        setIsUploadingBack(false);
      }
    } else if (type === 'logo') {
      setIsUploadingLogo(true);
      setLogoFile(file);
      try {
        const url = await handleFileUpload(file, 'logo.jpg');
        setFormData(prev => ({ ...prev, logoUrl: url }));
        toast.success('Logotipo subido.');
      } catch (err) {
        toast.error('Error al subir logotipo.');
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.legal.officialIdUrl || !formData.legal.officialIdBackUrl) {
      toast.error('Debes subir ambos lados de tu identificación oficial.');
      return;
    }
    if (!formData.logoUrl) {
      toast.error('Debes subir el logotipo de tu restaurante.');
      return;
    }

    setIsSubmitting(true);
    try {
      const restaurantData = {
        ownerId: user?.uid,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: {
          ...formData.address,
          full: `${formData.address.street} ${formData.address.number}, ${formData.address.neighborhood}`
        },
        location: formData.location,
        legal: {
          rfc: formData.legal.rfc,
          officialIdUrl: formData.legal.officialIdUrl,
          officialIdBackUrl: formData.legal.officialIdBackUrl
        },
        img: formData.logoUrl,
        schedule: formData.schedule,
        status: 'pendiente',
        isOpen: false,
        isAutoOpenEnabled: true,
        rating: 5.0,
        type: 'Comida',
        createdAt: Timestamp.now()
      };

      const requestData = {
        type: 'restaurant',
        status: 'pending',
        userId: user!.uid,
        data: restaurantData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'registration_requests'), requestData);
      setIsSubmitting(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        onComplete();
      }, 5000);
    } catch (err) {
      setIsSubmitting(false);
      handleFirestoreError(err, OperationType.WRITE, 'viveres');
      toast.error('Error al guardar los datos.');
    }
  };

  // Map Component
  const ChangeView = ({ center }: { center: [number, number] }) => {
    const map = useMapEvents({});
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setFormData(prev => ({
          ...prev,
          location: { lat: e.latlng.lat, lng: e.latlng.lng }
        }));
      },
    });

    return (
      <Marker position={[formData.location.lat, formData.location.lng]} draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            setFormData(prev => ({
              ...prev,
              location: { lat: position.lat, lng: position.lng }
            }));
          },
        }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="p-6 bg-white border-b flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setRole('client')}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors mr-1"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10 bg-[#FF5722] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
            <Store size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">Registro de <span className="text-[#FF5722]">Restaurante</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Paso {currentStep} de 4</p>
          </div>
        </div>
        <div className="flex space-x-1">
          {STEPS.map((step) => (
            <div 
              key={step.id}
              className={`w-8 h-1.5 rounded-full transition-all duration-500 ${currentStep >= step.id ? 'bg-[#FF5722]' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full pb-32">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Datos Básicos</h2>
                <p className="text-slate-500 font-medium text-sm">Comencemos con la información de contacto de tu negocio.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="Ej: Tacos El Padrino"
                      className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono del Negocio</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="tel" 
                        placeholder="10 dígitos"
                        disabled={phoneVerified}
                        className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                      {phoneVerified && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                          <Check size={20} />
                        </div>
                      )}
                    </div>
                    {!phoneVerified && (
                      <button 
                        onClick={handleSendCode}
                        disabled={isSendingCode || !formData.phone}
                        className="px-6 bg-[#FF5722] text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-orange-100 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSendingCode ? <Loader2 className="animate-spin" size={18} /> : 'Verificar'}
                      </button>
                    )}
                  </div>
                </div>

                {showCodeInput && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3"
                  >
                    <p className="text-xs font-bold text-orange-700">Ingresa el código de 6 dígitos enviado:</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        maxLength={6}
                        placeholder="000000"
                        className="flex-1 p-3 bg-white border border-orange-200 rounded-xl text-center font-black tracking-[1em] outline-none focus:border-[#FF5722]"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                      <button 
                        onClick={handleVerifyCode}
                        disabled={loading || verificationCode.length < 6}
                        className="px-6 bg-orange-600 text-white rounded-xl font-black uppercase text-xs active:scale-95 transition-all disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Validar'}
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="email" 
                      placeholder="contacto@restaurante.com"
                      className="w-full p-4 pl-12 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Ubicación Exacta</h2>
                <p className="text-slate-500 font-medium text-sm">Mueve el PIN en el mapa para marcar la ubicación exacta de tu cocina.</p>
              </div>

              <div className="h-[300px] w-full rounded-[30px] overflow-hidden border-4 border-white shadow-xl relative z-10">
                <MapContainer center={[formData.location.lat, formData.location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ChangeView center={[formData.location.lat, formData.location.lng]} />
                  <LocationMarker />
                </MapContainer>
                <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white shadow-lg flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                    <Navigation size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase leading-tight">
                    Lat: {formData.location.lat.toFixed(6)}<br />
                    Lng: {formData.location.lng.toFixed(6)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Calle</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700"
                    value={formData.address.street}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700"
                    value={formData.address.number}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, number: e.target.value}})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colonia</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700"
                  value={formData.address.neighborhood}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, neighborhood: e.target.value}})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referencias (Ej: Portón azul)</label>
                <textarea 
                  className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 min-h-[80px]"
                  value={formData.address.references}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, references: e.target.value}})}
                />
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Seguridad y Legal</h2>
                <p className="text-slate-500 font-medium text-sm">Necesitamos validar tu identidad para evitar fraudes y asegurar la calidad.</p>
              </div>

              <div className="space-y-6">
                {/* INE Front */}
                <div className="p-6 bg-white rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tighter">INE (Frente)</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Lado frontal de tu identificación</p>
                      </div>
                    </div>
                    {idFrontFile && <div className="text-emerald-500"><Check size={20} /></div>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-2xl hover:border-orange-200 hover:bg-orange-50 transition-all cursor-pointer group disabled:opacity-50">
                      {isUploadingFront ? <Loader2 className="animate-spin text-orange-500 mb-2" size={24} /> : <Camera size={24} className="text-slate-300 group-hover:text-orange-400 mb-2" />}
                      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange-600">{isUploadingFront ? 'Subiendo...' : 'Cámara'}</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" disabled={isUploadingFront} onChange={(e) => onFileChange(e.target.files?.[0] || null, 'front')} />
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-2xl hover:border-orange-200 hover:bg-orange-50 transition-all cursor-pointer group disabled:opacity-50">
                      {isUploadingFront ? <Loader2 className="animate-spin text-orange-500 mb-2" size={24} /> : <Upload size={24} className="text-slate-300 group-hover:text-orange-400 mb-2" />}
                      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange-600">{isUploadingFront ? 'Subiendo...' : 'Galería'}</span>
                      <input type="file" accept="image/*" className="hidden" disabled={isUploadingFront} onChange={(e) => onFileChange(e.target.files?.[0] || null, 'front')} />
                    </label>
                  </div>
                  {idFrontFile && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">{idFrontFile.name}</span>
                      <button onClick={() => { setIdFrontFile(null); setFormData(prev => ({ ...prev, legal: { ...prev.legal, officialIdUrl: '' } })); }} className="text-red-500"><X size={16} /></button>
                    </div>
                  )}
                </div>

                {/* INE Back */}
                <div className="p-6 bg-white rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tighter">INE (Reverso)</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Lado trasero de tu identificación</p>
                      </div>
                    </div>
                    {idBackFile && <div className="text-emerald-500"><Check size={20} /></div>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-2xl hover:border-orange-200 hover:bg-orange-50 transition-all cursor-pointer group disabled:opacity-50">
                      {isUploadingBack ? <Loader2 className="animate-spin text-orange-500 mb-2" size={24} /> : <Camera size={24} className="text-slate-300 group-hover:text-orange-400 mb-2" />}
                      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange-600">{isUploadingBack ? 'Subiendo...' : 'Cámara'}</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" disabled={isUploadingBack} onChange={(e) => onFileChange(e.target.files?.[0] || null, 'back')} />
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-2xl hover:border-orange-200 hover:bg-orange-50 transition-all cursor-pointer group disabled:opacity-50">
                      {isUploadingBack ? <Loader2 className="animate-spin text-orange-500 mb-2" size={24} /> : <Upload size={24} className="text-slate-300 group-hover:text-orange-400 mb-2" />}
                      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange-600">{isUploadingBack ? 'Subiendo...' : 'Galería'}</span>
                      <input type="file" accept="image/*" className="hidden" disabled={isUploadingBack} onChange={(e) => onFileChange(e.target.files?.[0] || null, 'back')} />
                    </label>
                  </div>
                  {idBackFile && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">{idBackFile.name}</span>
                      <button onClick={() => { setIdBackFile(null); setFormData(prev => ({ ...prev, legal: { ...prev.legal, officialIdBackUrl: '' } })); }} className="text-red-500"><X size={16} /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC / Cédula Fiscal (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: ABC123456XYZ"
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:border-[#FF5722] transition-all font-bold text-slate-700 uppercase"
                    value={formData.legal.rfc}
                    onChange={(e) => setFormData({...formData, legal: {...formData.legal, rfc: e.target.value.toUpperCase()}})}
                  />
                  <p className="text-[10px] text-slate-400 font-bold ml-1 italic">* Necesario si deseas emitir facturas a tus clientes.</p>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Configuración Operativa</h2>
                <p className="text-slate-500 font-medium text-sm">Define tus horarios y la imagen de tu restaurante.</p>
              </div>

              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-32 h-32 bg-white rounded-[40px] shadow-xl border-4 border-white overflow-hidden flex items-center justify-center">
                      {isUploadingLogo ? (
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                      ) : logoFile ? (
                        <img src={URL.createObjectURL(logoFile)} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Store size={48} className="text-slate-100" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FF5722] text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition-all">
                      <Camera size={20} />
                      <input type="file" accept="image/*" className="hidden" disabled={isUploadingLogo} onChange={(e) => onFileChange(e.target.files?.[0] || null, 'logo')} />
                    </label>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logotipo del Restaurante</p>
                </div>

                {/* Schedule Editor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-tighter">Horarios Semanales</h3>
                    <div className="flex items-center text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                      <Info size={12} className="mr-1" /> Puedes editarlos después
                    </div>
                  </div>

                  <div className="space-y-2">
                    {DAYS.map((day) => (
                      <div key={day.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => setFormData({
                              ...formData,
                              schedule: {
                                ...formData.schedule,
                                [day.id]: { ...formData.schedule[day.id], isClosed: !formData.schedule[day.id].isClosed }
                              }
                            })}
                            className={`w-10 h-6 rounded-full transition-all relative ${formData.schedule[day.id].isClosed ? 'bg-slate-200' : 'bg-orange-500'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.schedule[day.id].isClosed ? 'left-1' : 'left-5'}`} />
                          </button>
                          <span className="text-xs font-black uppercase tracking-tighter w-20">{day.label}</span>
                        </div>

                        {!formData.schedule[day.id].isClosed ? (
                          <div className="flex items-center space-x-2">
                            <input 
                              type="time" 
                              className="text-xs font-bold p-1 bg-slate-50 rounded-lg outline-none"
                              value={formData.schedule[day.id].open}
                              onChange={(e) => setFormData({
                                ...formData,
                                schedule: {
                                  ...formData.schedule,
                                  [day.id]: { ...formData.schedule[day.id], open: e.target.value }
                                }
                              })}
                            />
                            <span className="text-[10px] font-bold text-slate-300">A</span>
                            <input 
                              type="time" 
                              className="text-xs font-bold p-1 bg-slate-50 rounded-lg outline-none"
                              value={formData.schedule[day.id].close}
                              onChange={(e) => setFormData({
                                ...formData,
                                schedule: {
                                  ...formData.schedule,
                                  [day.id]: { ...formData.schedule[day.id], close: e.target.value }
                                }
                              })}
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-slate-300 italic">Cerrado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex gap-4 z-50">
        {currentStep > 1 && (
          <button 
            onClick={handleBack}
            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[25px] font-black uppercase text-xs active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <ChevronLeft size={18} />
            <span>Atrás</span>
          </button>
        )}
        
        {currentStep < 4 ? (
          <button 
            onClick={handleNext}
            disabled={!isStepValid(currentStep)}
            className="flex-[2] py-4 bg-[#FF5722] text-white rounded-[25px] font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            <span>Siguiente</span>
            <ChevronRight size={18} />
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !isStepValid(currentStep)}
            className="flex-[2] py-4 bg-[#FF5722] text-white rounded-[25px] font-black uppercase text-xs shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <span>Finalizar Registro</span>
                <Check size={18} />
              </>
            )}
          </button>
        )}
      </footer>

      {/* Manual Review Info Modal */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex items-center justify-center p-8 text-center"
          >
            <div className="space-y-6 max-w-sm">
              <div className="w-24 h-24 bg-orange-100 rounded-[40px] flex items-center justify-center mx-auto text-orange-600">
                <Loader2 className="animate-spin" size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Guardando Perfil</h3>
                <p className="text-slate-500 font-medium">Estamos procesando tus documentos y configurando tu panel...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Screen */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-emerald-500 flex items-center justify-center p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="space-y-8 max-w-sm"
            >
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
                <Check size={64} className="text-emerald-500" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">¡Solicitud enviada con éxito!</h3>
                <p className="text-emerald-50 font-bold leading-relaxed">
                  Estamos procesando tus datos. Aprovecha este tiempo para preparar las mejores fotos de tus productos. Te avisaremos pronto.
                </p>
              </div>
              <div className="pt-8">
                <div className="w-full h-1 bg-emerald-400 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5 }}
                    className="h-full bg-white"
                  />
                </div>
                <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest mt-4 animate-pulse">Redirigiendo al panel...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
