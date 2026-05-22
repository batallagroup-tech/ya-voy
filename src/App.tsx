import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Utensils, Store as StoreIcon, Package, Search, User, MapPin, Plus, LogOut, 
  ChevronRight, History, Camera, Pencil, ShieldCheck, AlertCircle, Shield, Loader2,
  Clock, ChevronLeft, Lock, Gift,
  Mail, Smartphone as PhoneIcon, Check, X, Sparkles, Bike, Navigation, Moon, Sun, Ticket, Heart
} from 'lucide-react';

import { Toaster, toast } from 'sonner';
import { LoginScreen, useAuth } from './components/FirebaseProvider';
import { SuccessModal } from './components/SuccessModal';
import { ChatModal } from './components/ChatModal';
import { VerificationSteps } from './components/VerificationSteps';
import { OnboardingFlow } from './components/OnboardingFlow';
import { OrdersScreen } from './components/OrdersScreen';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutScreen } from './components/CheckoutScreen';
import { AddressManager } from './components/AddressManager';
import { PaymentManager } from './components/PaymentManager';
import { SecuritySettings } from './components/SecuritySettings';
import { ReferralManager } from './components/ReferralManager';
import { OrderDetailModal } from './components/OrderDetailModal';
import { ImageCropper } from './components/ImageCropper';
import { RatingModal } from './components/RatingModal';
import { NativeAd } from './components/NativeAd';
import { BenefitsCenter } from './components/BenefitsCenter';

import { subCategories, storeSubCategories, FEES } from './constants';
import { Order, CartItem, Address, Card, Store, Product } from './types';
import { db, OperationType, handleFirestoreError } from './firebase';
import { collection, onSnapshot, query, where, orderBy, doc, setDoc, deleteDoc, Timestamp, getDocs, updateDoc } from 'firebase/firestore';

export default function App() {
  const { user, profile, loading, logout, deleteAccount, sendPasswordReset, updatePhoto, updateName, updateSettings, verifyAccount, sendPhoneCode, confirmPhoneCode, isUpdatingRole, setRole, isConnectionHealthy } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [category, setCategory] = useState<'comida' | 'tienda' | 'paquete'>('comida');
  const [subCategory, setSubCategory] = useState('Todos');
  const [showCart, setShowCart] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [showPaymentManager, setShowPaymentManager] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showReferralManager, setShowReferralManager] = useState(false);
  const [showVerifyFlow, setShowVerifyFlow] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [showPromoSuccess, setShowPromoSuccess] = useState(false);
  const [isFirstOrder, setIsFirstOrder] = useState(true);
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');

  // Get user's current location for distance checks
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn('Error getting user location:', err)
      );
    }
  }, []);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Notification Permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (profile?.settings?.notifications && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [profile]);

  const checkIfOpen = useCallback((store: Store) => {
    if (store.isAutoOpenEnabled === false) return store.isOpen;
    if (!store.schedule) return store.isOpen !== false;
    
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDay = days[now.getDay()];
    const daySchedule = store.schedule[currentDay];
    
    if (!daySchedule || daySchedule.isClosed) return false;
    
    const [openH, openM] = daySchedule.open.split(':').map(Number);
    const [closeH, closeM] = daySchedule.close.split(':').map(Number);
    
    const openTime = new Date(now);
    openTime.setHours(openH, openM, 0);
    
    const closeTime = new Date(now);
    closeTime.setHours(closeH, closeM, 0);
    
    if (closeTime < openTime) {
      closeTime.setDate(closeTime.getDate() + 1);
    }
    
    return now >= openTime && now <= closeTime;
  }, []);

  const [partnerStores, setPartnerStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [partnerProducts, setPartnerProducts] = useState<Product[]>([]);

  const handleStoreSelect = async (id: string | null) => {
    setSelectedStoreId(id);
    setSubCategory('Todos');
  };

  // Fetch all products from all partner stores
  useEffect(() => {
    if (partnerStores.length === 0) {
      setPartnerProducts([]);
      return;
    }

    // Remove products from stores that are no longer in partnerStores
    setPartnerProducts(prev => prev.filter(p => partnerStores.some(s => s.id === p.storeId)));

    const unsubscribes = partnerStores.map(store => {
      const q = query(collection(db, 'viveres', store.id, 'products'));
      return onSnapshot(q, (snapshot) => {
        setPartnerProducts(prev => {
          // Remove old products for this store
          const filtered = prev.filter(p => p.storeId !== store.id);
          // Add new products
          const newProducts = snapshot.docs.map(doc => ({ id: `${store.id}-${doc.id}`, storeId: store.id, ...doc.data() } as Product));
          return [...filtered, ...newProducts];
        });
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `viveres/${store.id}/products`);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [partnerStores]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userData, setUserData] = useState({
    nombre: "",
    fotoUrl: null as string | null,
    verificado: false,
    email: "",
    emailVerified: false,
    phoneNumber: "",
    phoneVerified: false,
    documentsStatus: 'none' as 'none' | 'pending' | 'verified' | 'rejected',
    direcciones: [] as Address[],
    tarjetas: [] as Card[],
    favoritos: [] as string[],
    points: 0,
    balance: 0,
    referralCode: "",
    uid: "",
    settings: {
      notifications: true,
      darkMode: false,
      language: 'es'
    }
  });

  const hasTriggeredVerify = useRef(false);

  const primaryAddress = useMemo(() => userData.direcciones.find(a => a.primary)?.address, [userData.direcciones]);

  const toggleFavorite = async (productId: string) => {
    if (!user) return;
    
    const isFav = userData.favoritos.includes(productId);
    const newFavs = isFav 
      ? userData.favoritos.filter(id => id !== productId)
      : [...userData.favoritos, productId];

    try {
      // Update local state for immediate feedback
      setUserData(prev => ({ ...prev, favoritos: newFavs }));
      
      // Persist to user profile
      await updateDoc(doc(db, 'users', user.uid), {
        favoritos: newFavs
      });
      
      toast.success(isFav ? "Eliminado de favoritos" : "Agregado a favoritos", {
        icon: isFav ? "💔" : "❤️"
      });
    } catch (err) {
      console.error("Error toggling favorite:", err);
      // Rollback on error
      setUserData(prev => ({ ...prev, favoritos: userData.favoritos }));
      toast.error("Error al guardar favoritos");
    }
  };

  // Sync theme settings
  useEffect(() => {
    if (userData.settings?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userData.settings?.darkMode]);

  // Sync profile data
  useEffect(() => {
    if (profile || user) {
      console.log("Syncing profile data:", { profile, userPhoto: user?.photoURL });
      setUserData(prev => ({
        ...prev,
        nombre: profile?.displayName || user?.displayName || "Usuario",
        email: profile?.email || user?.email || "",
        emailVerified: user?.emailVerified || profile?.emailVerified || false,
        fotoUrl: profile?.photoURL || user?.photoURL || null,
        phoneNumber: profile?.phoneNumber || user?.phoneNumber || "",
        phoneVerified: profile?.phoneVerified || false,
        verificado: profile?.verificado || false,
        documentsStatus: profile?.driverProfile?.documents?.status || 'none',
        onboardingCompleted: profile?.onboardingCompleted || false,
        settings: profile?.settings || prev.settings,
        favoritos: profile?.favoritos || prev.favoritos,
        tarjetas: profile?.tarjetas || prev.tarjetas || [],
        points: profile?.points || 0,
        balance: profile?.balance || 0,
        referralCode: profile?.referralCode || "",
        uid: profile?.uid || user?.uid || ""
      }));
      
      if (profile && !profile.onboardingCompleted && !hasTriggeredVerify.current) {
        setShowOnboarding(true);
        hasTriggeredVerify.current = true;
      }
    }
  }, [profile, user]);

  // Fetch addresses
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'addresses'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const addrs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Address));
        setUserData(prev => ({ ...prev, direcciones: addrs }));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/addresses`);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Fetch orders
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ords);
        if (!snapshot.empty) {
          setIsFirstOrder(false);
        } else {
          setIsFirstOrder(true);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      });
      return () => unsubscribe();
    }
  }, [user]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch Partner Stores
  useEffect(() => {
    const q = query(collection(db, 'viveres'), where('status', '==', 'aprobado'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const found = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setPartnerStores(found);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'viveres');
    });
    return () => unsubscribe();
  }, []);

  const allVisibleStores = useMemo(() => {
    const combined = [...partnerStores].filter(checkIfOpen);

    // Filter by distance (max 10km) if user location is available
    if (userLocation) {
      return combined.filter(store => {
        if (!store.location || (store.location.lat === 0 && store.location.lng === 0)) return true; // Keep stores with unknown location for now
        const dist = getDistance(userLocation[0], userLocation[1], store.location.lat, store.location.lng);
        return dist <= 10; // 10km limit
      });
    }
    return combined;
  }, [partnerStores, checkIfOpen, userLocation]);

  const filteredProducts = useMemo(() => {
    // Deduplicate products by ID
    const combined = [...partnerProducts];
    const uniqueMap = new Map<string, Product>();
    combined.forEach(p => {
      if (p.id) uniqueMap.set(p.id.toString(), p);
    });
    
    let filtered = Array.from(uniqueMap.values());
    
    if (activeTab === 'home') {
      if (selectedStoreId) {
        const selectedStore = allVisibleStores.find(s => s.id === selectedStoreId);
        if (selectedStore) {
          const isPartner = partnerStores.some(ps => ps.id === selectedStoreId);
          if (isPartner) {
            if (subCategory !== 'Todos') {
              return partnerProducts.filter(p => p.storeId === selectedStoreId && p.sub === subCategory && p.isAvailable !== false);
            }
            return partnerProducts.filter(p => p.storeId === selectedStoreId && p.isAvailable !== false);
          }
        }
      }
      
      filtered = combined.filter(p => p.type === category && p.isAvailable !== false);
      if (subCategory !== 'Todos') filtered = filtered.filter(p => p.sub === subCategory);
    } else if (activeTab === 'explorar') {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = combined.filter(p => 
          ((p.name?.toLowerCase() || "").includes(q) || 
          (p.sub?.toLowerCase() || "").includes(q)) &&
          p.isAvailable !== false
        );
      } else {
        filtered = combined.filter(p => p.isAvailable !== false);
      }
    }
    return filtered;
  }, [category, subCategory, activeTab, searchQuery, selectedStoreId, partnerProducts, partnerStores, allVisibleStores]);

  const addCard = useCallback(async (card: any) => {
    if (!user) return;
    const newTarjeta = { id: Date.now().toString(), ...card };
    const newTarjetas = [...userData.tarjetas, newTarjeta];
    
    // Update local state
    setUserData(prev => ({ ...prev, tarjetas: newTarjetas }));
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        tarjetas: newTarjetas,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      // Rollback on error
      setUserData(prev => ({ ...prev, tarjetas: userData.tarjetas }));
    }
  }, [user, userData.tarjetas]);

  const removeCard = useCallback(async (id: string) => {
    if (!user) return;
    const newTarjetas = userData.tarjetas.filter(t => t.id !== id);
    
    // Update local state
    setUserData(prev => ({ ...prev, tarjetas: newTarjetas }));
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        tarjetas: newTarjetas,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      // Rollback
      setUserData(prev => ({ ...prev, tarjetas: userData.tarjetas }));
    }
  }, [user, userData.tarjetas]);

  const saveAddress = useCallback(async (addr: Address) => {
    if (!user) return;
    const addrId = addr.id || doc(collection(db, 'users', user.uid, 'addresses')).id;
    const addrRef = doc(db, 'users', user.uid, 'addresses', addrId);
    try {
      await setDoc(addrRef, {
        ...addr,
        id: addrId,
        userId: user.uid,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/addresses/${addrId}`);
    }
  }, [user]);

  const removeAddress = useCallback(async (id: string) => {
    if (!user) return;
    const addrRef = doc(db, 'users', user.uid, 'addresses', id);
    try {
      await deleteDoc(addrRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/addresses/${id}`);
    }
  }, [user]);

  const setPrimaryAddress = useCallback(async (id: string) => {
    if (!user) return;
    try {
      // Find the current primary and the new primary to update only necessary docs
      const updates = userData.direcciones.map(addr => {
        const addrRef = doc(db, 'users', user.uid, 'addresses', addr.id);
        const isNewPrimary = addr.id === id;
        // Only update if the primary status actually changes
        if (addr.primary !== isNewPrimary) {
          return setDoc(addrRef, { ...addr, primary: isNewPrimary }, { merge: true });
        }
        return null;
      }).filter(p => p !== null);

      await Promise.all(updates);
      toast.success("Dirección principal actualizada");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/addresses/${id}`);
    }
  }, [user, userData.direcciones]);

  const applyPromo = () => {
    setPromoApplied(true);
    setShowPromoSuccess(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cancelOrder = async (orderId: string) => {
    const orderToCancel = orders.find(o => o.id === orderId);
    if (!orderToCancel) return;

    let penalty = 0;
    if (orderToCancel.step >= 2) {
      penalty = FEES.CANCELLATION; 
    }

    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: 'cancelled', 
        penalty 
      });
      setSelectedOrder(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const handleCompleteOrder = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    try {
      await updateDoc(doc(db, 'orders', id), { 
        status: 'delivered' 
      });
      setSelectedOrder(null);
      setRatingOrder(order);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${id}`);
    }
  };

  const handleProcessPayment = async (paymentData: any) => {
    if (!user) return;
    
    const storeIdToUse = selectedStoreId || cart[0]?.storeId || null;
    const currentStore = allVisibleStores.find(s => s.id === storeIdToUse);

    const subtotal = cart.reduce((s, i) => s + i.finalPrice, 0);
    const shippingFee = isFirstOrder ? 0 : FEES.SHIPPING;
    const appFee = FEES.SERVICE;
    const total = subtotal + shippingFee + appFee;

    const newOrderData = {
      userId: user.uid,
      userName: userData?.displayName || user.displayName || 'Cliente',
      userPhone: userData?.phoneNumber || user.phoneNumber || '',
      name: cart[0]?.name || "Pedido Mixto",
      img: cart[0]?.img || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100",
      items: cart.length,
      price: subtotal,
      subtotal: subtotal,
      deliveryFee: shippingFee,
      appFee: appFee,
      total: total,
      penalty: 0,
      date: new Date().toLocaleString(),
      status: "pending",
      step: 1,
      details: cart.map(item => {
        const optionsText = item.selectedOptions && item.selectedOptions.length > 0 
          ? item.selectedOptions.map(opt => `${opt.optionName}: ${opt.choices.map(c => c.name).join(', ')}`).join(' | ')
          : '';
        const extrasText = item.selectedExtras && item.selectedExtras.length > 0
          ? `Extras: ${item.selectedExtras.map(e => e.name).join(', ')}`
          : '';
        const customText = item.customChoices && item.customChoices.length > 0
          ? `Personalización: ${item.customChoices.join(', ')}`
          : '';
        
        const fullDetails = [optionsText, extrasText, customText].filter(Boolean).join(' - ');
        return `${item.qty}x ${item.name}${fullDetails ? ` [${fullDetails}]` : ''}${item.note ? ` (Nota: ${item.note})` : ''}`;
      }),
      address: paymentData.address.address,
      deliveryLat: paymentData.address.location?.lat || null,
      deliveryLng: paymentData.address.location?.lng || null,
      paymentMethod: paymentData.method,
      storeId: storeIdToUse,
      storeName: currentStore?.name || "Restaurante",
      createdAt: Timestamp.now(),
      deliveryKeyword: ["AGUACATE", "BATERIA", "CEPILLO", "DIAMANTE", "ESPEJO", "FUEGO", "GUITARRA", "HELADO", "IGLU", "JIRAFA", "KOALA", "LIMON", "MANZANA", "NUEZ", "OSO", "PIANO", "QUESO", "RATON", "SOL", "TIGRE", "UVA", "VELA", "WIFI", "XILOFONO", "YOGUR", "ZAPATO"][Math.floor(Math.random() * 26)]
    };

    try {
      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, { ...newOrderData, id: orderRef.id });
      setCart([]);
      setPaymentSuccess(true);
      setShowCheckout(false);
      setIsFirstOrder(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
      toast.error("Hubo un error al procesar tu pedido. Por favor intenta de nuevo.");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB for selection, cropper will reduce it)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Por favor elige una menor a 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: string) => {
    setImageToCrop(null);
    setIsUploadingPhoto(true);
    try {
      // Optimistic update
      setUserData(prev => ({ ...prev, fotoUrl: croppedImage }));
      await updatePhoto(croppedImage);
      toast.success("¡Foto de perfil actualizada con éxito!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Error al actualizar la foto.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    try {
      await updateName(tempName);
      setIsEditingName(false);
    } catch (err) {
      console.error("Error saving name:", err);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!newPhone.trim()) {
      toast.error("Ingresa un número de teléfono");
      return;
    }
    setIsVerifyingPhone(true);
    try {
      await sendPhoneCode(newPhone);
      setPhoneStep('verify');
      toast.success("Código enviado");
    } catch (err) {
      console.error("Error sending phone code:", err);
      toast.error("Error al enviar el código");
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleConfirmPhoneCode = async () => {
    if (verificationCode.length < 6) {
      toast.error("Ingresa el código de 6 dígitos");
      return;
    }
    setIsVerifyingPhone(true);
    try {
      await confirmPhoneCode(newPhone, verificationCode);
      setIsEditingPhone(false);
      setPhoneStep('input');
      setNewPhone("");
      setVerificationCode("");
      toast.success("Teléfono actualizado con éxito");
    } catch (err) {
      console.error("Error confirming phone code:", err);
      toast.error("Código incorrecto");
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  if (!isConnectionHealthy) {
    return <LoginScreen />; // LoginScreen handles the connection error UI
  }

  if (loading || (user && !profile)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-950 z-[200]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin text-purple-600" size={48} />
          <p className="text-slate-500 font-bold animate-pulse">Sincronizando datos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-950 flex justify-center h-screen overflow-hidden sm:p-4 md:p-8">
      <div id="application-container" className="w-full max-w-md bg-slate-50 dark:bg-slate-950 h-full shadow-2xl relative flex flex-col overflow-hidden transition-colors duration-300 sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 dark:sm:border-slate-900">
        <Toaster position="top-center" richColors />
        <main className="flex-1 overflow-y-auto no-scrollbar relative bg-slate-50 dark:bg-slate-950">
          <>
            {activeTab === 'home' && (
          <div className="animate-in fade-in">
            <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center transition-colors duration-300">
                <div onClick={() => setShowAddressManager(true)} className="flex items-center space-x-2 cursor-pointer max-w-[70%]">
                   <div className="bg-purple-600 p-2 rounded-xl text-white shrink-0"><MapPin size={20} /></div>
                   <div className="min-w-0">
                     <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase truncate">Entregar en</p>
                     <div className="flex items-center space-x-1">
                        <p className="text-sm font-black dark:text-white truncate">
                          {userData.direcciones.find(d => d.primary)?.label || 'Seleccionar...'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          • {userData.direcciones.find(d => d.primary)?.address?.split(',')[1] || ''}
                        </p>
                     </div>
                   </div>
                </div>
               <div className="flex items-center space-x-3">
                 <button onClick={() => setShowCart(true)} className="relative p-3 bg-purple-50 dark:bg-purple-900/30 rounded-2xl text-purple-600">
                    <ShoppingBag size={24} />
                    {cart.length > 0 && <span className="absolute top-2 right-2 w-5 h-5 bg-purple-600 border-2 border-white dark:border-slate-900 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{cart.length}</span>}
                 </button>
                 <div 
                   onClick={() => setActiveTab('perfil')}
                   className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-purple-600 font-black text-xs overflow-hidden cursor-pointer shadow-sm"
                 >
                   {userData.fotoUrl ? (
                     <img src={userData.fotoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                   ) : (
                     (userData.nombre || "U").substring(0, 1).toUpperCase()
                   )}
                 </div>
               </div>
            </header>

            {isFirstOrder && !promoApplied && (
              <div className="px-6 mt-6 animate-in slide-in-from-top duration-500">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[35px] p-6 text-white relative overflow-hidden shadow-xl">
                   <h2 className="text-2xl font-black italic relative z-10">¡Envío Gratis!</h2>
                   <p className="text-white/80 text-xs mt-1 font-bold relative z-10">En tu primer pedido.</p>
                   <button 
                     onClick={applyPromo}
                     className="mt-4 px-6 py-2 rounded-full text-[10px] font-black uppercase relative z-10 active:scale-95 transition-all bg-white text-purple-600"
                   >
                     Aprovechar
                   </button>
                   <div className="absolute -right-4 -bottom-4 opacity-20"><Package size={120} /></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 px-6 mt-8">
              {[{id:'comida', icon:<Utensils/>, l:'COMIDA'}, {id:'tienda', icon:<StoreIcon/>, l:'TIENDA'}, {id:'paquete', icon:<Package/>, l:'ENVÍO'}].map(cat => (
                <button key={cat.id} onClick={() => { setCategory(cat.id as any); setSubCategory('Todos'); setSelectedStoreId(null); }} className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all ${category === cat.id ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-transparent text-purple-600 shadow-sm'}`}>
                  {cat.icon}
                  <span className="text-[10px] font-black mt-2 uppercase">{cat.l}</span>
                </button>
              ))}
            </div>

            <div className="mt-8">
              {category === 'tienda' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {!selectedStoreId ? (
                    <div className="px-6 space-y-8">
                      <div className="flex justify-between items-end">
                        <div>
                          <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white leading-none">Explora Tiendas</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Los mejores comercios cerca de ti</p>
                        </div>
                        {/* No search loader needed as AI search is removed */}
                      </div>

                      {/* Aviso de Cadenas Grandes */}
                      <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800/50 rounded-[35px] space-y-3 shadow-sm">
                        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
                          <AlertCircle size={24} />
                          <h4 className="text-sm font-black uppercase tracking-tight">Aviso Importante</h4>
                        </div>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 font-bold leading-relaxed">
                          Actualmente no contamos con el apoyo de grandes cadenas como <span className="text-amber-900 dark:text-amber-100">OXXO, 3B, Neto, Aurrera</span>, etc., debido a limitaciones técnicas para conectar sus inventarios en tiempo real.
                        </p>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 font-bold leading-relaxed">
                          Sin embargo, puedes comprar en todas las <span className="text-amber-900 dark:text-amber-100">tiendas locales</span> registradas.
                        </p>
                        <div className="pt-2 border-t border-amber-200/50 dark:border-amber-800/30">
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest italic">
                            ¿Tienes una tienda? Regístrate y sube tus productos desde nuestra App de Restaurantes.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 pb-24">
                        {allVisibleStores.length === 0 ? (
                          <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <StoreIcon className="mx-auto text-slate-300 mb-4" size={64} />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay tiendas disponibles</p>
                            <button 
                              onClick={() => {
                                const primary = userData.direcciones.find(d => d.primary);
                                // findNearbyStores removed
                              }}
                              className="mt-6 px-8 py-3 bg-purple-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg"
                            >
                              Reintentar búsqueda
                            </button>
                          </div>
                        ) : (
                          allVisibleStores.map((store, idx) => (
                            <React.Fragment key={store.id}>
                              {idx === 2 && <NativeAd />}
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => handleStoreSelect(store.id)}
                                className="relative group cursor-pointer"
                              >
                                <div className="aspect-[16/9] rounded-[40px] overflow-hidden relative shadow-xl">
                                  <img src={store.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                  <div className="absolute bottom-0 left-0 right-0 p-8">
                                    <div className="flex justify-between items-end">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <span className="px-3 py-1 bg-purple-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">{store.type}</span>
                                          <span className={`px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded-full ${checkIfOpen(store) ? 'text-green-400' : 'text-red-400'}`}>
                                            {checkIfOpen(store) ? 'Abierto' : 'Cerrado'}
                                          </span>
                                        </div>
                                        <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{store.name}</h4>
                                        <div className="flex items-center space-x-4 text-white/70 text-[10px] font-bold uppercase tracking-widest">
                                          <div className="flex items-center space-x-1"><MapPin size={12} /><span>{store.distance}</span></div>
                                          <div className="flex items-center space-x-1"><Clock size={12} /><span>{store.time}</span></div>
                                        </div>
                                      </div>
                                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-lg group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                                        <ChevronRight size={24} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </React.Fragment>
                          ))
                        )}

                        {/* Productos Generales */}
                        <div className="mt-8">
                          <h3 className="text-xl font-black italic uppercase tracking-tighter dark:text-white leading-none mb-6">Productos Generales</h3>
                          <div className="grid grid-cols-1 gap-4">
                            {filteredProducts.map((p, idx) => (
                              <motion.div 
                                key={p.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setSelectedProduct(p)} 
                                className="bg-white dark:bg-slate-900 p-4 rounded-[35px] border border-slate-100 dark:border-slate-800 flex items-center space-x-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                              >
                                <div className="w-24 h-24 rounded-[25px] overflow-hidden flex-shrink-0 shadow-inner bg-slate-50 dark:bg-slate-800 relative">
                                  <img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                                    className={`absolute top-2 left-2 p-2 rounded-xl backdrop-blur-md transition-all active:scale-90 z-10 ${
                                      userData.favoritos.includes(p.id) 
                                        ? 'bg-red-500 text-white shadow-lg' 
                                        : 'bg-white/80 dark:bg-slate-900/80 text-slate-400'
                                    }`}
                                  >
                                    <Heart size={14} fill={userData.favoritos.includes(p.id) ? "currentColor" : "none"} />
                                  </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-black text-slate-800 dark:text-white text-base uppercase tracking-tight truncate leading-tight">{p.name}</h3>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">{p.sub}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-lg font-black text-purple-600 italic tracking-tighter">${(p.price || 0).toFixed(2)}</span>
                                    <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                      <Plus size={20}/>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-24">
                      <div className="px-6 mb-8">
                        <div className="relative h-64 rounded-[40px] overflow-hidden shadow-2xl mb-6">
                          <img src={allVisibleStores.find(s => s.id === selectedStoreId)?.img} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          <button 
                            onClick={() => handleStoreSelect(null)}
                            className="absolute top-6 left-6 w-12 h-12 bg-white/20 backdrop-blur-xl text-white rounded-2xl flex items-center justify-center hover:bg-white hover:text-purple-600 transition-all"
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <div className="absolute bottom-8 left-8 right-8">
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{allVisibleStores.find(s => s.id === selectedStoreId)?.name}</h2>
                            <p className="text-white/60 text-xs font-bold mt-2 flex items-center gap-2"><MapPin size={14} /> {allVisibleStores.find(s => s.id === selectedStoreId)?.address}</p>
                          </div>
                        </div>

                        <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
                          {(storeSubCategories[allVisibleStores.find(s => s.id === selectedStoreId)?.type || ''] || ['Todos']).map(sub => (
                            <button 
                              key={sub} 
                              onClick={() => setSubCategory(sub)}
                              className={`px-8 py-4 rounded-3xl text-[10px] font-black whitespace-nowrap uppercase transition-all shadow-sm border-2 ${subCategory === sub ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-slate-900 border-transparent text-slate-400'}`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="px-6 space-y-4">
                        {/* Partner Products (Menu) */}
                        {partnerStores.some(ps => ps.id === selectedStoreId) && (
                          <div className="mb-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">{category === 'comida' ? 'Menú del Restaurante' : 'Productos'}</h3>
                            <div className="grid grid-cols-1 gap-4">
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map((p, idx) => (
                                  <motion.div 
                                    key={p.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedProduct(p)}
                                    className="bg-white dark:bg-slate-900 p-4 rounded-[35px] border border-slate-100 dark:border-slate-800 flex items-center space-x-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                                  >
                                    <div className="w-20 h-20 rounded-[20px] overflow-hidden flex-shrink-0">
                                      <img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight truncate leading-tight">{p.name}</h3>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{p.sub}</p>
                                      <div className="flex items-center justify-between">
                                        <span className="text-base font-black text-purple-600 italic tracking-tighter">${(p.price || 0).toFixed(2)}</span>
                                        <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                          <Plus size={16}/>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))
                              ) : (
                                <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando menú...</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* AI Found Store Products */}
                        {!partnerStores.some(ps => ps.id === selectedStoreId) && (
                          <div className="grid grid-cols-1 gap-4">
                            {filteredProducts.length > 0 ? (
                              filteredProducts.map((p, idx) => (
                                <motion.div 
                                  key={p.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  onClick={() => setSelectedProduct(p)}
                                  className="bg-white dark:bg-slate-900 p-4 rounded-[35px] border border-slate-100 dark:border-slate-800 flex items-center space-x-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                                >
                                  <div className="w-24 h-24 rounded-[25px] overflow-hidden flex-shrink-0 shadow-inner bg-slate-50 dark:bg-slate-800">
                                    <img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-slate-800 dark:text-white text-base uppercase tracking-tight truncate leading-tight">{p.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">{p.sub}</p>
                                    <div className="flex items-center justify-between">
                                      <span className="text-lg font-black text-purple-600 italic tracking-tighter">${(p.price || 0).toFixed(2)}</span>
                                      <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        <Plus size={20}/>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))
                            ) : (
                              <div className="py-20 text-center">
                                <Package className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No hay productos disponibles</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-in fade-in duration-500">
                  <div className="px-6 overflow-x-auto no-scrollbar flex space-x-3 mb-6">
                    {subCategories[category].map(sub => (
                      <button 
                        key={sub} 
                        onClick={() => setSubCategory(sub)}
                        className={`px-8 py-4 rounded-3xl text-[10px] font-black whitespace-nowrap uppercase transition-all shadow-sm border-2 ${subCategory === sub ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-slate-900 border-transparent text-slate-400'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>

                  <div className="px-6 space-y-4 pb-24">
                    {category === 'paquete' ? (
                      <div className="flex flex-col items-center justify-center py-20 px-6 bg-white dark:bg-slate-900 rounded-[50px] border border-slate-100 dark:border-slate-800 shadow-sm text-center space-y-6">
                        <div className="relative p-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-full"><Package size={64} /></div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Envío de Paquetes</h3>
                          <p className="text-xs font-bold text-slate-400 max-w-[240px] mx-auto uppercase tracking-widest">Envía lo que quieras a donde quieras de forma segura y rápida.</p>
                        </div>
                        <div className="px-10 py-3 bg-purple-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg">Próximamente</div>
                      </div>
                    ) : (
                      filteredProducts.filter(p => p.type === category).map((p, idx) => (
                        <motion.div 
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelectedProduct(p)} 
                          className="bg-white dark:bg-slate-900 p-4 rounded-[35px] border border-slate-100 dark:border-slate-800 flex items-center space-x-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                        >
                          <div className="w-24 h-24 rounded-[25px] overflow-hidden flex-shrink-0 shadow-inner bg-slate-50 dark:bg-slate-800">
                            <img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-800 dark:text-white text-base uppercase tracking-tight truncate leading-tight">{p.name}</h3>
                            <div className="flex items-center space-x-2 mb-3">
                              {p.storeId ? (
                                <span className="text-[8px] font-black bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-3 py-1 rounded-full uppercase tracking-widest">
                                  {allVisibleStores.find(s => s.id === p.storeId)?.name}
                                </span>
                              ) : (
                                <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest">
                                  {p.sub}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-purple-600 italic tracking-tighter">${(p.price || 0).toFixed(2)}</span>
                              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Plus size={20}/>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'explorar' && (
          <div className="flex flex-col">
            <header className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 px-6 py-8 border-b border-gray-100 dark:border-slate-800 transition-colors duration-300">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-2 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 rounded-full border border-purple-100 dark:border-purple-800">
                    <span className="w-1 h-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"></span>
                    <span className="text-[7px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Ya Voy! Discovery</span>
                  </div>
                  <h1 className="text-4xl font-black italic tracking-tighter dark:text-white uppercase leading-none">Explora</h1>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Lo mejor esta cerca</p>
                </div>
                <motion.div 
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-200 dark:shadow-none"
                >
                  <Sparkles size={24} />
                </motion.div>
              </div>
            </header>
            
            <div className="p-4 pb-32 animate-in fade-in space-y-6">
              <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-600 z-10">
                <Search size={20} strokeWidth={3} />
              </div>
              <input 
                type="text" 
                placeholder="Busca sabores o mandados..." 
                className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 focus:border-purple-600 rounded-[30px] shadow-lg outline-none font-black text-base dark:text-white transition-all transform-gpu focus:scale-[1.01]" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic flex items-center space-x-2">
                  <span className="w-6 h-[2px] bg-slate-100 dark:bg-slate-800"></span>
                  <span>Categorías</span>
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'comida', label: 'Comida', icon: <Utensils size={24} strokeWidth={3} />, color: 'from-orange-400 to-rose-500', shadow: 'shadow-orange-200/50', desc: 'Sazón Local' },
                  { id: 'tienda', label: 'Tiendas', icon: <StoreIcon size={24} strokeWidth={3} />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200/50', desc: 'Abarrotes' },
                  { id: 'paquete', label: 'Paquetes', icon: <Package size={24} strokeWidth={3} />, color: 'from-purple-500 to-blue-600', shadow: 'shadow-purple-200/50', desc: 'Envíos YA' },
                  { id: 'salud', label: 'Salud', icon: <Shield size={24} strokeWidth={3} />, color: 'from-emerald-400 to-teal-700', shadow: 'shadow-emerald-200/50', desc: 'Farmacia' },
                ].map((cat, idx) => (
                  <motion.button 
                    key={cat.id} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => { setCategory(cat.id as any); setActiveTab('home'); }}
                    className="relative overflow-hidden p-6 bg-white dark:bg-slate-900 rounded-[35px] border-2 border-slate-50 dark:border-slate-800 shadow-sm hover:border-purple-200 transition-all text-left flex flex-col justify-between h-52"
                  >
                    <div className="flex flex-col space-y-4 relative z-10">
                       <div className={`p-4 rounded-2xl bg-gradient-to-br ${cat.color} text-white w-fit`}>
                         {cat.icon}
                       </div>
                       <div className="space-y-1">
                          <span className="block text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white leading-tight">{cat.label}</span>
                          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">{cat.desc}</span>
                       </div>
                    </div>
                    <Plus size={16} strokeWidth={4} className="text-slate-300" />
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic flex items-center space-x-2">
                   <span className="w-6 h-[2px] bg-slate-100 dark:bg-slate-800"></span>
                   <span>Para ti</span>
                 </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p, idx) => (
                    <motion.div 
                      key={p.id} 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="group relative bg-white dark:bg-slate-900 rounded-[40px] border-2 border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col cursor-pointer"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img src={p.img} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute top-4 left-4 right-4 flex justify-between">
                           <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-xl text-[8px] font-black text-white uppercase border border-white/10">⭐ 4.9</div>
                           <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                            className={`p-3 rounded-2xl backdrop-blur-md transition-all ${userData.favoritos.includes(p.id) ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}
                          >
                            <Heart size={16} fill={userData.favoritos.includes(p.id) ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <div className="absolute bottom-5 left-6 right-6">
                          <p className="text-[8px] font-black text-white/70 uppercase tracking-widest">{allVisibleStores.find(s => s.id === p.storeId)?.name || 'Especial'}</p>
                          <h3 className="font-black text-white text-xl uppercase tracking-tighter leading-none">{p.name}</h3>
                        </div>
                      </div>
                      <div className="p-6 flex items-center justify-between">
                         <div className="flex items-baseline space-x-1">
                            <span className="text-xs font-black text-purple-600 italic tracking-tighter">$</span>
                            <span className="text-2xl font-black text-purple-600 italic tracking-tighter">{(p.price || 0).toFixed(2)}</span>
                         </div>
                         <button className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center">
                            <Plus size={24} />
                          </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center flex flex-col items-center">
                    <Search size={48} className="text-slate-200 mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase">Sin resultados</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'pedidos' && (
          <div className="flex flex-col h-full"> 
            <header className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 px-6 py-8 border-b border-gray-100 dark:border-slate-800">
              <h1 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white">Tus Pedidos</h1>
            </header>
            <OrdersScreen orders={orders} setSelectedOrder={setSelectedOrder} />
          </div>
        )}
        
        {activeTab === 'asistente' && (
          <div className="flex flex-col h-full">
            <header className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 px-6 py-8 border-b border-gray-100 dark:border-slate-800">
              <h1 className="text-2xl font-black italic tracking-tighter uppercase dark:text-white">Club YA VOY!</h1>
            </header>
            <div className="p-6 animate-in fade-in">
              <BenefitsCenter 
                userData={userData}
                onSelectStore={(s) => {
                  setSelectedStoreId(s.id);
                  setCategory(s.type as any);
                  setActiveTab('home');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="animate-in fade-in flex flex-col">
            <header className="sticky top-0 z-40 bg-slate-50 dark:bg-slate-950 px-6 py-8 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
               <h1 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Mi Perfil</h1>
               <div className="flex items-center space-x-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-[8px] font-black uppercase text-slate-400">En línea</span>
               </div>
            </header>
            
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center space-y-4 bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm relative transition-colors duration-300">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                />
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center text-purple-600 text-2xl font-black italic overflow-hidden">
                    {isUploadingPhoto ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      userData.fotoUrl ? (
                        <img 
                          key={userData.fotoUrl}
                          src={userData.fotoUrl} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          alt="Profile"
                        />
                      ) : (
                        userData.nombre ? userData.nombre.substring(0, 2).toUpperCase() : "U"
                      )
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute bottom-0 right-0 p-2 bg-purple-600 text-white rounded-full border-2 border-white shadow-lg active:scale-90 transition-all disabled:opacity-50"
                  >
                    <Camera size={14}/>
                  </button>
                </div>
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      {isEditingName ? (
                        <div className="flex items-center space-x-2">
                          <input 
                            type="text" 
                            value={tempName} 
                            onChange={(e) => setTempName(e.target.value)}
                            className="text-2xl font-black text-gray-800 dark:text-white border-b-2 border-purple-600 outline-none w-48 text-center bg-transparent"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                          />
                          <button onClick={handleSaveName} className="p-1 bg-green-500 text-white rounded-full">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setIsEditingName(false)} className="p-1 bg-red-500 text-white rounded-full">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-2xl font-black text-gray-800 dark:text-white">{userData.nombre}</h2>
                          <Pencil 
                            size={16} 
                            className="text-gray-300 cursor-pointer hover:text-purple-600 transition-colors" 
                            onClick={() => {
                              setTempName(userData.nombre);
                              setIsEditingName(true);
                            }}
                          />
                        </>
                      )}
                    </div>
                    <p className="text-gray-400 font-bold text-sm">{userData.email}</p>
                  </div>
                  <div 
                    onClick={() => !userData.verificado && userData.documentsStatus !== 'pending' && setShowVerifyFlow(true)}
                    className={`mt-2 flex items-center justify-center space-x-1 px-4 py-1.5 rounded-full text-[8px] font-black uppercase cursor-pointer transition-all active:scale-95 ${
                      userData.verificado ? 'bg-green-100 text-green-600' : 
                      userData.documentsStatus === 'pending' ? 'bg-purple-100 text-purple-600' :
                      'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {userData.verificado ? <ShieldCheck size={10}/> : 
                     userData.documentsStatus === 'pending' ? <Loader2 size={10} className="animate-spin" /> :
                     <AlertCircle size={10}/>}
                    <span>
                      {userData.verificado ? 'Cuenta Verificada' : 
                       userData.documentsStatus === 'pending' ? 'Documentos en revisión' :
                       'Verificar Cuenta ahora'}
                    </span>
                  </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-50 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl"><Mail size={20}/></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Email</p>
                        <p className="text-sm font-bold dark:text-white">{userData.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-50 dark:bg-slate-800"></div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl"><PhoneIcon size={20}/></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Teléfono</p>
                        <p className="text-sm font-bold dark:text-white">{userData.phoneNumber || 'No registrado'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setNewPhone(userData.phoneNumber || "");
                        setIsEditingPhone(true);
                      }}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                    >
                      <Pencil size={16}/>
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-50 dark:border-slate-800 space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuración Guardada</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl"><Shield size={20}/></div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">Notificaciones</p>
                          <p className="text-[10px] text-slate-400 font-bold">Recibe alertas de tus pedidos</p>
                        </div>
                      </div>
                      <div 
                        onClick={() => updateSettings({ ...(userData.settings || {}), notifications: !userData.settings?.notifications })}
                        className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${userData.settings?.notifications ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${userData.settings?.notifications ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-slate-50 dark:bg-slate-800"></div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
                          {userData.settings?.darkMode ? <Moon size={20}/> : <Sun size={20}/>}
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">Modo Oscuro</p>
                          <p className="text-[10px] text-slate-400 font-bold">Alterna entre tema claro y oscuro</p>
                        </div>
                      </div>
                      <div 
                        onClick={() => updateSettings({ ...(userData.settings || {}), darkMode: !userData.settings?.darkMode })}
                        className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${userData.settings?.darkMode ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${userData.settings?.darkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 px-1 flex items-center space-x-2">
                    <Heart size={12} fill="currentColor" className="text-rose-500" />
                    <span>Favoritos Guardados</span>
                  </h3>
                  
                  {userData.favoritos.length > 0 ? (
                    <div className="flex overflow-x-auto pb-4 gap-4 px-2 no-scrollbar">
                      {userData.favoritos.map(favId => {
                        const product = partnerProducts.find(p => `${p.storeId}-${p.id}` === favId || p.id === favId);
                        if (!product) return null;
                        return (
                          <motion.button
                            key={favId}
                            layoutId={`fav-${favId}`}
                            onClick={() => setSelectedProduct(product)}
                            className="flex-shrink-0 w-40 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-50 dark:border-slate-800 space-y-3"
                          >
                            <div className="w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden relative">
                              {product?.img ? (
                                <img src={product.img} className="w-full h-full object-cover" alt={product?.name || 'Producto'} referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                  <Utensils size={24} />
                                </div>
                              )}
                              <div className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm">
                                <Heart size={12} fill="#f43f5e" className="text-rose-500" />
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate">{product?.name}</p>
                              <p className="text-[10px] font-bold text-slate-400">${(product?.price || 0).toFixed(2)}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-2">
                      <Heart size={24} className="text-slate-300" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center px-4 leading-relaxed">Marca productos con el corazón para verlos aquí</p>
                    </div>
                  )}
              </div>

              <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 px-1">Atajos Rápidos</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => setShowAddressManager(true)} className="w-full p-6 bg-white dark:bg-slate-900 rounded-3xl flex justify-between items-center text-sm font-bold shadow-sm border border-gray-50 dark:border-slate-800 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-2xl">
                          <MapPin size={20} className="text-purple-600"/>
                        </div>
                        <span className="dark:text-white uppercase tracking-tight font-black italic">Mis Ubicaciones</span>
                      </div>
                      <ChevronRight size={18} className="dark:text-slate-500"/>
                    </button>
                    <button onClick={() => setShowPaymentManager(true)} className="w-full p-6 bg-white dark:bg-slate-900 rounded-3xl flex justify-between items-center text-sm font-bold shadow-sm border border-gray-50 dark:border-slate-800 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl">
                          <Shield size={20} className="text-indigo-600"/>
                        </div>
                        <span className="dark:text-white uppercase tracking-tight font-black italic">Métodos de Pago</span>
                      </div>
                      <ChevronRight size={18} className="dark:text-slate-500"/>
                    </button>
                    <button onClick={() => setShowSecuritySettings(true)} className="w-full p-6 bg-white dark:bg-slate-900 rounded-3xl flex justify-between items-center text-sm font-bold shadow-sm border border-gray-50 dark:border-slate-800 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                          <Lock size={20} className="text-slate-600 dark:text-slate-400"/>
                        </div>
                        <span className="dark:text-white uppercase tracking-tight font-black italic">Privacidad y Seguridad</span>
                      </div>
                      <ChevronRight size={18} className="dark:text-slate-500"/>
                    </button>
                    <button onClick={() => setShowReferralManager(true)} className="w-full p-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl flex justify-between items-center text-sm font-bold shadow-lg shadow-purple-200 dark:shadow-none transition-all active:scale-95 group">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md text-white group-hover:rotate-12 transition-transform">
                          <Gift size={20}/>
                        </div>
                        <div className="text-left">
                          <span className="text-white uppercase tracking-tight font-black italic block">Invita y Gana</span>
                          <span className="text-white/60 text-[8px] font-bold uppercase tracking-widest">Gana ${50} por amigo</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-white/50"/>
                    </button>
                  </div>
                </div>
                 
                {userData.favoritos.length > 0 && (
                   <div className="space-y-4 pt-6">
                     <div className="flex items-center justify-between px-2">
                       <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mis Favoritos ({userData.favoritos.length})</h3>
                       <div className="flex items-center space-x-1 text-[10px] font-black text-red-500 uppercase tracking-widest">
                         <Heart size={12} fill="currentColor" />
                         <span>Love</span>
                       </div>
                     </div>
                     <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide px-1">
                       {userData.favoritos.map(favId => {
                         const p = partnerProducts.find(prod => prod.id === favId);
                         if (!p) return null;
                         return (
                           <motion.div 
                             whileHover={{ scale: 1.05 }}
                             key={p.id} 
                             onClick={() => setSelectedProduct(p)} 
                             className="flex-shrink-0 w-40 bg-white dark:bg-slate-900 p-4 rounded-[30px] border border-slate-50 dark:border-slate-800 shadow-sm relative group cursor-pointer"
                           >
                             <div className="w-full h-28 rounded-2xl overflow-hidden mb-3">
                               <img src={p.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                             </div>
                             <p className="text-[11px] font-black dark:text-white uppercase truncate px-1 tracking-tight">{p.name}</p>
                             <p className="text-[10px] font-black text-purple-600 italic mt-1 px-1">${(p.price || 0).toFixed(2)}</p>
                             <button 
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg active:scale-90 transition-transform"
                             >
                               <Heart size={12} fill="currentColor" />
                             </button>
                           </motion.div>
                         );
                       })}
                     </div>
                   </div>
                 )}
                 
                <button onClick={() => setShowLogoutConfirm(true)} className="w-full p-6 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-[30px] text-sm font-black flex items-center justify-center mt-6 transition-all active:scale-95 shadow-sm border border-red-100 dark:border-red-900/20 uppercase tracking-widest gap-2">
                  <LogOut size={18}/> 
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
        )}
      </>
    </main>

      <div className="shrink-0 z-[90]">
        <nav className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 h-20 flex items-center justify-around px-6 shadow-2xl transition-colors duration-300">
          {[
            {id:'home', icon:<StoreIcon/>, label:'YA VOY!'}, 
            {id:'explorar', icon:<Search/>, label:'DESCUBRIR'}, 
            {id:'asistente', icon:<Ticket/>, label: 'CLUB VOY!'},
            {id:'pedidos', icon:<History/>, label:'PEDIDOS'}, 
            {id:'perfil', icon:<User/>, label:'PERFIL'}
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center transition-all ${activeTab === tab.id ? 'text-purple-600 scale-110' : 'text-gray-300 dark:text-slate-600'}`}>
              {tab.icon}
              <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {showLogoutConfirm && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[50px] p-10 text-center relative z-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-t-8 border-rose-500"
          >
            <div className="absolute top-0 left-0 p-8 opacity-5 text-rose-500 pointer-events-none">
              <Heart size={120} />
            </div>
            
            <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-rose-100 dark:shadow-none animate-bounce duration-slow">
              <LogOut size={40} strokeWidth={2.5} />
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 dark:text-white italic uppercase tracking-tighter mb-4 leading-none">¿Dices adiós?</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-10 leading-relaxed px-4">
              ¡No te vayas! Tenemos <span className="text-purple-600">nuevos sabores</span> esperándote. ¿Seguro que quieres cerrar sesión?
            </p>
            
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="w-full py-6 bg-rose-600 text-white rounded-[25px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-200 dark:shadow-none active:scale-95 transition-all"
              >
                Sí, desconectar
              </button>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[25px] font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all"
              >
                Me quedo aquí
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showVerifyFlow && (
        <VerificationSteps 
          onFinish={async () => {
            await verifyAccount();
            toast.success("¡Cuenta verificada con éxito!");
            setShowVerifyFlow(false); 
          }} 
        />
      )}
      {showOnboarding && (
        <OnboardingFlow 
          user={user} 
          onFinish={() => {
            setShowOnboarding(false);
            if (!userData.phoneVerified || !userData.emailVerified) {
              setShowVerifyFlow(true);
            }
          }} 
        />
      )}
      {showAddressManager && (
        <AddressManager 
          userData={userData} 
          onClose={() => setShowAddressManager(false)} 
          onSaveAddress={saveAddress} 
          onRemoveAddress={removeAddress} 
          onSetPrimary={setPrimaryAddress}
        />
      )}
      {showPaymentManager && <PaymentManager setShowPaymentManager={setShowPaymentManager} userData={userData} onAddCard={addCard} onRemoveCard={removeCard} />}
      {showSecuritySettings && <SecuritySettings setShowSecuritySettings={setShowSecuritySettings} logout={logout} deleteAccount={deleteAccount} sendPasswordReset={sendPasswordReset} profile={profile} />}
      <AnimatePresence>
        {showReferralManager && (
          <ReferralManager 
            profile={profile}
            onClose={() => setShowReferralManager(false)}
          />
        )}
      </AnimatePresence>
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAdd={(p) => setCart([...cart, p])} 
          isStoreOpen={selectedProduct.storeId ? checkIfOpen(allVisibleStores.find(s => s.id === selectedProduct.storeId) || { isOpen: true } as any) : true}
        />
      )}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onOpenChat={() => setShowChat(true)} 
          onCancel={cancelOrder} 
          onComplete={handleCompleteOrder}
          onRate={(order) => { setSelectedOrder(null); setRatingOrder(order); }}
        />
      )}
      
      {ratingOrder && (
        <RatingModal 
          orderId={ratingOrder.id}
          driverName={ratingOrder.driver?.name || "tu repartidor"}
          storeName={ratingOrder.storeName || "el restaurante"}
          onClose={() => setRatingOrder(null)}
          onSubmit={async (restaurantRating, restaurantReview, driverRating, driverReview) => {
            try {
              await updateDoc(doc(db, 'orders', ratingOrder.id), {
                restaurantRating,
                restaurantReview,
                driverRating,
                driverReview,
                updatedAt: Timestamp.now()
              });
              toast.success("¡Gracias por tu reseñas!");
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `orders/${ratingOrder.id}`);
            }
          }}
        />
      )}
      
      <CartDrawer 
        showCart={showCart} 
        setShowCart={setShowCart} 
        cart={cart} 
        removeFromCart={removeFromCart}
        isFirstOrder={isFirstOrder} 
        onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
      />

      {showCheckout && (
        <CheckoutScreen 
          cart={cart} 
          userData={userData} 
          isFirstOrder={isFirstOrder} 
          promoApplied={promoApplied}
          stores={allVisibleStores}
          userLocation={userLocation}
          onClose={() => setShowCheckout(false)} 
          onConfirm={handleProcessPayment}
        />
      )}

      {paymentSuccess && (
        <SuccessModal 
          onClose={() => { setPaymentSuccess(false); setActiveTab('pedidos'); }} 
        />
      )}

      {showPromoSuccess && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 text-center relative z-10 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-600 to-indigo-600" />
            
            <motion.div 
              animate={{ 
                x: [-100, 300],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-12 left-0 text-purple-600/10"
            >
              <Bike size={120} />
            </motion.div>

            <div className="relative z-10 space-y-6">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Bike size={40} className="text-purple-600" />
                </motion.div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase">¡Felicidades!</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                  Has desbloqueado <span className="text-purple-600">Envío Gratis</span> para tu primer pedido.
                </p>
              </div>

              <button 
                onClick={() => {
                  setPromoApplied(true);
                  setShowPromoSuccess(false);
                }}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-purple-200 dark:shadow-none active:scale-95 transition-transform"
              >
                ¡Excelente!
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {imageToCrop && (
        <ImageCropper 
          image={imageToCrop} 
          onCropComplete={handleCropComplete} 
          onCancel={() => setImageToCrop(null)} 
        />
      )}

      {/* Phone Verification Modal */}
      <AnimatePresence>
        {isEditingPhone && (
          <div className="absolute inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isVerifyingPhone && setIsEditingPhone(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 text-center relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-purple-600" />
              
              <div className="space-y-6">
                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
                  <PhoneIcon size={32} className="text-purple-600" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase">Editar Teléfono</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-xs">
                    {phoneStep === 'input' 
                      ? 'Ingresa tu nuevo número para recibir un código de verificación.' 
                      : `Ingresa el código enviado a ${newPhone}`}
                  </p>
                </div>

                {phoneStep === 'input' ? (
                  <div className="space-y-4">
                    <input 
                      type="tel" 
                      placeholder="+52 55 0000 0000" 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-center text-xl outline-none border-2 border-transparent focus:border-purple-200 transition-all" 
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                    <button 
                      onClick={handleSendPhoneCode}
                      disabled={isVerifyingPhone || !newPhone}
                      className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-purple-200 dark:shadow-none active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isVerifyingPhone ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                      Enviar Código
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000" 
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-center text-2xl tracking-[0.5em] outline-none border-2 border-transparent focus:border-purple-200 transition-all" 
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPhoneStep('input')}
                        disabled={isVerifyingPhone}
                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs active:scale-95 transition-transform disabled:opacity-50"
                      >
                        Atrás
                      </button>
                      <button 
                        onClick={handleConfirmPhoneCode}
                        disabled={isVerifyingPhone || verificationCode.length < 6}
                        className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-purple-200 dark:shadow-none active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isVerifyingPhone ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                        Verificar
                      </button>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setIsEditingPhone(false);
                    setPhoneStep('input');
                    setNewPhone("");
                    setVerificationCode("");
                  }}
                  disabled={isVerifyingPhone}
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-purple-600 transition-colors"
                >
                  Cancelar
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
