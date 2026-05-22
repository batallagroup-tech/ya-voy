import React, { useState, useEffect } from 'react';
import { 
  Store, Package, Settings, LogOut, ChevronRight, Plus, Clock, 
  Utensils, AlertCircle, CheckCircle2, Loader2, TrendingUp, 
  DollarSign, ShoppingBag, Bell, ChevronLeft, Trash2, Edit3, Search
} from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { RestaurantRegistration } from './RestaurantRegistration';
import { ProductCreator } from './ProductCreator';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const RestaurantPanel = () => {
  const { user, profile, logout, setRole } = useAuth();
  const [storeData, setStoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProductCreator, setShowProductCreator] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'menu' | 'orders' | 'settings'>('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, 'stores', user.uid), (doc) => {
      setStoreData(doc.exists() ? doc.data() : null);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (activeView === 'menu' && user) {
      fetchProducts();
    }
  }, [activeView, user]);

  const fetchProducts = async () => {
    if (!user) return;
    setLoadingProducts(true);
    try {
      const q = query(collection(db, 'products'), where('storeId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Error al cargar el menú.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(products.filter(p => p.id !== productId));
      toast.success("Producto eliminado.");
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error("Error al eliminar el producto.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#FF5722]" size={48} />
      </div>
    );
  }

  // If no store data, show registration
  if (!storeData) {
    return <RestaurantRegistration onComplete={() => {}} />;
  }

  // If pending review
  if (storeData.status === 'pendiente') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="relative">
          <div className="w-32 h-32 bg-orange-100 rounded-[45px] flex items-center justify-center text-orange-600 shadow-xl shadow-orange-100">
            <Clock size={64} className="animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
            <AlertCircle size={24} className="text-orange-500" />
          </div>
        </div>
        
        <div className="space-y-3 max-w-sm">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
            Perfil en <span className="text-[#FF5722]">Revisión</span>
          </h1>
          <p className="text-slate-500 font-bold text-sm">
            Tu información está siendo revisada por el equipo de <span className="text-orange-600">Ya Voy!</span>.
          </p>
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              En menos de 24 horas recibirás tu insignia de verificación para poder operar.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <button 
            onClick={() => setRole('client')}
            className="px-8 py-4 bg-[#FF5722] text-white rounded-[25px] font-black uppercase text-xs shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center space-x-2"
          >
            <ChevronLeft size={18} />
            <span>Volver a la App</span>
          </button>
          <button 
            onClick={logout}
            className="px-8 py-4 bg-white text-slate-400 rounded-[25px] font-black uppercase text-xs shadow-xl shadow-slate-100 active:scale-95 transition-all flex items-center space-x-2"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    );
  }

  // Main Verified Panel
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <header className="p-8 bg-white border-b flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl overflow-hidden shadow-inner border border-orange-100">
            <img src={storeData.img} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{storeData.name}</h1>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Panel de Control</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setRole('client')}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            Volver a la App
          </button>
          <button className="p-3 bg-slate-50 rounded-2xl text-slate-400 relative">
            <Bell size={24} />
            <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
          </button>
          <button onClick={logout} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8">
        {activeView === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 relative overflow-hidden group"
              >
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 mb-3">
                    <ShoppingBag size={18} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos Hoy</p>
                  <p className="text-4xl font-black italic text-[#FF5722] mt-1">0</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 relative overflow-hidden group"
              >
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-3">
                    <DollarSign size={18} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas Hoy</p>
                  <p className="text-4xl font-black italic text-emerald-600 mt-1">$0</p>
                </div>
              </motion.div>
            </div>

            {/* Status Toggle */}
            <div className="bg-white p-6 rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-4 h-4 rounded-full ${storeData.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <div>
                  <p className="text-sm font-black uppercase tracking-tighter">Estado del Restaurante</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{storeData.isOpen ? 'Abierto y recibiendo pedidos' : 'Cerrado temporalmente'}</p>
                </div>
              </div>
              <button className={`w-14 h-8 rounded-full transition-all relative ${storeData.isOpen ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${storeData.isOpen ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Gestión de Negocio</h2>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    if (storeData.status !== 'verificado') {
                      toast.error('Tu cuenta debe estar verificada para subir productos.');
                      return;
                    }
                    setShowProductCreator(true);
                  }}
                  className={`p-6 rounded-[35px] shadow-xl flex flex-col items-center space-y-3 active:scale-95 transition-all ${storeData.status === 'verificado' ? 'bg-[#FF5722] text-white shadow-orange-100' : 'bg-slate-100 text-slate-400 shadow-slate-50 cursor-not-allowed'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${storeData.status === 'verificado' ? 'bg-white/20' : 'bg-slate-200'}`}>
                    <Plus size={28} />
                  </div>
                  <span className="font-black uppercase tracking-tighter text-xs">Nuevo Producto</span>
                </button>
                <button className="p-6 bg-white text-slate-800 rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 flex flex-col items-center space-y-3 active:scale-95 transition-all">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                    <Clock size={28} />
                  </div>
                  <span className="font-black uppercase tracking-tighter text-xs">Horarios</span>
                </button>
                <button 
                  onClick={() => setActiveView('menu')}
                  className="p-6 bg-white text-slate-800 rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 flex flex-col items-center space-y-3 active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Utensils size={28} />
                  </div>
                  <span className="font-black uppercase tracking-tighter text-xs">Mi Menú</span>
                </button>
                <button className="p-6 bg-white text-slate-800 rounded-[35px] shadow-xl shadow-slate-100 border border-slate-50 flex flex-col items-center space-y-3 active:scale-95 transition-all">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <TrendingUp size={28} />
                  </div>
                  <span className="font-black uppercase tracking-tighter text-xs">Reportes</span>
                </button>
              </div>
            </div>

            {/* Recent Orders Placeholder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Pedidos Activos</h2>
                <button className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Ver Historial</button>
              </div>
              <div className="bg-white p-10 rounded-[40px] shadow-xl shadow-slate-100 border border-slate-50 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Package size={32} className="text-slate-200" />
                </div>
                <p className="text-slate-400 font-bold text-sm">No tienes pedidos pendientes por ahora.</p>
              </div>
            </div>
          </>
        )}

        {activeView === 'menu' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Mi Menú</h2>
              </div>
              <button 
                onClick={() => setShowProductCreator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF5722] text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-orange-100 active:scale-95 transition-all"
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-[#FF5722]" size={32} />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] text-center space-y-4 border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Utensils size={32} className="text-slate-200" />
                </div>
                <p className="text-slate-400 font-bold">Aún no has agregado productos a tu menú.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {products.map((product) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50 flex items-center gap-4"
                  >
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Utensils size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 truncate">{product.name}</h3>
                      <p className="text-xs text-slate-400 font-bold line-clamp-1">{product.description}</p>
                      <p className="text-sm font-black text-[#FF5722] mt-1">${product.price}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center z-40">
        <button 
          onClick={() => setActiveView('dashboard')}
          className={`p-4 rounded-[22px] transition-all ${activeView === 'dashboard' ? 'bg-orange-50 text-orange-600 shadow-lg shadow-orange-50' : 'text-slate-300'}`}
        >
          <Store size={24} />
        </button>
        <button 
          onClick={() => setActiveView('orders')}
          className={`p-4 rounded-[22px] transition-all ${activeView === 'orders' ? 'bg-orange-50 text-orange-600 shadow-lg shadow-orange-50' : 'text-slate-300'}`}
        >
          <Package size={24} />
        </button>
        <button 
          onClick={() => setActiveView('menu')}
          className={`p-4 rounded-[22px] transition-all ${activeView === 'menu' ? 'bg-orange-50 text-orange-600 shadow-lg shadow-orange-50' : 'text-slate-300'}`}
        >
          <Utensils size={24} />
        </button>
        <button 
          onClick={() => setActiveView('settings')}
          className={`p-4 rounded-[22px] transition-all ${activeView === 'settings' ? 'bg-orange-50 text-orange-600 shadow-lg shadow-orange-50' : 'text-slate-300'}`}
        >
          <Settings size={24} />
        </button>
      </nav>

      {/* Product Creator Modal */}
      <AnimatePresence>
        {showProductCreator && (
          <ProductCreator 
            storeId={user.uid} 
            onComplete={() => {
              setShowProductCreator(false);
              fetchProducts();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
