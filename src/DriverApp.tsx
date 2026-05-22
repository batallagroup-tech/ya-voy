import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sendNotification } from './utils/notification';
import { 
  Package, MapPin, CheckCircle, Clock, ChevronRight, 
  LogOut, User, Bike, Navigation, Phone, AlertCircle,
  Check, X, Loader2, Utensils, MessageCircle, Power,
  Camera, Shield, Smartphone, Pencil
} from 'lucide-react';
import { useAuth, LoginScreen } from './components/FirebaseProvider';
import { Toaster, toast } from 'sonner';
import { db, OperationType, handleFirestoreError } from './firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, Timestamp, orderBy, addDoc, serverTimestamp, getDocs, increment, getDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { Order, Message } from './types';
import { ChatModal } from './components/ChatModal';

export default function DriverApp() {
  const { user, profile, loading, logout, updateDriverStatus, updateDriverProfile, updatePhoto } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history' | 'profile'>('available');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle: '',
    plate: ''
  });
  const [showChat, setShowChat] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification Permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (profile?.settings?.notifications && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [profile]);

  // Simulated personalized notifications for Driver
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !profile?.settings?.notifications || Notification.permission !== 'granted') return;

    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.9) { // 10% chance every 60s
        let title = "Flash Delivery - Repartidor";
        let body = "¡Alta demanda en tu zona! Conéctate para ganar más.";

        if (!profile?.isOnline) {
          body = "¡Nuevos pedidos disponibles cerca de ti! Conéctate ahora.";
        } else if (orders.some(o => o.status === 'ready_for_pickup')) {
          body = "Tienes pedidos listos para recoger. ¡No los hagas esperar!";
        } else if (profile?.balance > 100) {
          body = "Recordatorio: Tienes un saldo pendiente por liquidar.";
        }

        try {
          sendNotification(title, {
            body: body,
            icon: "/favicon.ico"
          });
        } catch (e) {
          console.warn("Notification failed:", e);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [profile, orders]);

  const handleClaimIdentity = () => {
    setShowRecoveryModal(true);
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.displayName || '',
        phone: profile.phoneNumber || '',
        vehicle: profile.vehicle || '',
        plate: profile.plate || ''
      });
      if (profile.role === 'repartidor' && !profile.vehicle) {
        setShowRegistration(true);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!user || profile?.role !== 'repartidor' || !profile?.isOnline) {
      if (!profile?.isOnline) setOrders([]);
      return;
    }

    let q;
    if (activeTab === 'available') {
      q = query(
        collection(db, 'orders'), 
        where('status', 'in', ['pending', 'processing', 'ready_for_pickup']),
        where('driverId', '==', null),
        orderBy('createdAt', 'desc')
      );
    } else if (activeTab === 'active') {
      q = query(
        collection(db, 'orders'), 
        where('driverId', '==', user.uid),
        where('status', 'in', ['pending', 'processing', 'ready_for_pickup', 'out_for_delivery']),
        orderBy('createdAt', 'desc')
      );
    } else if (activeTab === 'history') {
      q = query(
        collection(db, 'orders'), 
        where('driverId', '==', user.uid),
        where('status', '==', 'delivered'),
        orderBy('createdAt', 'desc')
      );
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(fetchedOrders);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user, profile, activeTab]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;

    // Check for debt limit
    if ((profile?.debt || 0) >= 100) {
      toast.error('No puedes aceptar pedidos. Tienes un adeudo pendiente de $100.00 o más. Por favor, liquida tu adeudo.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        driverId: user.uid,
        driver: {
          name: profile?.displayName || user.displayName || 'Repartidor',
          phone: profile?.phoneNumber || '',
          rating: 4.8,
          vehicle: profile?.vehicle || 'Motocicleta'
        }
      });
      setActiveTab('active');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus
      });

      if (newStatus === 'delivered') {
        // Check if it was a cash payment
        const orderSnap = await getDoc(orderRef);
        const orderData = orderSnap.data() as Order;
        
        if (orderData.paymentMethod === 'cash') {
          // Deduct 8.50 from balance and add to debt
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            balance: increment(-8.50),
            debt: increment(8.50)
          });
          toast.info('Comisión de $8.50 aplicada por entrega en efectivo.');
        }

        setSelectedOrder(null);
        setActiveTab('history');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      await updateDriverStatus(!profile?.isOnline);
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const scanDocument = async (file: File, type: 'ine' | 'tarjeta') => {
    setIsScanning(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";

      const prompt = type === 'ine' 
        ? "Extrae el nombre completo de esta identificación (INE). Responde solo con el nombre en formato JSON: { \"name\": \"NOMBRE\" }"
        : "Extrae el tipo de vehículo y las placas de esta tarjeta de circulación. Responde solo en formato JSON: { \"vehicle\": \"TIPO\", \"plate\": \"PLACAS\" }. El tipo de vehículo debe ser uno de: Motocicleta, Bicicleta, Automóvil.";

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              vehicle: { type: Type.STRING },
              plate: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        vehicle: result.vehicle || prev.vehicle,
        plate: result.plate || prev.plate
      }));
      toast.success(type === 'ine' ? 'INE escaneada con éxito' : 'Tarjeta de circulación escaneada con éxito');
    } catch (err) {
      console.error("Error scanning document:", err);
      toast.error('Error al escanear el documento');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;
    
    setIsRegistering(true);
    
    try {
      // Check if plate is already registered by another driver
      if (formData.plate) {
        const q = query(collection(db, 'users'), where('plate', '==', formData.plate));
        const snapshot = await getDocs(q);
        if (!snapshot.empty && snapshot.docs[0].id !== user.uid) {
          toast.error('Esta placa ya está registrada por otro repartidor. Si crees que es un error, usa la opción "Reclamar Identidad".');
          setIsRegistering(false);
          return;
        }
      }

      await updateDriverProfile({ 
        vehicle: formData.vehicle, 
        plate: formData.plate, 
        name: formData.name, 
        phone: formData.phone 
      });
      await updateDriverStatus(true);
      setShowRegistration(false);
      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      console.error("Error registering driver:", err);
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsRegistering(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await updatePhoto(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (profile && profile.role !== 'repartidor') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black uppercase mb-2">Acceso Denegado</h1>
        <p className="text-slate-500 mb-6 font-bold">Esta aplicación es exclusiva para repartidores autorizados.</p>
        <div className="flex flex-col space-y-4 w-full max-w-xs">
          <button 
            onClick={() => window.location.href = '/'} 
            className="w-full py-4 bg-purple-600 text-white rounded-3xl font-black uppercase shadow-lg"
          >
            Volver a la App Cliente
          </button>
          <button onClick={logout} className="w-full py-4 bg-slate-100 text-slate-600 rounded-3xl font-black uppercase">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-950 flex justify-center h-screen overflow-hidden sm:p-4 md:p-8">
      <div id="application-container" className="w-full max-w-md bg-slate-50 dark:bg-slate-950 h-full shadow-2xl relative flex flex-col overflow-hidden transition-colors duration-300 sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 dark:sm:border-slate-900">
        <Toaster position="top-center" richColors />
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 p-6 shadow-sm z-50 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${profile?.isOnline ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Bike size={24} />
              </div>
              <div>
                <h1 className="font-black text-lg uppercase tracking-tighter italic dark:text-white">Ya Voy! Driver</h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${profile?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {profile?.isOnline ? 'En Línea' : 'Desconectado'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleToggleOnline}
                className={`p-3 rounded-2xl transition-all active:scale-90 ${profile?.isOnline ? 'bg-green-50 dark:bg-green-900/10 text-green-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                title={profile?.isOnline ? 'Desconectarse' : 'Conectarse'}
              >
                <Power size={20} />
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-purple-600 transition-colors"
                title="Cambiar a App Cliente"
              >
                <Navigation size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar p-6 bg-slate-50 dark:bg-slate-950">

        {activeTab !== 'profile' ? (
          <>
            {/* Tabs */}
            <div className="flex space-x-2 mb-8 bg-white p-1.5 rounded-3xl shadow-sm">
              {(['available', 'active', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'available' ? 'Disponibles' : tab === 'active' ? 'En Curso' : 'Historial'}
                </button>
              ))}
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {!profile?.isOnline && activeTab === 'available' ? (
                <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 p-8">
                  <Power size={48} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="text-lg font-black uppercase italic mb-2">Estás Desconectado</h3>
                  <p className="text-slate-400 font-bold uppercase text-xs mb-6">Conéctate para empezar a recibir pedidos en tu zona.</p>
                  <button 
                    onClick={handleToggleOnline}
                    className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Ponerse en Línea
                  </button>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-20 text-center">
                  <Package size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-sm">No hay pedidos en esta sección</p>
                </div>
              ) : (
                orders.map((order) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-white p-5 rounded-[40px] shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                          <Package size={20} />
                        </div>
                        <div>
                          <h3 className="font-black text-sm uppercase truncate max-w-[150px]">{order.storeName || 'Restaurante'}</h3>
                          <p className="text-[10px] font-bold text-slate-400">{order.name || 'Pedido'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-purple-600">${order.total || order.price}</p>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                          order.status === 'ready_for_pickup' ? 'bg-purple-100 text-purple-600' :
                          order.status === 'out_for_delivery' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {order.status === 'pending' ? 'Pendiente' :
                           order.status === 'processing' ? 'En Cocina' :
                           order.status === 'ready_for_pickup' ? 'Listo' :
                           order.status === 'out_for_delivery' ? 'En Camino' :
                           'Entregado'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2 text-slate-500">
                        <MapPin size={14} className="text-purple-600 flex-shrink-0" />
                        <p className="text-[10px] font-bold truncate max-w-[150px]">{order.address}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${order.paymentMethod === 'cash' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {order.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
                      </div>
                    </div>

                    {activeTab === 'available' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptOrder(order.id);
                        }}
                        disabled={isUpdating}
                        className="w-full py-3 bg-purple-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {isUpdating ? 'Procesando...' : 'Aceptar Pedido'}
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Profile Tab */
          <div className="space-y-6">
            <div className="bg-white rounded-[40px] p-8 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-purple-600"></div>
              <div className="relative mt-4">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-[35px] bg-slate-100 border-4 border-white overflow-hidden mx-auto shadow-xl">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg text-purple-600 active:scale-90 transition-all"
                  >
                    <Camera size={16} />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter mt-4">{profile?.displayName || 'Repartidor'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile?.email}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-slate-50 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Pedidos</p>
                  <p className="text-lg font-black text-purple-600">124</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Rating</p>
                  <p className="text-lg font-black text-purple-600">4.8</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Nivel</p>
                  <p className="text-lg font-black text-purple-600">Oro</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Información del Repartidor</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-purple-600 shadow-sm"><Bike size={20}/></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Vehículo</p>
                      <p className="text-sm font-bold">{profile?.vehicle || 'No registrado'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleClaimIdentity} 
                      className="px-3 py-1 bg-purple-100 text-purple-600 rounded-lg text-[10px] font-bold uppercase"
                    >
                      Reclamar
                    </button>
                    <button onClick={() => setShowRegistration(true)} className="p-2 text-purple-600"><Pencil size={16}/></button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-purple-600 shadow-sm"><Smartphone size={20}/></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Teléfono</p>
                      <p className="text-sm font-bold">{profile?.phoneNumber || 'No registrado'}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${profile?.phoneVerified ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    {profile?.phoneVerified ? 'Verificado' : 'Pendiente'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-purple-600 shadow-sm"><Shield size={20}/></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Estado de Cuenta</p>
                      <p className="text-sm font-bold">{profile?.verificado ? 'Activa' : 'En Revisión'}</p>
                    </div>
                  </div>
                  <CheckCircle size={20} className={profile?.verificado ? 'text-green-500' : 'text-slate-300'} />
                </div>

                {/* Debt Alert */}
                {(profile?.debt || 0) > 0 && (
                  <div className={`flex items-center justify-between p-4 rounded-3xl mt-4 ${profile?.debt >= 100 ? 'bg-red-50 border-2 border-red-200' : 'bg-orange-50 border-2 border-orange-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 bg-white rounded-2xl shadow-sm ${profile?.debt >= 100 ? 'text-red-600' : 'text-orange-600'}`}>
                        <AlertCircle size={20}/>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-60">Adeudo pendiente</p>
                        <p className={`text-sm font-black ${profile?.debt >= 100 ? 'text-red-600' : 'text-orange-600'}`}>
                          ${(profile?.debt || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {profile?.debt >= 100 && (
                      <div className="px-3 py-1 bg-red-600 text-white rounded-full text-[8px] font-black uppercase animate-pulse">
                        Bloqueado
                      </div>
                    )}
                  </div>
                )}

                {/* Balance Display */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl mt-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-purple-600 shadow-sm">
                      <Clock size={20}/>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Saldo Actual</p>
                      <p className="text-sm font-black text-purple-600">${(profile?.balance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={logout} className="w-full py-5 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-[30px] font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
              <LogOut size={20} />
              Cerrar Sesión
            </button>
          </div>
        )}
      </main>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[50px] sm:rounded-b-[50px] overflow-hidden max-h-[90vh] flex flex-col relative"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Detalles del Envío</h2>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Restaurante</p>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Utensils className="text-purple-600 mt-1 flex-shrink-0" size={20} />
                        <div>
                          <p className="font-bold text-sm">{selectedOrder.storeName || 'Restaurante'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Recoger aquí</p>
                        </div>
                      </div>
                      <button className="p-3 bg-white rounded-2xl text-purple-600 shadow-sm"><Navigation size={18}/></button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cliente</p>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <User className="text-purple-600 mt-1 flex-shrink-0" size={20} />
                        <div>
                          <p className="font-bold text-sm">{selectedOrder.userName || 'Cliente'}</p>
                          <p className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">{selectedOrder.address}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowChat(true)} className="p-3 bg-white rounded-2xl text-purple-600 shadow-sm"><MessageCircle size={18}/></button>
                        <button className="p-3 bg-white rounded-2xl text-purple-600 shadow-sm"><Phone size={18}/></button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pago</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-2xl shadow-sm ${selectedOrder.paymentMethod === 'cash' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          <Smartphone size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{selectedOrder.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Método de pago</p>
                        </div>
                      </div>
                      <p className="font-black text-lg text-purple-600">${selectedOrder.total || selectedOrder.price}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[40px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resumen del Pedido</p>
                    <div className="space-y-2">
                      {selectedOrder.details?.map((detail, i) => (
                        <div key={i} className="flex justify-between text-sm font-bold">
                          <span>{detail}</span>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                        <span className="font-black uppercase text-xs">Total a Cobrar</span>
                        <span className="text-xl font-black text-purple-600">${selectedOrder.total || selectedOrder.price}</span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.status === 'ready_for_pickup' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery')}
                      disabled={isUpdating}
                      className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3"
                    >
                      <Bike size={24} />
                      <span>Marcar como Recogido</span>
                    </button>
                  )}

                  {selectedOrder.status === 'out_for_delivery' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                      disabled={isUpdating}
                      className="w-full py-5 bg-green-600 text-white rounded-[30px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center space-x-3"
                    >
                      <CheckCircle size={24} />
                      <span>Marcar como Entregado</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegistration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Perfil de Repartidor</h2>
              <p className="text-slate-400 font-bold text-sm mb-8">Completa tu información para empezar a recibir pedidos.</p>
              
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Escanear INE</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                      <Camera size={24} className="text-purple-600 mb-1" />
                      <span className="text-[8px] font-black uppercase text-slate-400">Subir Foto</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) scanDocument(file, 'ine');
                        }} 
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tarjeta Circulación</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all">
                      <Camera size={24} className="text-purple-600 mb-1" />
                      <span className="text-[8px] font-black uppercase text-slate-400">Subir Foto</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) scanDocument(file, 'tarjeta');
                        }} 
                      />
                    </label>
                  </div>
                </div>

                {isScanning && (
                  <div className="flex items-center justify-center gap-3 p-4 bg-purple-50 text-purple-600 rounded-2xl animate-pulse">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-xs font-black uppercase">Escaneando documentos...</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nombre Completo</label>
                  <input 
                    name="name" 
                    type="text"
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tu nombre completo"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Teléfono de Contacto</label>
                  <input 
                    name="phone" 
                    type="tel"
                    required 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Tu número de teléfono"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tipo de Vehículo</label>
                  <select 
                    name="vehicle" 
                    required 
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  >
                    <option value="" disabled>Selecciona tu vehículo</option>
                    <option value="Motocicleta">Motocicleta</option>
                    <option value="Bicicleta">Bicicleta</option>
                    <option value="Automóvil">Automóvil</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Placas / Identificación</label>
                  <input 
                    name="plate" 
                    type="text"
                    required 
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                    placeholder="Número de placa o ID"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-5 bg-purple-600 text-white rounded-[25px] font-black uppercase tracking-tighter text-lg shadow-xl shadow-purple-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    'Guardar y Continuar'
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      {showChat && selectedOrder && (
        <ChatModal 
          orderId={selectedOrder.id}
          recipientName={selectedOrder.userName || 'Cliente'}
          senderRole="driver"
          onClose={() => setShowChat(false)} 
        />
      )}

      {/* Recovery Modal */}
      <AnimatePresence>
        {showRecoveryModal && (
          <div className="absolute inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Reclamar Identidad</h2>
              <p className="text-slate-500 text-sm mb-8 font-medium">
                Si has perdido el acceso a tu cuenta anterior o crees que alguien más está usando tus documentos, 
                por favor contacta a soporte técnico para verificar tu identidad y recuperar tu acceso.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    toast.info('Redirigiendo a soporte...');
                    setShowRecoveryModal(false);
                  }}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg"
                >
                  Contactar Soporte
                </button>
                <button 
                  onClick={() => setShowRecoveryModal(false)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 h-20 flex items-center justify-around px-6 z-50 shadow-2xl transition-colors">
        <button 
          onClick={() => setActiveTab('available')} 
          className={`flex flex-col items-center transition-all ${activeTab !== 'profile' ? 'text-purple-600 scale-110' : 'text-slate-300 dark:text-slate-600'}`}
        >
          <Bike size={24} />
          <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">Rutas</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`flex flex-col items-center transition-all ${activeTab === 'profile' ? 'text-purple-600 scale-110' : 'text-slate-300'}`}
        >
          <User size={24} />
          <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">Perfil</span>
        </button>
      </nav>
      </div>
    </div>
  );
}
