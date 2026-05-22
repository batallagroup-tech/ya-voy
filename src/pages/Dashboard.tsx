import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Utensils, Settings, Users, LayoutDashboard, 
  ShoppingBag, Clock, Plus, Edit2, Trash2, Check, 
  X, Camera, Smartphone, DollarSign, TrendingUp,
  ChevronRight, Loader2, Save, Calendar, MapPin, Power,
  Image as ImageIcon, Ticket, Star, ShieldAlert, Lock, Trash, ArrowUpRight
} from 'lucide-react';

const CATEGORIES = [
  'Tacos', 'Hamburguesas', 'Pizza', 'Sushi', 'Postres', 
  'Bebidas', 'Comida Corrida', 'Alitas', 'Ensaladas', 'Mariscos'
];

const ORDER_STATUSES = [
  { id: 'pending', label: 'Nuevo', color: 'bg-blue-500' },
  { id: 'preparing', label: 'En Preparación', color: 'bg-orange-500' },
  { id: 'ready_for_pickup', label: 'Listo para Entrega', color: 'bg-green-500' },
  { id: 'out_for_delivery', label: 'En Camino', color: 'bg-purple-500' },
  { id: 'delivered', label: 'Entregado', color: 'bg-slate-400' },
  { id: 'cancelled', label: 'Cancelado', color: 'bg-red-500' }
];

const DAYS = [
  { id: 'mon', label: 'Lunes' },
  { id: 'tue', label: 'Martes' },
  { id: 'wed', label: 'Miércoles' },
  { id: 'thu', label: 'Jueves' },
  { id: 'fri', label: 'Viernes' },
  { id: 'sat', label: 'Sábado' },
  { id: 'sun', label: 'Domingo' }
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'menu' | 'marketing' | 'profile' | 'finance' | 'reviews'>('overview');
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [financeFilter, setFinanceFilter] = useState<'today' | 'week' | 'month'>('today');

  // Security Keywords Generator
  const generateKeyword = () => {
    const words = ['MOTO', 'VELOZ', 'ENTREGA', 'SABOR', 'RUTA', 'READY', 'FLASH', 'YA', 'VOU'];
    const random = Math.floor(Math.random() * 900) + 100;
    return `${words[Math.floor(Math.random() * words.length)]}-${random}`;
  };

  // Helper to check if open by schedule
  const isOpenBySchedule = () => {
    if (!restaurant?.schedule) return false;
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayId = days[now.getDay()];
    const todaySchedule = restaurant.schedule[todayId];
    
    if (!todaySchedule || todaySchedule.closed) return false;
    
    // Convert current time to minutes
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Parse open/close times
    const [openH, openM] = (todaySchedule.open || "00:00").split(':').map(Number);
    const [closeH, closeM] = (todaySchedule.close || "23:59").split(':').map(Number);
    
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  };

  const isScheduleOpen = isOpenBySchedule();

  // Helper to manage counters when opening/closing
  const toggleRestaurantStatus = async () => {
    if (!restaurant) return;
    const newStatus = !restaurant.is_open;
    
    try {
      const updates: any = { is_open: newStatus };
      
      // Reset counter if opening
      if (newStatus) {
        updates.order_counter = 0;
        updates.last_opening_date = new Date().toDateString();
      }
      
      const { error: updateError } = await supabase
        .from('viveres')
        .update(updates)
        .eq('id', restaurant.id);
      
      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // Helper to filter earnings by period
  const getFilteredEarnings = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysToSubtract = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const filtered = orders.filter(o => {
      if (o.status !== 'delivered') return false;
      const orderDate = new Date(o.created_at);
      if (isNaN(orderDate.getTime())) return false;

      if (financeFilter === 'today') return orderDate >= startOfToday;
      if (financeFilter === 'week') return orderDate >= startOfWeek;
      if (financeFilter === 'month') return orderDate >= startOfMonth;
      return true;
    });

    const gross = filtered.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    return {
      gross,
      count: filtered.length,
      net: gross * 0.95 // Assuming 5% commission for example
    };
  };

  const earnings = getFilteredEarnings();

  // Profile Edit States
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSchedule, setEditSchedule] = useState<any>({});
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  
  // Product Edit States
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: CATEGORIES[0],
    available: true,
    isFeatured: false,
    originalPrice: '',
    images: [] as string[]
  });

  // Promotion States
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'percent',
    value: '',
    minOrder: '0',
    validUntil: '',
    description: '',
    isActive: true
  });

  const hasInitialized = useRef(false);

  useEffect(() => {
    const fetchAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Restaurant Data (viveres)
      const { data: viveres, error: vError } = await supabase
        .from('viveres')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (viveres) {
        setRestaurant(viveres);
        if (!hasInitialized.current) {
          setEditName(viveres.name || '');
          setEditPhone(viveres.phone || '');
          setEditSchedule(viveres.schedule || {});
          hasInitialized.current = true;
        }

        const welcomeKey = `welcome_shown_${viveres.id}`;
        if (viveres.status === 'approved' && !localStorage.getItem(welcomeKey)) {
          setShowWelcome(true);
          localStorage.setItem(welcomeKey, 'true');
        }

        // Fetch Orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('store_id', viveres.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (ordersData) setOrders(ordersData);

        // Fetch Products
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', viveres.id);
        if (productsData) setProducts(productsData);

        // Fetch Promos
        const { data: promosData } = await supabase
          .from('promotions')
          .select('*')
          .eq('store_id', viveres.id)
          .order('created_at', { ascending: false });
        if (promosData) setPromotions(promosData);

        // Fetch Reviews
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*')
          .eq('store_id', viveres.id)
          .order('created_at', { ascending: false });
        if (reviewsData) setReviews(reviewsData);

        // Realtime Subscription (Paso 2.3 MD)
        const channel = supabase
          .channel('dashboard-updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'viveres', filter: `id=eq.${viveres.id}` }, (p) => {
            setRestaurant(p.new as any);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${viveres.id}` }, async () => {
            const { data } = await supabase.from('orders').select('*').eq('store_id', viveres.id).order('created_at', { ascending: false }).limit(50);
            if (data) setOrders(data);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${viveres.id}` }, async () => {
            const { data } = await supabase.from('products').select('*').eq('store_id', viveres.id);
            if (data) setProducts(data);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions', filter: `store_id=eq.${viveres.id}` }, async () => {
            const { data } = await supabase.from('promotions').select('*').eq('store_id', viveres.id);
            if (data) setPromotions(data);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
      setLoading(false);
    };

    fetchAuth();
  }, []);

  const handleLogout = () => supabase.auth.signOut();

  const handleResetPassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      alert('Se ha enviado un enlace a tu correo para restablecer la contraseña.');
    } catch (err) {
      console.error('Error reset password:', err);
      alert('Error enviando correo de restablecimiento.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!restaurant?.id) return;
    
    const confirmText = prompt('Esta acción es irreversible y requiere intervención del administrador en Supabase. Para confirmar que deseas borrar tus datos locales, escribe el nombre de tu restaurante:');
    if (confirmText !== restaurant.name) {
      alert('El nombre no coincide. Operación cancelada.');
      return;
    }

    setSaving(true);
    try {
      await supabase.from('viveres').delete().eq('id', restaurant.id);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Error eliminando datos.');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const updates: any = { 
        status, 
        updated_at: new Date().toISOString()
      };

      if (status === 'preparing') {
        const today = new Date().toDateString();
        const isNewDay = restaurant.last_opening_date !== today;
        const newCount = isNewDay ? 1 : (restaurant.order_counter || 0) + 1;
        
        updates.order_number = newCount;
        updates.keyword_a = generateKeyword();
        
        await supabase.from('viveres').update({ 
          order_counter: newCount,
          last_opening_date: today
        }).eq('id', restaurant.id);
      }

      await supabase.from('orders').update(updates).eq('id', orderId);
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('viveres').update({
        name: editName,
        phone: editPhone,
        schedule: editSchedule,
        updated_at: new Date().toISOString()
      }).eq('id', restaurant.id);

      if (error) throw error;
      alert('¡Cambios guardados con éxito!');
      return true;
    } catch (err) {
      console.error('Error saving profile:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert([{
        ...newProduct,
        price: parseFloat(newProduct.price),
        originalPrice: newProduct.originalPrice ? parseFloat(newProduct.originalPrice) : null,
        store_id: restaurant.id,
        img: newProduct.images[0] || null, // Primary photo is the first one
        desc: newProduct.description
      }]);
      
      if (error) throw error;

      setIsAddingProduct(false);
      setNewProduct({ 
        name: '', 
        description: '', 
        price: '', 
        category: CATEGORIES[0], 
        available: true,
        isFeatured: false,
        originalPrice: '',
        images: []
      });
    } catch (err) {
      console.error('Error adding product:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      const { id, ...data } = editingProduct;
      const { error } = await supabase.from('products').update({
        ...data,
        price: parseFloat(data.price),
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
        img: data.images?.[0] || null,
        desc: data.description
      }).eq('id', id);

      if (error) throw error;
      setEditingProduct(null);
    } catch (err) {
      console.error('Error updating product:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPromo = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    try {
      if (editingPromo) {
        const { id, ...data } = editingPromo;
        const { error } = await supabase.from('promotions').update({
          ...data,
          discount_value: parseFloat(data.value),
          min_order: parseFloat(data.minOrder),
          updated_at: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;
        setEditingPromo(null);
      } else {
        const { error } = await supabase.from('promotions').insert([{
          ...newPromo,
          discount_value: parseFloat(newPromo.value),
          min_order: parseFloat(newPromo.minOrder),
          store_id: restaurant.id,
          discount_type: newPromo.type,
          is_active: newPromo.isActive,
          expires_at: newPromo.validUntil || null
        }]);
        if (error) throw error;
        setIsAddingPromo(false);
        setNewPromo({ code: '', type: 'percent', value: '', minOrder: '0', validUntil: '', description: '', isActive: true });
      }
    } catch (err) {
      console.error('Error handling promo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try {
      await supabase.from('promotions').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting promo:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Utensils size={18} />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">Ya Voy</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{restaurant?.name || 'Restaurante'}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Panel de Control</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
      {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:block w-64 bg-white border-r border-slate-200 p-4 space-y-1 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
            { id: 'orders', label: 'Pedidos', icon: ShoppingBag, badge: orders.filter(o => o.status === 'new').length },
            { id: 'menu', label: 'Menú Digital', icon: Utensils },
            { id: 'reviews', label: 'Reseñas', icon: Star, badge: reviews.length },
            { id: 'marketing', label: 'Promociones', icon: Ticket },
            { id: 'profile', label: 'Ajustes', icon: Settings },
            { id: 'finance', label: 'Banco', icon: DollarSign },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-orange-50 text-[#FF6B00] font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="pt-10 pb-4 mt-auto text-center">
            <p className="text-slate-300 text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed">
              Desarrollado por<br />
              <span className="text-slate-400">Batalla Group</span>
            </p>
          </div>
        </aside>

        {/* Bottom Navigation (Mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 pb-6 z-50 flex items-center justify-between">
          {[
            { id: 'overview', label: 'Inicio', icon: LayoutDashboard },
            { id: 'orders', label: 'Pedidos', icon: ShoppingBag, badge: orders.filter(o => o.status === 'new').length },
            { id: 'menu', label: 'Menú', icon: Utensils },
            { id: 'marketing', label: 'Promos', icon: Ticket },
            { id: 'reviews', label: 'Reseñas', icon: Star, badge: reviews.length },
            { id: 'profile', label: 'Ajustes', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 transition-all relative ${
                activeTab === item.id ? 'text-[#FF6B00]' : 'text-slate-400'
              }`}
            >
              <div className="relative">
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] uppercase font-black tracking-tight ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto no-scrollbar pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            {/* Welcome Modal */}
            {showWelcome && (
              <motion.div
                key="welcome-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white w-full max-w-md rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
                >
                  {/* Decorative background */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-[#FF6B00] to-orange-600" />
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                    className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <Check size={48} className="text-[#FF6B00]" />
                  </motion.div>

                  <h2 className="text-3xl font-black text-slate-900 mb-2">¡Felicidades!</h2>
                  <p className="text-lg font-bold text-[#FF6B00] mb-4">Tu restaurante ha sido aprobado</p>
                  
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    Tu solicitud ha sido verificada con éxito. Ya puedes comenzar a gestionar tus pedidos, menú y finanzas desde este panel.
                  </p>

                  <button
                    onClick={() => setShowWelcome(false)}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 group"
                  >
                    Comenzar ahora
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Bienvenido, {restaurant?.name}</h2>
                    <p className="text-sm text-slate-500">Aquí tienes un resumen de tu actividad.</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden lg:flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isScheduleOpen ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isScheduleOpen ? 'text-green-600' : 'text-red-500'}`}>
                          Horario: {isScheduleOpen ? 'Abierto' : 'Cerrado'}
                        </span>
                      </div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">Estado automático</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <button 
                        onClick={toggleRestaurantStatus}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black transition-all shadow-lg ${
                          restaurant?.is_open 
                            ? 'bg-green-500 text-white shadow-green-200' 
                            : 'bg-slate-200 text-slate-600 shadow-slate-100'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full animate-pulse ${restaurant?.is_open ? 'bg-white' : 'bg-slate-400'}`} />
                        {restaurant?.is_open ? 'TIENDA ABIERTA' : 'TIENDA CERRADA'}
                        <Power size={18} />
                      </button>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest px-2 group relative">
                        Interruptor Manual
                        <span className="absolute bottom-full right-0 mb-1 w-32 p-1.5 bg-slate-800 text-white text-center rounded hidden group-hover:block normal-case font-medium">
                          Este botón manda sobre el horario automático.
                        </span>
                      </p>
                    </div>
                  </div>
                  

                </header>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'orders_today', label: 'Pedidos Hoy', value: orders.filter(o => {
                      const today = new Date().toDateString();
                      return o.createdAt?.toDate().toDateString() === today;
                    }).length, icon: ShoppingBag, color: 'text-blue-500', action: () => setActiveTab('orders') },
                    { id: 'sales_today', label: 'Ventas Hoy', value: `$${orders.filter(o => {
                      const today = new Date().toDateString();
                      return o.createdAt?.toDate().toDateString() === today && o.status === 'delivered';
                    }).reduce((acc, o) => acc + (o.total || 0), 0)}`, icon: DollarSign, color: 'text-green-500', action: () => { setActiveTab('finance'); setFinanceFilter('today'); } },
                    { id: 'promos_count', label: 'Cupones', value: promotions.filter(p => p.isActive).length, icon: Ticket, color: 'text-orange-500', action: () => setActiveTab('marketing') },
                    { id: 'reviews_rating', label: 'Reputación', value: reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '5.0', icon: Star, color: 'text-yellow-500', action: () => setActiveTab('reviews') },
                  ].map((stat) => (
                    <button 
                      key={stat.id} 
                      onClick={stat.action}
                      className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-left hover:scale-[1.02] active:scale-[0.98] transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center ${stat.color} mb-3 group-hover:scale-110 transition-transform`}>
                        <stat.icon size={20} />
                      </div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                    </button>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Pedidos Recientes</h3>
                    <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-[#FF6B00]">Ver todos</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${ORDER_STATUSES.find(s => s.id === order.status)?.color}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{order.customerName || 'Cliente'}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                              {order.items.length} productos • ${order.total}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    {orders.length === 0 && (
                      <div className="p-8 text-center text-slate-400">
                        <ShoppingBag size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No hay pedidos aún</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Pedidos en Tiempo Real</h2>
                    <p className="text-sm text-slate-500">Gestiona tus pedidos activos y su estado.</p>
                  </div>
                </header>

                <div className="grid grid-cols-1 gap-4">
                  {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map((order) => (
                    <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm relative">
                            <ShoppingBag size={20} />
                            {order.orderNumber && (
                              <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white">
                                #{order.orderNumber}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{order.customerName || 'Cliente'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID: {order.id.slice(-6)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#FF6B00]">${order.total}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {order.createdAt?.toDate().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-5 space-y-4">
                        {/* Security Keyword Section */}
                        {order.status === 'ready' && (
                          <div className="p-4 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-200 relative group">
                             <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-1">Palabra Clave A (Recolección)</p>
                             <div className="flex items-center justify-between">
                               <span className="text-2xl font-black text-slate-900 tracking-tighter select-all">{order.keywordA || '---'}</span>
                               <div className="bg-white/50 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-1.5 animate-pulse">
                                 <Lock size={12} className="text-[#FF6B00]" />
                                 <span className="text-[8px] font-black text-[#FF6B00] uppercase">Seguro</span>
                               </div>
                             </div>
                             
                             <div className="mt-4 pt-3 border-t border-orange-100/50">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Validar Repartidor</label>
                                <input 
                                  type="text"
                                  placeholder="El repartidor dicta la palabra..."
                                  className="w-full bg-white border border-orange-100 rounded-xl px-4 py-2.5 text-xs font-black placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-[#FF6B00] transition-all"
                                  onChange={(e) => {
                                    if (e.target.value.toUpperCase() === (order.keywordA || '').toUpperCase()) {
                                      updateOrderStatus(order.id, 'picked_up');
                                    }
                                  }}
                                />
                             </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 font-medium">
                                <span className="text-[#FF6B00] font-bold">{item.quantity}x</span> {item.name}
                              </span>
                              <span className="text-slate-400 font-bold">${item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                          {ORDER_STATUSES.filter(s => s.id !== 'cancelled').map((status) => (
                            <button
                              key={status.id}
                              onClick={() => updateOrderStatus(order.id, status.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                order.status === status.id
                                  ? `${status.color} text-white shadow-lg shadow-slate-200`
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {status.label}
                            </button>
                          ))}
                          <button
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            className="ml-auto px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length === 0 && (
                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <Clock size={48} className="mx-auto mb-4 text-slate-200" />
                      <h3 className="text-lg font-bold text-slate-400">No hay pedidos activos</h3>
                      <p className="text-sm text-slate-300">Los nuevos pedidos aparecerán aquí automáticamente.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Menú Digital</h2>
                    <p className="text-sm text-slate-500">Gestiona tus productos y categorías.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingProduct(true)}
                    className="bg-[#FF6B00] text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#E65F00] transition-all shadow-lg shadow-orange-500/20 text-sm"
                  >
                    <Plus size={18} />
                    Nuevo Producto
                  </button>
                </header>

                {/* Product List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group/card">
                      <div className="h-44 bg-slate-100 relative overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
                            {product.images.map((img: string, i: number) => (
                              <img key={i} src={img} alt={product.name} className="w-full h-full object-cover shrink-0 snap-center" />
                            ))}
                          </div>
                        ) : product.img ? (
                          <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Utensils size={48} />
                          </div>
                        )}
                        
                        <div className="absolute top-3 right-3 flex gap-2 translate-y-2 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 transition-all">
                          <button 
                            onClick={() => setEditingProduct(product)}
                            className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-[#FF6B00] shadow-sm transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-red-500 shadow-sm transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {product.images && product.images.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                            1 / {product.images.length} fotos
                          </div>
                        )}

                        <div className="absolute bottom-3 left-3">
                          <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                            {product.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-bold text-slate-900">{product.name}</h4>
                          <span className="text-[#FF6B00] font-black">${product.price}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{product.desc}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${product.available ? 'text-green-500' : 'text-red-500'}`}>
                            {product.available ? 'Disponible' : 'Agotado'}
                          </span>
                          <button 
                            onClick={() => updateDoc(doc(db, 'products', product.id), { available: !product.available })}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                          >
                            Cambiar estado
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add/Edit Modal */}
                <AnimatePresence>
                  {(isAddingProduct || editingProduct) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                      >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900">
                            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                          </h3>
                          <button 
                            onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                            <input 
                              type="text"
                              value={editingProduct ? editingProduct.name : newProduct.name}
                              onChange={(e) => editingProduct 
                                ? setEditingProduct({...editingProduct, name: e.target.value})
                                : setNewProduct({...newProduct, name: e.target.value})
                              }
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                              placeholder="Ej: Hamburguesa Especial"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio de Venta</label>
                              <input 
                                type="number"
                                value={editingProduct ? editingProduct.price : newProduct.price}
                                onChange={(e) => editingProduct 
                                  ? setEditingProduct({...editingProduct, price: e.target.value})
                                  : setNewProduct({...newProduct, price: e.target.value})
                                }
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-black text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio Original (Opcional)</label>
                                <input 
                                  type="number"
                                  value={editingProduct ? editingProduct.originalPrice : newProduct.originalPrice}
                                  onChange={(e) => editingProduct 
                                    ? setEditingProduct({...editingProduct, originalPrice: e.target.value})
                                    : setNewProduct({...newProduct, originalPrice: e.target.value})
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-slate-400 outline-none font-medium text-sm"
                                  placeholder="Ej: 150"
                                />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                              <select 
                                value={editingProduct ? editingProduct.category : newProduct.category}
                                onChange={(e) => editingProduct 
                                  ? setEditingProduct({...editingProduct, category: e.target.value})
                                  : setNewProduct({...newProduct, category: e.target.value})
                                }
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm appearance-none"
                              >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-2xl">
                                  <input 
                                    type="checkbox"
                                    checked={editingProduct ? editingProduct.isFeatured : newProduct.isFeatured}
                                    onChange={(e) => editingProduct
                                      ? setEditingProduct({...editingProduct, isFeatured: e.target.checked})
                                      : setNewProduct({...newProduct, isFeatured: e.target.checked})
                                    }
                                    className="w-5 h-5 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                                  />
                                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Destacar Producto</span>
                                </label>
                              </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                            <textarea 
                              value={editingProduct ? editingProduct.description : newProduct.description}
                              onChange={(e) => editingProduct 
                                ? setEditingProduct({...editingProduct, description: e.target.value})
                                : setNewProduct({...newProduct, description: e.target.value})
                              }
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm h-20 resize-none"
                              placeholder="Describe los ingredientes..."
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Imágenes del Producto</label>
                            <div className="grid grid-cols-4 gap-2">
                              <label className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-200 transition-all border-2 border-dashed border-slate-200">
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  multiple
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []) as File[];
                                    setSaving(true);
                                    try {
                                      const urls: string[] = [];
                                      for (const file of files) {
                                        const sRef = ref(storage, `products/${restaurant.id}/${Date.now()}_${file.name}`);
                                        await uploadBytes(sRef, file);
                                        const url = await getDownloadURL(sRef);
                                        urls.push(url);
                                      }
                                      if (editingProduct) {
                                        setEditingProduct({ ...editingProduct, images: [...(editingProduct.images || []), ...urls] });
                                      } else {
                                        setNewProduct({ ...newProduct, images: [...newProduct.images, ...urls] });
                                      }
                                    } catch (err) {
                                      console.error('Error uploading product images:', err);
                                    } finally {
                                      setSaving(false);
                                    }
                                  }} 
                                />
                                <Plus size={20} />
                              </label>
                              {(editingProduct ? editingProduct.images : newProduct.images)?.map((img: string, idx: number) => (
                                <div key={idx} className="aspect-square rounded-2xl relative overflow-hidden group">
                                  <img src={img} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => {
                                      if (editingProduct) {
                                        setEditingProduct({ ...editingProduct, images: editingProduct.images.filter((_: any, i: number) => i !== idx) });
                                      } else {
                                        setNewProduct({ ...newProduct, images: newProduct.images.filter((_: any, i: number) => i !== idx) });
                                      }
                                    }}
                                    className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic text-center">Presiona + para subir varias imágenes</p>
                          </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex gap-3">
                          <button 
                            onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                            className="flex-1 py-3 bg-white text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-slate-200"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                            disabled={saving}
                            className="flex-[2] py-3 bg-[#FF6B00] text-white font-bold rounded-2xl hover:bg-[#E65F00] transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'marketing' && (
              <motion.div
                key="marketing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 pb-12"
              >
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Marketing y Promociones</h2>
                    <p className="text-sm text-slate-500">Impulsa tus ventas con cupones y fidelidad.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingPromo(true)}
                    className="bg-[#FF6B00] text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#E65F00] transition-all shadow-lg shadow-orange-500/20 text-sm"
                  >
                    <Ticket size={18} />
                    Nuevo Cupón
                  </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Rewards Program */}
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <Users size={20} />
                        </div>
                        <h3 className="text-xl font-black text-white">Club YA VOY!</h3>
                      </div>
                      
                      <div className="space-y-4 mb-8">
                        <div>
                          <p className="text-indigo-100 text-[10px] font-black uppercase tracking-wider mb-1">Impacto de Fidelidad</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">
                              {orders.filter(o => o.status === 'delivered').length * 12}
                            </span>
                            <span className="text-sm font-bold text-indigo-200">puntos otorgados hoy</span>
                          </div>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                          <p className="text-xs font-bold leading-relaxed text-indigo-50">
                            Tus clientes acumulan puntos por cada compra. Actualmente estás otorgando <span className="text-yellow-300 font-black">1 punto por cada $10 MXN</span>.
                          </p>
                        </div>
                      </div>

                      <button className="w-full py-4 bg-white text-indigo-700 font-black rounded-2xl hover:bg-indigo-50 transition-all shadow-lg active:scale-[0.98]">
                        Ver Ranking de Clientes
                      </button>
                    </div>
                    <Star size={180} className="absolute -bottom-20 -right-20 text-white/5 rotate-12" />
                  </div>

                  {/* Referral Gifting */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00]">
                        <Users size={20} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900">Invita y Gana</h3>
                    </div>

                    <p className="text-sm text-slate-500 font-medium mb-6">
                      Regala <span className="text-[#FF6B00] font-black">$100</span> a nuevos clientes y gana <span className="text-green-500 font-black">$50</span> por cada compra exitosa.
                    </p>

                    <div className="bg-slate-50 p-6 rounded-3xl text-center border-2 border-dashed border-slate-200 mb-6 group-hover:border-[#FF6B00]/30 transition-colors">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Tu Código Propietario</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter select-all">
                        YAVOY-{restaurant?.name?.split(' ')[0].toUpperCase() || 'SOCIO'}-2024
                      </p>
                    </div>

                    <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98]">
                      Personalizar Recompensa
                    </button>
                  </div>
                </div>

                {/* Coupons & Offers */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <Ticket size={18} className="text-[#FF6B00]" />
                          Cupones Activos
                        </h3>
                      </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {promotions.map((promo) => (
                            <div key={promo.id} className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 relative group overflow-hidden hover:border-orange-200 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xl font-black text-slate-900">
                                  {promo.discount_type === 'percent' ? `${Number(promo.discount_value)}%` : `$${Number(promo.discount_value)}`}
                                  {promo.discount_type === 'free_shipping' && 'Envío $0'}
                                </span>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setEditingPromo(promo)}
                                    className="p-2 text-slate-400 hover:text-orange-500 transition-colors"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePromo(promo.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{promo.code}</p>
                              <p className="text-xs font-bold text-slate-500 mb-0.5">{promo.description || 'Descuento especial'}</p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-[10px] text-slate-400 font-medium">Mín. ${Number(promo.min_order)}</p>
                                <button 
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase.from('promotions').update({ is_active: !promo.is_active }).eq('id', promo.id);
                                      if (error) throw error;
                                    } catch (err) {
                                      console.error('Error toggling promo:', err);
                                    }
                                  }}
                                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md transition-colors ${promo.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                >
                                  {promo.is_active ? 'Activo' : 'Pausado'}
                                </button>
                              </div>
                            </div>
                          ))}
                          {promotions.length === 0 && (
                            <div className="col-span-full p-8 text-center text-slate-400">
                              <Ticket size={32} className="mx-auto mb-2 opacity-20" />
                              <p className="text-sm">No has creado cupones aún</p>
                            </div>
                          )}
                        </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Star size={18} className="text-yellow-500" />
                        Productos Destacados
                      </h3>
                      <div className="space-y-3">
                        {products.filter(p => p.isFeatured).map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-2xl border border-yellow-100">
                             <div className="flex items-center gap-2">
                               <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
                                 <img src={p.photoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} className="w-full h-full object-cover shadow-sm" />
                               </div>
                               <div>
                                 <p className="text-xs font-bold text-yellow-800 truncate max-w-[100px]">{p.name}</p>
                                 <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Activo</p>
                                </div>
                             </div>
                             <button 
                              onClick={() => updateDoc(doc(db, 'products', p.id), { isFeatured: false })}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors"
                             >
                               <X size={14} />
                             </button>
                          </div>
                        ))}
                        {products.filter(p => p.isFeatured).length === 0 && (
                          <p className="text-center text-xs text-slate-400 py-4">No tienes productos destacados</p>
                        )}
                        <button 
                          onClick={() => setActiveTab('menu')}
                          className="w-full py-3 bg-slate-50 text-slate-500 text-xs font-bold rounded-2xl hover:bg-slate-100 transition-all border border-slate-200 uppercase tracking-widest"
                        >
                          Destacar en Menú
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Promotion Modal */}
                <AnimatePresence>
                  {(isAddingPromo || editingPromo) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                      >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900">
                            {editingPromo ? 'Editar Cupón' : 'Crear Cupón'}
                          </h3>
                          <button onClick={() => { setIsAddingPromo(false); setEditingPromo(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código del Cupón</label>
                            <input 
                              type="text"
                              value={editingPromo ? editingPromo.code : newPromo.code}
                              onChange={(e) => editingPromo 
                                ? setEditingPromo({...editingPromo, code: e.target.value.toUpperCase()})
                                : setNewPromo({...newPromo, code: e.target.value.toUpperCase()})
                              }
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-black text-sm uppercase"
                              placeholder="Ej: TACOS2X1"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                              <select 
                                value={editingPromo ? editingPromo.type : newPromo.type}
                                onChange={(e) => editingPromo
                                  ? setEditingPromo({...editingPromo, type: e.target.value})
                                  : setNewPromo({...newPromo, type: e.target.value})
                                }
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm appearance-none"
                              >
                                <option value="percent">Porcentaje (%)</option>
                                <option value="fixed">Monto Fijo ($)</option>
                                <option value="free_shipping">Envío Gratis</option>
                                <option value="first_order">Primera Compra</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor / Descuento</label>
                              <input 
                                type="number"
                                disabled={editingPromo ? editingPromo.type === 'free_shipping' : newPromo.type === 'free_shipping'}
                                value={editingPromo ? editingPromo.value : newPromo.value}
                                onChange={(e) => editingPromo
                                  ? setEditingPromo({...editingPromo, value: e.target.value})
                                  : setNewPromo({...newPromo, value: e.target.value})
                                }
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm font-black"
                                placeholder={editingPromo?.type === 'percent' ? "0" : "0.00"}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compra Mínima</label>
                              <input 
                                type="number"
                                value={editingPromo ? editingPromo.minOrder : newPromo.minOrder}
                                onChange={(e) => editingPromo
                                  ? setEditingPromo({...editingPromo, minOrder: e.target.value})
                                  : setNewPromo({...newPromo, minOrder: e.target.value})
                                }
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vence el</label>
                              <input 
                                type="date"
                                value={editingPromo ? editingPromo.validUntil : newPromo.validUntil}
                                onChange={(e) => editingPromo
                                  ? setEditingPromo({...editingPromo, validUntil: e.target.value})
                                  : setNewPromo({...newPromo, validUntil: e.target.value})
                                }
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción para el Cliente</label>
                            <input 
                              type="text"
                              value={editingPromo ? editingPromo.description : newPromo.description}
                              onChange={(e) => editingPromo
                                ? setEditingPromo({...editingPromo, description: e.target.value})
                                : setNewPromo({...newPromo, description: e.target.value})
                              }
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                              placeholder="Ej: 20% de descuento en tu primer pedido"
                            />
                          </div>
                          
                          <div className="pt-2">
                             <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-2xl border border-slate-100">
                               <input 
                                 type="checkbox"
                                 checked={editingPromo ? editingPromo.isActive : newPromo.isActive}
                                 onChange={(e) => editingPromo
                                   ? setEditingPromo({...editingPromo, isActive: e.target.checked})
                                   : setNewPromo({...newPromo, isActive: e.target.checked})
                                 }
                                 className="w-5 h-5 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                               />
                               <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Cupón Activo</span>
                             </label>
                          </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex gap-3">
                          <button onClick={() => { setIsAddingPromo(false); setEditingPromo(null); }} className="flex-1 py-3 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 transition-all hover:bg-slate-100">Cancelar</button>
                          <button 
                            onClick={handleAddPromo}
                            disabled={saving}
                            className="flex-[2] py-3 bg-[#FF6B00] text-white font-bold rounded-2xl hover:bg-[#E65F00] transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                          >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Ticket size={18} />}
                            {editingPromo ? 'Guardar Cambios' : 'Crear Cupón'}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Perfil del Restaurante</h2>
                    <p className="text-sm text-slate-500">Personaliza la información pública de tu negocio.</p>
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar Todo
                  </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Basic Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Settings size={18} className="text-[#FF6B00]" />
                        Información General
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Comercial</label>
                          <input 
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono Público</label>
                          <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schedule - Simplified trigger */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <Calendar size={18} className="text-[#FF6B00]" />
                          Horarios de Atención
                        </h3>
                        {Object.values(editSchedule).some((s: any) => s.closed) && (
                          <span className="text-[10px] bg-red-50 text-red-500 px-3 py-1 rounded-full font-black uppercase tracking-wider border border-red-100">
                            Cerrado algunos días
                          </span>
                        )}
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 flex flex-col gap-3">
                         <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-600">Configuración de apertura y cierre por día</p>
                            <button 
                              onClick={() => setIsEditingSchedule(true)}
                              className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all shadow-md uppercase tracking-widest flex items-center gap-2"
                            >
                              Configurar
                              <ChevronRight size={14} />
                            </button>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                            {DAYS.map(day => (
                              <div key={day.id} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase border ${editSchedule[day.id]?.closed ? 'bg-red-50 text-red-400 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                {day.label.slice(0, 3)}
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Photo & Location */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Camera size={18} className="text-[#FF6B00]" />
                        Foto del Local
                      </h3>
                      <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden relative group">
                        {restaurant?.photoUrl ? (
                          <img src={restaurant.photoUrl} alt="Local" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={48} />
                          </div>
                        )}
                        <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !restaurant?.id) return;
                            setSaving(true);
                            try {
                              const sRef = ref(storage, `viveres/${restaurant.id}/main_photo`);
                              await uploadBytes(sRef, file);
                              const url = await getDownloadURL(sRef);
                              await updateDoc(doc(db, 'viveres', restaurant.id), { photoUrl: url });
                            } catch (err) {
                              console.error('Error uploading photo:', err);
                            } finally {
                              setSaving(false);
                            }
                          }} />
                          <div className="bg-white p-3 rounded-full text-slate-900 shadow-xl">
                            <Camera size={24} />
                          </div>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-wider">
                        Recomendado: 1200x800px (JPG/PNG)
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <MapPin size={18} className="text-[#FF6B00]" />
                        Ubicación
                      </h3>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <p className="text-xs font-bold text-slate-700 mb-1">{restaurant?.direccion}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {restaurant?.streetNumber} • CP {restaurant?.zipCode}
                        </p>
                      </div>
                      <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all">
                        Cambiar Ubicación
                      </button>
                    </div>

                    {/* Security & Danger Zone */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                      <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                          <Lock size={18} className="text-[#FF6B00]" />
                          Seguridad
                        </h3>
                        <div className="space-y-3">
                          <button 
                            onClick={handleResetPassword}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group"
                          >
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-900">Restablecer Contraseña</p>
                              <p className="text-[10px] text-slate-400 font-medium">Se enviará un link a tu correo</p>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </button>
                          
                          <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-sm font-bold text-slate-900">Último Acceso</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Hoy, hace unos momentos • SESIÓN ACTIVA</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100">
                        <h3 className="font-bold text-red-500 flex items-center gap-2 mb-4">
                          <ShieldAlert size={18} />
                          Zona de Peligro
                        </h3>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                          <p className="text-sm font-black text-red-600 mb-2">Eliminar Cuenta</p>
                          <p className="text-[10px] text-red-400 leading-relaxed font-bold uppercase tracking-widest mb-4">
                            Esta acción es irreversible y borrará todos tus datos, menús y registros financieros.
                          </p>
                          <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                          >
                            Eliminar Mi Cuenta
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delete Confirmation Modal */}
                    <AnimatePresence>
                      {showDeleteConfirm && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden"
                          >
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                              <ShieldAlert size={40} className="text-red-500" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">¿Estás seguro?</h2>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                              Escribe <span className="font-black text-red-500 select-all">ELIMINAR</span> para confirmar que deseas borrar permanentemente tu negocio.
                            </p>
                            <input 
                              type="text"
                              onChange={(e) => {
                                const btn = document.getElementById('final-delete-btn') as HTMLButtonElement;
                                if (btn) btn.disabled = e.target.value !== 'ELIMINAR';
                              }}
                              className="w-full px-4 py-3 bg-slate-50 border-2 border-red-100 rounded-2xl mb-4 text-center font-black placeholder:text-slate-300"
                              placeholder="Escribe aquí..."
                            />
                            <div className="flex gap-3">
                              <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
                              >
                                Cancelar
                              </button>
                              <button 
                                id="final-delete-btn"
                                disabled
                                onClick={handleDeleteAccount}
                                className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
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
              </motion.div>
            )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <header className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Reseñas de Clientes</h2>
                      <p className="text-sm text-slate-500 italic">"Cada estrella es una oportunidad para seguir mejorando."</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Tu Reputación</p>
                       <div className="flex items-center gap-2">
                         <Star size={14} className="fill-yellow-400 text-yellow-400" />
                         <span className="text-xl font-black text-slate-900">
                           {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '5.0'}
                         </span>
                       </div>
                    </div>
                  </header>

                  {reviews.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-12 border border-dashed border-slate-200 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Star size={32} />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mb-2">Aún no hay reseñas</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        Cuando los clientes califiquen tu servicio y dejen comentarios, aparecerán aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1 space-y-6">
                        <div className="bg-[#FF6B00] p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20 text-center">
                          <p className="text-orange-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Calificación Promedio</p>
                          <h3 className="text-6xl font-black mb-4 tracking-tighter">
                            {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                          </h3>
                          <div className="flex justify-center gap-1 mb-6">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                size={20} 
                                className={s <= (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) ? "fill-white text-white" : "text-white/30"} 
                              />
                            ))}
                          </div>
                          <p className="text-white/80 text-xs font-medium italic">
                            Basado en {reviews.length} opiniones reales
                          </p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <TrendingUp size={16} className="text-[#FF6B00]" />
                            Distribución
                          </h3>
                          <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map((rating) => {
                              const count = reviews.filter(r => r.rating === rating).length;
                              const percentage = (count / reviews.length) * 100;
                              return (
                                <div key={rating} className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-400 w-4">{rating}</span>
                                  <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-orange-400 rounded-full" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-600 w-8 text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-4">
                        {reviews.map((review) => (
                          <div key={review.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-orange-100 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-[#FF6B00] font-black text-sm uppercase">
                                  {review.customerName?.[0] || 'C'}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{review.customerName || 'Cliente Anónimo'}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {review.createdAt?.toDate ? new Date(review.createdAt.toDate()).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Reciente'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star 
                                    key={s} 
                                    size={12} 
                                    className={s <= review.rating ? "fill-[#FF6B00] text-[#FF6B00]" : "text-slate-200"} 
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed italic">
                              "{review.comment || 'Sin comentarios'}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'finance' && (
              <motion.div
                key="finance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">Ganancias y Finanzas</h2>
                    <p className="text-sm text-slate-500">Analiza tus ingresos y gestiona tus retiros.</p>
                  </div>
                  
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    {[
                      { id: 'today', label: 'Hoy' },
                      { id: 'week', label: 'Semana' },
                      { id: 'month', label: 'Mes' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFinanceFilter(f.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          financeFilter === f.id 
                            ? 'bg-white text-[#FF6B00] shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-[#FF6B00] p-8 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-orange-100 text-xs font-black uppercase tracking-widest mb-1">
                          Ventas Brutas ({financeFilter})
                        </p>
                        <h3 className="text-5xl font-black mb-6 tracking-tighter">${earnings.gross.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                        <div className="flex items-center gap-2 mb-8 bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 font-bold text-sm">
                           <ShoppingBag size={16} />
                           {earnings.count} pedidos concretados
                        </div>
                        <button className="w-full py-4 bg-white text-[#FF6B00] font-black rounded-2xl hover:bg-orange-50 transition-all shadow-lg active:scale-95">
                          Solicitar Retiro
                        </button>
                      </div>
                      <DollarSign size={180} className="absolute -bottom-20 -right-20 text-white/10 rotate-12" />
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-[#FF6B00]" />
                        Corte de Caja
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Recaudado</span>
                          <span className="text-sm font-black text-slate-900">${earnings.gross.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">Comisión Ya Voy (5%)</span>
                          <span className="text-sm font-black text-red-500">-${(earnings.gross * 0.05).toFixed(2)}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Ganancia Neta</span>
                          <span className="text-2xl font-black text-green-500">${earnings.net.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign size={18} className="text-[#FF6B00]" />
                      Configuración de Pagos
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titular de la Cuenta</label>
                        <input 
                          type="text"
                          placeholder="Nombre completo"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CLABE Interbancaria (18 dígitos)</label>
                        <input 
                          type="text"
                          maxLength={18}
                          placeholder="000000000000000000"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banco</label>
                        <select className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6B00] outline-none font-medium text-sm appearance-none">
                          <option>BBVA</option>
                          <option>Banamex</option>
                          <option>Santander</option>
                          <option>Banorte</option>
                          <option>HSBC</option>
                          <option>Otro</option>
                        </select>
                      </div>
                      <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
                        Vincular Cuenta de Retiro
                      </button>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Nota de Seguridad</p>
                       <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                         Tus datos bancarios están cifrados. Los depósitos se realizan todos los lunes después del corte de fin de semana.
                       </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Schedule Modal */}
        <AnimatePresence>
          {isEditingSchedule && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Horarios Automáticos</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configura tu presencia en la app</p>
                  </div>
                  <button 
                    onClick={() => setIsEditingSchedule(false)} 
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-3 overflow-y-auto no-scrollbar flex-1">
                  {DAYS.map((day) => {
                    const isClosed = editSchedule[day.id]?.closed;
                    return (
                      <div 
                        key={day.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-3xl border transition-all gap-4 ${
                          isClosed 
                            ? 'bg-slate-50 border-slate-100 opacity-75' 
                            : 'bg-white border-slate-100 hover:border-orange-100 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditSchedule({
                              ...editSchedule,
                              [day.id]: { ...editSchedule[day.id], closed: !isClosed }
                            })}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                              isClosed 
                                ? 'bg-red-100 text-red-500' 
                                : 'bg-green-100 text-green-600'
                            }`}
                          >
                            {isClosed ? <X size={16} className="stroke-[3]" /> : <Power size={16} className="stroke-[3]" />}
                          </button>
                          <div>
                            <span className="text-sm font-black text-slate-800 tracking-tight">{day.label}</span>
                            <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isClosed ? 'text-red-400' : 'text-green-500'}`}>
                              {isClosed ? 'Cerrado' : 'Abierto'}
                            </p>
                          </div>
                        </div>

                        <div className={`flex items-center gap-2 transition-all ${isClosed ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                          <div className="flex items-center bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-100">
                            <Clock size={12} className="text-slate-300 mr-2" />
                            <input 
                              type="time" 
                              value={editSchedule[day.id]?.open || '09:00'}
                              onChange={(e) => setEditSchedule({
                                ...editSchedule,
                                [day.id]: { ...editSchedule[day.id], open: e.target.value }
                              })}
                              className="bg-transparent text-xs font-black text-slate-800 outline-none w-16"
                            />
                          </div>
                          
                          <span className="text-slate-300 text-[10px] font-black italic">a</span>

                          <div className="flex items-center bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-100">
                            <input 
                              type="time" 
                              value={editSchedule[day.id]?.close || '22:00'}
                              onChange={(e) => setEditSchedule({
                                ...editSchedule,
                                [day.id]: { ...editSchedule[day.id], close: e.target.value }
                              })}
                              className="bg-transparent text-xs font-black text-slate-800 outline-none w-16"
                            />
                            <Clock size={12} className="text-slate-300 ml-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 bg-slate-50 flex gap-3 sticky bottom-0">
                  <button 
                    onClick={() => setIsEditingSchedule(false)} 
                    className="flex-1 py-4 bg-white text-slate-500 font-black rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      const success = await handleSaveProfile();
                      if (success) {
                        setIsEditingSchedule(false);
                      }
                    }}
                    disabled={saving}
                    className="flex-[2] py-4 bg-[#FF6B00] text-white font-black rounded-2xl hover:bg-[#E65F00] transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Guardar Cambios
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
