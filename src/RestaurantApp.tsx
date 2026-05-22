import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sendNotification } from './utils/notification';
import { 
  ShoppingBag, Utensils, Store as StoreIcon, Package, Search, User, MapPin, Plus, LogOut, 
  ChevronRight, History, Camera, Pencil, ShieldCheck, AlertCircle, Shield, Loader2,
  Mail, Smartphone as PhoneIcon, Check, X, Sparkles, Bike, Navigation, Clock,
  LayoutDashboard, ClipboardList, Settings, Power, Trash2, Edit3, Save, ChevronDown
} from 'lucide-react';
import { useAuth } from './components/FirebaseProvider';
import { Toaster, toast } from 'sonner';
import { db, OperationType, handleFirestoreError } from './firebase';
import { 
  collection, onSnapshot, query, where, orderBy, doc, setDoc, updateDoc, 
  deleteDoc, serverTimestamp, getDocs, addDoc 
} from 'firebase/firestore';
import { Order, Store, Product } from './types';
import { subCategories, storeSubCategories } from './constants';

export default function RestaurantApp() {
  const { user, profile, logout } = useAuth();
  const [activeView, setActiveView] = useState<'orders' | 'products' | 'settings'>('orders');
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProduct, setIsEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | number | null>(null);
  const [settingsForm, setSettingsForm] = useState<Partial<Store>>({});
  const storeImageInputRef = useRef<HTMLInputElement>(null);

  // Notification Permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (profile?.settings?.notifications && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [profile]);

  // Simulated personalized notifications for Restaurant
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !profile?.settings?.notifications || Notification.permission !== 'granted') return;

    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.9) { // 10% chance every 60s
        let title = "Flash Delivery - Socio";
        let body = "¡Tienes pedidos pendientes por preparar! Revisa tu lista.";

        if (orders.some(o => o.status === 'pending')) {
          body = "¡Tienes pedidos pendientes por preparar! Revisa tu lista.";
        } else if (products.some(p => !p.isAvailable)) {
          body = "Tienes productos fuera de disponibilidad. ¡Actualízalos!";
        } else {
          body = "¡Buen día! Mantén tu menú actualizado para mejores ventas.";
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
  }, [profile, orders, products]);

  const daysOfWeek = [
    { id: 'lunes', label: 'Lunes' },
    { id: 'martes', label: 'Martes' },
    { id: 'miercoles', label: 'Miércoles' },
    { id: 'jueves', label: 'Jueves' },
    { id: 'viernes', label: 'Viernes' },
    { id: 'sabado', label: 'Sábado' },
    { id: 'domingo', label: 'Domingo' }
  ];

  const checkIfOpen = useCallback((storeData: Store) => {
    if (storeData.isAutoOpenEnabled === false) return storeData.isOpen;
    if (!storeData.schedule) return storeData.isOpen;
    
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDay = days[now.getDay()];
    const daySchedule = storeData.schedule[currentDay];
    
    if (!daySchedule || daySchedule.isClosed) return false;
    
    const [openH, openM] = daySchedule.open.split(':').map(Number);
    const [closeH, closeM] = daySchedule.close.split(':').map(Number);
    
    const openTime = new Date(now);
    openTime.setHours(openH, openM, 0);
    
    const closeTime = new Date(now);
    closeTime.setHours(closeH, closeM, 0);
    
    // Handle closing time after midnight
    if (closeTime < openTime) {
      closeTime.setDate(closeTime.getDate() + 1);
    }
    
    return now >= openTime && now <= closeTime;
  }, []);

  // Auto-update store status based on schedule
  useEffect(() => {
    if (store && store.isAutoOpenEnabled) {
      const interval = setInterval(async () => {
        const shouldBeOpen = checkIfOpen(store);
        if (shouldBeOpen !== store.isOpen) {
          try {
            await updateDoc(doc(db, 'viveres', store.id), { isOpen: shouldBeOpen });
          } catch (err) {
            console.error("Error auto-updating store status:", err);
          }
        }
      }, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [store, checkIfOpen]);

  // Redirect if not socio
  useEffect(() => {
    if (profile && profile.role !== 'socio' && profile.role !== 'client') {
      window.location.href = '/';
    }
  }, [profile]);

  // Fetch Store
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'viveres'), where('ownerId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const storeData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Store;
          setStore(storeData);
          setLoading(false);
          
          // Initialize settings form if not already editing
          setSettingsForm(prev => {
            if (Object.keys(prev).length === 0) {
              return {
                name: storeData.name,
                description: storeData.description || '',
                type: storeData.type,
                img: storeData.img,
                schedule: storeData.schedule || {},
                isAutoOpenEnabled: storeData.isAutoOpenEnabled !== false
              };
            }
            return prev;
          });
        } else {
          setLoading(false);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'viveres');
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Fetch Orders
  useEffect(() => {
    if (store) {
      const q = query(
        collection(db, 'orders'), 
        where('storeId', '==', store.id),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ords);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      });
      return () => unsubscribe();
    }
  }, [store]);

  // Fetch Products
  useEffect(() => {
    if (store) {
      const q = query(collection(db, 'viveres', store.id, 'products'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(prods);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `viveres/${store.id}/products`);
      });
      return () => unsubscribe();
    }
  }, [store]);

  // Auto-open logic
  useEffect(() => {
    if (store?.isAutoOpenEnabled && store.schedule) {
      const interval = setInterval(async () => {
        const isOpen = checkIfOpen(store);
        if (isOpen !== store.isOpen) {
          try {
            await updateDoc(doc(db, 'viveres', store.id), { isOpen });
          } catch (err) {
            console.error("Auto-open error:", err);
          }
        }
      }, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [store, checkIfOpen]);

  const toggleStoreStatus = async () => {
    if (!store) return;
    try {
      await updateDoc(doc(db, 'viveres', store.id), {
        isOpen: !store.isOpen
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `viveres/${store.id}`);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      let step = 1;
      if (newStatus === 'processing') step = 2;
      if (newStatus === 'ready_for_pickup') step = 3;
      if (newStatus === 'out_for_delivery') step = 4;
      if (newStatus === 'delivered') step = 5;

      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        step: step
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    if (!store) return;
    try {
      await updateDoc(doc(db, 'viveres', store.id, 'products', product.id.toString()), {
        isAvailable: product.isAvailable === false ? true : false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `viveres/${store.id}/products/${product.id}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store || !isEditingProduct || isSaving) return;

    setIsSaving(true);
    try {
      const { id, ...rest } = isEditingProduct;
      const productData = {
        name: rest.name,
        price: Number(rest.price),
        desc: rest.desc || '',
        img: rest.img || '',
        sub: rest.sub || '',
        type: rest.type || '',
        storeId: store.id,
        isAvailable: rest.isAvailable ?? true,
        options: rest.options || []
      };

      if (id && id !== '') {
        await updateDoc(doc(db, 'viveres', store.id, 'products', id.toString()), {
          ...productData,
          updatedAt: serverTimestamp()
        });
        toast.success('Producto actualizado correctamente');
      } else {
        // Prevent duplication by checking if a product with same name already exists in local state
        const exists = products.find(p => (p.name || "").toLowerCase() === (isEditingProduct.name || "").toLowerCase());
        if (exists) {
          toast.error('Ya existe un producto con este nombre');
          setIsSaving(false);
          return;
        }

        await addDoc(collection(db, 'viveres', store.id, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
        toast.success('Producto creado correctamente');
      }
      setShowProductModal(false);
      setIsEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `viveres/${store.id}/products`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string | number | null) => {
    if (!store || productId === null || productId === undefined) {
      console.warn("Cannot delete product: store or productId is missing", { store, productId });
      return;
    }
    const idStr = productId.toString();
    try {
      console.log("Deleting product:", idStr, "from store:", store.id);
      await deleteDoc(doc(db, 'viveres', store.id, 'products', idStr));
      setProductToDelete(null);
      toast.success('Producto eliminado correctamente');
    } catch (err: any) {
      console.error("Error deleting product:", err);
      toast.error(`Error al eliminar el producto: ${err.message || 'Error desconocido'}`);
      handleFirestoreError(err, OperationType.DELETE, `viveres/${store.id}/products/${idStr}`);
    }
  };

  const [registrationImg, setRegistrationImg] = useState<string | null>(null);

  const handleRegistrationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRegistrationImg(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const requestData = {
        type: 'restaurant',
        status: 'pending',
        userId: user.uid,
        data: {
          ownerId: user.uid,
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          img: registrationImg || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
          type: formData.get('type') as string,
          isOpen: false,
          address: formData.get('address') as string,
          phone: profile?.phoneNumber || '',
          email: user.email || '',
          schedule: {
            lunes: { open: '08:00', close: '22:00', isClosed: false },
            martes: { open: '08:00', close: '22:00', isClosed: false },
            miercoles: { open: '08:00', close: '22:00', isClosed: false },
            jueves: { open: '08:00', close: '22:00', isClosed: false },
            viernes: { open: '08:00', close: '22:00', isClosed: false },
            sabado: { open: '08:00', close: '22:00', isClosed: false },
            domingo: { open: '08:00', close: '22:00', isClosed: false },
          },
          isAutoOpenEnabled: true,
          rating: 5.0,
          time: "20-30 min",
          isPartner: true,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'registration_requests'), requestData);
      toast.success('Solicitud enviada con éxito. Tu negocio está en revisión.');
    } catch (err: any) {
      console.error("Error creating registration request:", err);
      toast.error('Error al enviar la solicitud');
      handleFirestoreError(err, OperationType.WRITE, 'registration_requests');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!store || isSaving) return;
    setIsSaving(true);
    try {
      // Ensure we don't save undefined values and keep the ID out of the update
      const { id, ...dataToUpdate } = settingsForm;
      await updateDoc(doc(db, 'viveres', store.id), {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      });
      toast.success('Configuración actualizada correctamente');
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStoreImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSettingsForm(prev => ({ ...prev, img: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!store && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] p-10 shadow-xl max-w-xl w-full"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
              <StoreIcon className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Registra tu Negocio</h1>
              <p className="text-gray-500 text-sm">Completa los datos para empezar a vender</p>
            </div>
          </div>

          <form onSubmit={handleCreateStore} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Nombre del Restaurante</label>
              <input name="name" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" placeholder="Ej. Tacos El Flash" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Descripción Corta</label>
              <input name="description" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" placeholder="Ej. Los mejores tacos de la ciudad" />
            </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Tipo de Negocio</label>
                  <select name="type" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold appearance-none">
                    <optgroup label="Comida">
                      {subCategories.comida.filter(c => c !== 'Todos').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Tienda">
                      {subCategories.tienda.filter(c => c !== 'Todos').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Logo o Foto del Negocio</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                      {registrationImg ? (
                        <img src={registrationImg} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <label className="flex-1">
                      <div className="w-full px-5 py-3 bg-gray-900 text-white text-center rounded-xl font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-800 transition-all">
                        Seleccionar Foto
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleRegistrationImageUpload} />
                    </label>
                  </div>
                </div>
              </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Dirección</label>
              <input name="address" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" placeholder="Calle, Número, Colonia" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Hora de Apertura</label>
                <input type="time" name="openingTime" defaultValue="08:00" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Hora de Cierre</label>
                <input type="time" name="closingTime" defaultValue="22:00" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold" />
              </div>
            </div>
            
            <div className="pt-4 flex gap-4">
              <button 
                type="button"
                onClick={() => window.location.href = '/'}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                Crear Negocio
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  if (store?.status === 'pendiente') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[40px] p-10 shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-orange-600 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">Negocio en Revisión</h1>
          <p className="text-gray-600 font-medium mb-8">
            ¡Gracias por registrarte! Tu solicitud ha sido enviada. 
            Nuestro equipo revisará tus datos y te notificará en cuanto tu negocio sea aprobado para que puedas empezar a vender.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Volver al Inicio
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const isCurrentlyOpen = store ? checkIfOpen(store) : false;

  return (
    <div className="bg-slate-100 dark:bg-slate-950 flex justify-center h-screen overflow-hidden sm:p-4 md:p-8">
      <div id="application-container" className="w-full max-w-md bg-slate-50 dark:bg-slate-950 h-full shadow-2xl relative flex flex-col overflow-hidden transition-colors duration-300 sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 dark:sm:border-slate-900">
        <Toaster position="top-center" richColors />
        
        {/* Header */}
        <header className="p-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
              <StoreIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-gray-900 dark:text-white truncate max-w-[120px] uppercase italic tracking-tighter leading-none">{store?.name}</h2>
              <span className={`text-[10px] uppercase font-black ${isCurrentlyOpen ? 'text-green-500' : 'text-red-500'}`}>
                {isCurrentlyOpen ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleStoreStatus}
              className={`p-3 rounded-2xl transition-all active:scale-90 ${store?.isOpen ? 'bg-red-50 dark:bg-red-900/10 text-red-600' : 'bg-green-50 dark:bg-green-900/10 text-green-600'}`}
              title={store?.isOpen ? 'Cerrar Negocio' : 'Abrir Negocio'}
            >
              <Power size={20} />
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-orange-600 transition-colors"
              title="Cambiar a App Cliente"
            >
              <Navigation size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar p-6 bg-slate-50 dark:bg-slate-950">
          <AnimatePresence mode="wait">
            {activeView === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
                  <p className="text-gray-500">Gestiona los pedidos entrantes y su preparación</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-gray-600">En tiempo real</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {orders.length === 0 ? (
                  <div className="col-span-full py-20 bg-white border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center">
                    <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No hay pedidos</h3>
                    <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <motion.div 
                      key={order.id}
                      layout
                      className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
                            <img src={order.img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
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
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {order.date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">${order.price.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{order.items} items</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Detalles del Pedido</h4>
                        <ul className="space-y-1">
                          {order.details.map((detail, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-300 rounded-full" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                          >
                            <Utensils className="w-4 h-4" />
                            Aceptar y Preparar
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                            className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Marcar como Listo
                          </button>
                        )}
                        {order.status === 'ready_for_pickup' && (
                          <div className="flex-1 flex flex-col gap-2">
                            <div className="p-3 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium flex items-center gap-2">
                              <Bike className="w-4 h-4" />
                              Esperando repartidor...
                            </div>
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                              className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors"
                            >
                              <Package className="w-4 h-4" />
                              Entregar a Repartidor
                            </button>
                          </div>
                        )}
                        {['out_for_delivery', 'delivered'].includes(order.status) && (
                          <div className="flex-1 p-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" />
                            {order.status === 'out_for_delivery' ? 'En manos del repartidor' : 'Pedido completado'}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'products' && (
            <motion.div 
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
                  <p className="text-gray-500">Gestiona tu menú y disponibilidad</p>
                </div>
                <button 
                  onClick={() => {
                    const storeType = store?.type || 'Mexicana';
                    const isFoodStore = subCategories.comida.includes(storeType);
                    const productType = isFoodStore ? 'comida' : 'tienda';
                    
                    const defaultSub = isFoodStore 
                      ? storeType 
                      : (storeSubCategories[storeType] ? storeSubCategories[storeType][1] : storeType);
                    
                    setIsEditingProduct({
                      id: '',
                      name: '',
                      price: 0,
                      desc: '',
                      img: '',
                      type: productType as any,
                      sub: defaultSub,
                      extras: [],
                      personalizar: []
                    });
                    setShowProductModal(true);
                  }}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Producto
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <div key={product.id} className="bg-white border border-gray-200 rounded-3xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      <img src={product.img} alt={product.name} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${product.isAvailable === false ? 'grayscale opacity-50' : ''}`} referrerPolicy="no-referrer" />
                      <div className="absolute top-4 left-4">
                        <button 
                          onClick={() => toggleProductAvailability(product)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${product.isAvailable === false ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                        >
                          {product.isAvailable === false ? 'No Disponible' : 'Disponible'}
                        </button>
                      </div>
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                          onClick={() => {
                            setIsEditingProduct(product);
                            setShowProductModal(true);
                          }}
                          className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-gray-600 hover:text-orange-500 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setProductToDelete(product.id)}
                          className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-gray-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                        <span className="font-bold text-orange-600">${product.price.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4">{product.desc}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold uppercase">
                          {product.sub}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full font-bold uppercase">
                          {product.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeView === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl space-y-8"
            >
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Ajustes</h1>
                <p className="text-gray-500">Configura la información de tu negocio</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-3xl p-8 space-y-6">
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Imagen del Negocio</label>
                  <div className="relative w-full h-48 bg-gray-100 rounded-2xl overflow-hidden group">
                    <img src={settingsForm.img || store?.img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => storeImageInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold"
                    >
                      <Camera className="w-6 h-6" />
                      Cambiar Imagen
                    </button>
                    <input 
                      type="file" 
                      ref={storeImageInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleStoreImageUpload} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Nombre</label>
                    <input 
                      type="text" 
                      value={settingsForm.name || ''} 
                      onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Tipo</label>
                    <select 
                      value={settingsForm.type || ''} 
                      onChange={e => setSettingsForm({...settingsForm, type: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-bold appearance-none"
                    >
                      <optgroup label="Comida">
                        {subCategories.comida.filter(c => c !== 'Todos').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Tienda">
                        {subCategories.tienda.filter(c => c !== 'Todos').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Descripción</label>
                  <textarea 
                    value={settingsForm.description || ''}
                    onChange={e => setSettingsForm({...settingsForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none h-32 resize-none font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Dirección</label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="truncate font-bold">{store?.address}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider italic">Horario de Servicio</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Horario Automático</span>
                      <button
                        onClick={() => setSettingsForm(prev => ({ ...prev, isAutoOpenEnabled: !prev.isAutoOpenEnabled }))}
                        className={`w-10 h-5 rounded-full transition-colors relative ${settingsForm.isAutoOpenEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settingsForm.isAutoOpenEnabled ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-gray-400 font-medium uppercase mb-4">Configura las horas de apertura y cierre para cada día de la semana.</p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {daysOfWeek.map(day => {
                      const daySched = settingsForm.schedule?.[day.id] || { open: settingsForm.openingTime || '08:00', close: settingsForm.closingTime || '22:00', isClosed: false };
                      return (
                        <div key={day.id} className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="w-24">
                            <span className="text-sm font-black uppercase italic tracking-tighter">{day.label}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input 
                              type="time" 
                              value={daySched.open}
                              disabled={daySched.isClosed}
                              onChange={(e) => {
                                const newSched = { ...settingsForm.schedule, [day.id]: { ...daySched, open: e.target.value } };
                                setSettingsForm({...settingsForm, schedule: newSched});
                              }}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                              type="time" 
                              value={daySched.close}
                              disabled={daySched.isClosed}
                              onChange={(e) => {
                                const newSched = { ...settingsForm.schedule, [day.id]: { ...daySched, close: e.target.value } };
                                setSettingsForm({...settingsForm, schedule: newSched});
                              }}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            />
                          </div>
                          
                          <button
                            onClick={() => {
                              const newSched = { ...settingsForm.schedule, [day.id]: { ...daySched, isClosed: !daySched.isClosed } };
                              setSettingsForm({...settingsForm, schedule: newSched});
                            }}
                            className={`ml-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${daySched.isClosed ? 'bg-red-500 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}
                          >
                            {daySched.isClosed ? 'Cerrado' : 'Abierto'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="shrink-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 h-20 flex items-center justify-around px-6 z-50 shadow-2xl transition-colors">
        <button 
          onClick={() => setActiveView('orders')}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === 'orders' ? 'text-orange-600 scale-105' : 'text-gray-300 dark:text-slate-600'}`}
        >
          <div className="relative">
            <ClipboardList className="w-6 h-6" />
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                {orders.filter(o => o.status === 'pending').length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Pedidos</span>
        </button>
        <button 
          onClick={() => setActiveView('products')}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === 'products' ? 'text-orange-600 scale-105' : 'text-gray-300 dark:text-slate-600'}`}
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Menu</span>
        </button>
        <button 
          onClick={() => setActiveView('settings')}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === 'settings' ? 'text-orange-600 scale-105' : 'text-gray-300 dark:text-slate-600'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Ajustes</span>
        </button>
        <button 
          onClick={() => logout()}
          className="flex flex-col items-center gap-1 transition-all text-gray-300 dark:text-slate-600 hover:text-red-500"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Salir</span>
        </button>
      </nav>

      {/* Product Modal */}
      <AnimatePresence>
        {showProductModal && isEditingProduct && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowProductModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-b-[40px] p-0 w-full max-h-[90%] overflow-hidden shadow-2xl flex flex-col"
            >
            <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">
                {(isEditingProduct.id && isEditingProduct.id !== '') ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button 
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Nombre del Producto</label>
                    <input 
                      type="text" 
                      required
                      value={isEditingProduct.name}
                      onChange={e => setIsEditingProduct({...isEditingProduct, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="Ej. Pizza Margarita"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Precio ($)</label>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      value={isEditingProduct.price}
                      onChange={e => setIsEditingProduct({...isEditingProduct, price: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Descripción</label>
                  <textarea 
                    required
                    value={isEditingProduct.desc}
                    onChange={e => setIsEditingProduct({...isEditingProduct, desc: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none h-24 resize-none"
                    placeholder="Describe los ingredientes o detalles del producto..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">URL de la Imagen</label>
                  <input 
                    type="url" 
                    required
                    value={isEditingProduct.img}
                    onChange={e => setIsEditingProduct({...isEditingProduct, img: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Categoría</label>
                    <select 
                      value={isEditingProduct.sub}
                      onChange={e => setIsEditingProduct({...isEditingProduct, sub: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none font-bold"
                    >
                      {(() => {
                        const typeToUse = isEditingProduct.type === 'comida' ? (store?.type || 'Mexicana') : isEditingProduct.type;
                        const categories = (storeSubCategories[typeToUse] || 
                          (isEditingProduct.type === 'comida' ? subCategories.comida : subCategories.tienda)
                        ).filter(c => c !== 'Todos');
                        
                        return categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Tipo de Producto</label>
                    <select 
                      value={isEditingProduct.type}
                      onChange={e => setIsEditingProduct({...isEditingProduct, type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none"
                    >
                      <option value="comida">Comida</option>
                      <option value="tienda">Tienda</option>
                      <option value="paquete">Paquete</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setIsEditingProduct({...isEditingProduct, isAvailable: !isEditingProduct.isAvailable})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isEditingProduct.isAvailable !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEditingProduct.isAvailable !== false ? 'right-1' : 'left-1'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Producto Disponible</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase">Si se desactiva, los clientes no podrán pedirlo</p>
                  </div>
                </div>

                {/* Options Management */}
                <div className="space-y-4 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider italic">Opciones de Personalización</label>
                    <button 
                      type="button"
                      onClick={() => {
                        const newOption = {
                          id: Date.now().toString(),
                          name: '',
                          type: 'single' as const,
                          required: false,
                          choices: [{ id: Date.now().toString() + '-1', name: '', price: 0 }]
                        };
                        setIsEditingProduct({
                          ...isEditingProduct,
                          options: [...(isEditingProduct.options || []), newOption]
                        });
                      }}
                      className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-purple-100 transition-colors"
                    >
                      <Plus size={14} />
                      Agregar Grupo
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(isEditingProduct.options || []).map((option, optIdx) => (
                      <div key={option.id} className="p-6 bg-slate-50 rounded-[30px] border border-slate-100 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              type="text"
                              placeholder="Nombre del grupo (ej. Salsas)"
                              value={option.name}
                              onChange={e => {
                                const newOptions = [...(isEditingProduct.options || [])];
                                newOptions[optIdx].name = e.target.value;
                                setIsEditingProduct({...isEditingProduct, options: newOptions});
                              }}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <select 
                              value={option.type}
                              onChange={e => {
                                const newOptions = [...(isEditingProduct.options || [])];
                                newOptions[optIdx].type = e.target.value as 'single' | 'multiple';
                                setIsEditingProduct({...isEditingProduct, options: newOptions});
                              }}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                            >
                              <option value="single">Selección Única</option>
                              <option value="multiple">Selección Múltiple (Checkbox)</option>
                            </select>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const newOptions = (isEditingProduct.options || []).filter((_, i) => i !== optIdx);
                              setIsEditingProduct({...isEditingProduct, options: newOptions});
                            }}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opciones / Variantes</span>
                            <button 
                              type="button"
                              onClick={() => {
                                const newOptions = [...(isEditingProduct.options || [])];
                                newOptions[optIdx].choices.push({ id: Date.now().toString(), name: '', price: 0 });
                                setIsEditingProduct({...isEditingProduct, options: newOptions});
                              }}
                              className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline"
                            >
                              + Agregar Opción
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {option.choices.map((choice, choiceIdx) => (
                              <div key={choice.id} className="flex items-center gap-2">
                                <input 
                                  type="text"
                                  placeholder="Nombre (ej. Roja)"
                                  value={choice.name}
                                  onChange={e => {
                                    const newOptions = [...(isEditingProduct.options || [])];
                                    newOptions[optIdx].choices[choiceIdx].name = e.target.value;
                                    setIsEditingProduct({...isEditingProduct, options: newOptions});
                                  }}
                                  className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <div className="relative w-24">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                  <input 
                                    type="number"
                                    placeholder="0"
                                    value={choice.price}
                                    onChange={e => {
                                      const newOptions = [...(isEditingProduct.options || [])];
                                      newOptions[optIdx].choices[choiceIdx].price = Number(e.target.value);
                                      setIsEditingProduct({...isEditingProduct, options: newOptions});
                                    }}
                                    className="w-full pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newOptions = [...(isEditingProduct.options || [])];
                                    newOptions[optIdx].choices = newOptions[optIdx].choices.filter((_, i) => i !== choiceIdx);
                                    setIsEditingProduct({...isEditingProduct, options: newOptions});
                                  }}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {(isEditingProduct.id && isEditingProduct.id !== '') ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white dark:bg-slate-900 rounded-[40px] p-8 w-full max-w-sm text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 italic uppercase tracking-tighter">¿Eliminar producto?</h3>
              <p className="text-gray-500 text-sm mb-8">Esta acción no se puede deshacer. El producto dejará de estar disponible para los clientes.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteProduct(productToDelete)}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-red-100"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
