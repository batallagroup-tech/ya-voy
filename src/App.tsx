/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { UserProfile, Order, RegistrationRequest, Message, Review } from './types';
import { cn } from './lib/utils';
import { 
  MapPin, 
  Navigation, 
  CheckCircle, 
  Clock, 
  User as UserIcon, 
  LogOut, 
  Package, 
  ChevronRight,
  Phone,
  MessageSquare,
  TrendingUp,
  Calendar,
  Layers,
  Camera,
  ChevronLeft,
  X,
  Plus,
  Eye,
  AlertCircle,
  Lock,
  Unlock,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue
import 'leaflet/dist/leaflet.css';

let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- Components ---

const ChatModal = ({ order, isOpen, onClose }: { order: Order, isOpen: boolean, onClose: () => void }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    
    // Initial fetch
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`order-chat-${order.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${order.id}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, order.id]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    try {
      await supabase.from('order_messages').insert({
        order_id: order.id,
        text: newMessage,
        sender_id: userData.user.id,
        sender_role: 'driver',
        created_at: new Date().toISOString()
      });
      setNewMessage('');
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar mensaje");
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 bg-white z-[2000] flex flex-col"
    >
      <div className="bg-brand-purple p-6 pt-12 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><ChevronLeft size={20} /></button>
          <div>
            <h3 className="font-bold">{order.clientName || 'Cliente'}</h3>
            <p className="text-[10px] opacity-70">Pedido #{order.id.slice(-6)}</p>
          </div>
        </div>
        <Phone size={20} className="opacity-70" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "max-w-[80%] p-3 rounded-2xl text-sm",
            msg.senderRole === 'driver' ? "bg-brand-purple text-white ml-auto rounded-tr-none" : "bg-gray-100 text-gray-700 mr-auto rounded-tl-none"
          )}>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
        />
        <button type="submit" className="bg-brand-purple text-white p-3 rounded-xl">
          <ChevronRight size={20} />
        </button>
      </form>
    </motion.div>
  );
};

const ReviewsModal = ({ profile, isOpen, onClose }: { profile: UserProfile, isOpen: boolean, onClose: () => void }) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('driver_id', profile.id) // Adjusted to driver_id per typical schema
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setReviews(data);
      }
    };

    fetchReviews();

    const channel = supabase
      .channel(`reviews-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter: `driver_id=eq.${profile.id}`
      }, () => {
        fetchReviews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, profile.id]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 bg-white z-[3000] flex flex-col"
    >
      <div className="bg-brand-purple p-8 pt-16 rounded-b-[3rem] text-white flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><ChevronLeft size={24} /></button>
          <h2 className="text-2xl font-black italic">Mis Reseñas</h2>
        </div>
        <Star size={24} className="text-yellow-400 fill-yellow-400" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-brand-orange/10 p-6 rounded-[2rem] border border-brand-orange/20">
          <p className="text-sm text-brand-orange font-bold flex items-start gap-3 leading-tight">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            Cada comentario es una oportunidad para mejorar. Esfuérzate en cada entrega para mantener tu calificación alta.
          </p>
        </div>

        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <Star size={48} className="mx-auto mb-4" />
              <p className="font-bold uppercase tracking-widest text-xs">Aún no tienes reseñas</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                      {review.client_photo_url ? (
                        <img src={review.client_photo_url} alt={review.client_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><UserIcon size={20} /></div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 leading-none">{review.client_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-400/10 px-3 py-1 rounded-full">
                    <span className="text-xs font-black text-yellow-600">{review.rating.toFixed(1)}</span>
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 italic">"{review.comment}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-brand-purple flex flex-col items-center justify-center text-white">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="mb-4"
    >
      <Navigation size={48} />
    </motion.div>
    <p className="font-black italic tracking-widest animate-pulse">CARGANDO...</p>
  </div>
);

const EarningsScreen = ({ orders, profile, onBack }: { orders: Order[], profile: UserProfile | null, onBack: () => void }) => {
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'total'>('today');
  const [showWithdrawals, setShowWithdrawals] = useState(false);
  const completedOrders = orders.filter(o => o.status === 'completed');
  
  const getFilterDate = () => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        const week = new Date(now.setDate(now.getDate() - 7));
        return new Date(week.setHours(0, 0, 0, 0));
      case 'month':
        const month = new Date(now.setMonth(now.getMonth() - 1));
        return new Date(month.setHours(0, 0, 0, 0));
      default:
        return new Date(0);
    }
  };

  const filterDate = getFilterDate();
  
  const filteredOrders = completedOrders.filter(o => {
    if (!o.completed_at) return false;
    const completedDate = new Date(o.completed_at);
    return completedDate >= filterDate;
  });

  const periodEarnings = filteredOrders.reduce((acc, o) => acc + (o.commission || 0), 0);
  const totalEarnings = completedOrders.reduce((acc, o) => acc + (o.commission || 0), 0);
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-brand-purple text-white p-6 pt-12 rounded-b-[3rem] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-white/20 rounded-full">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold">Mis Ganancias</h1>
          </div>
          <button 
            onClick={() => setShowWithdrawals(true)}
            className="bg-white/10 p-2 rounded-2xl backdrop-blur-md hover:bg-white/20 transition-all"
          >
            <TrendingUp size={20} />
          </button>
        </div>
        
        <div className="bg-white/10 p-6 rounded-[2.5rem] backdrop-blur-md mb-6 border border-white/20">
          <p className="text-sm opacity-70 uppercase font-black mb-1 letter tracking-widest text-center">
            {filter === 'today' ? 'Ganancias de Hoy' : 
             filter === 'week' ? 'Últimos 7 días' : 
             filter === 'month' ? 'Último mes' : 'Ganancias Totales'}
          </p>
          <p className="text-5xl font-black text-center italic drop-shadow-lg">${periodEarnings.toFixed(2)}</p>
        </div>

        <div className="flex bg-black/20 p-1 rounded-2xl gap-1">
          {(['today', 'week', 'month', 'total'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn(
                "flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all",
                filter === p ? "bg-white text-brand-purple shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              {p === 'today' ? 'Hoy' : p === 'week' ? '7D' : p === 'month' ? '30D' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 -mt-8">
        <div className="bg-white rounded-[2rem] shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="text-brand-orange" size={20} />
              Historial del Periodo
            </h2>
            <div className="text-[10px] font-black text-gray-400 uppercase">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Viaje' : 'Viajes'}
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                <p>No hay entregas en este periodo</p>
              </div>
            ) : (
              filteredOrders.sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')).map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-brand-purple/30 transition-colors">
                  <div>
                    <p className="font-bold text-gray-800">{order.restaurant_name || 'Restaurante'}</p>
                    <p className="text-xs text-gray-500">{order.completed_at ? new Date(order.completed_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-brand-purple text-lg">+${(order.commission || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Comisión</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {filter !== 'total' && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between opacity-60">
                <p className="text-sm font-bold text-gray-500">Acumulado Total</p>
                <p className="font-black text-gray-700">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showWithdrawals && profile && (
          <WithdrawalScreen 
            profile={profile} 
            onClose={() => setShowWithdrawals(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const WithdrawalScreen = ({ profile, onClose }: { profile: UserProfile, onClose: () => void }) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');

  useEffect(() => {
    const fetchWithdrawals = async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setWithdrawals(data);
      }
    };

    fetchWithdrawals();

    const channel = supabase
      .channel(`withdrawals-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'withdrawals',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        fetchWithdrawals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (withdrawAmount > (profile.balance || 0)) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (!method.trim()) {
      toast.error("Ingresa el método de pago (Clave/Banco)");
      return;
    }

    try {
      const { error } = await supabase.from('withdrawals').insert({
        user_id: profile.id,
        user_name: profile.name,
        amount: withdrawAmount,
        method: method,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      setAmount('');
      setMethod('');
      toast.success("Solicitud enviada correctamente");
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar la solicitud");
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 bg-white z-[3000] flex flex-col"
    >
      <div className="bg-brand-purple p-8 pt-16 rounded-b-[3rem] text-white flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><ChevronLeft size={24} /></button>
          <h2 className="text-2xl font-black italic">Retirar Saldo</h2>
        </div>
        <div className="bg-white/10 p-3 rounded-2xl">
          <TrendingUp size={24} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 text-center">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Disponible para retiro</p>
          <p className="text-5xl font-black text-brand-purple">${(profile.balance || 0).toFixed(2)}</p>
        </div>

        <form onSubmit={handleRequestWithdrawal} className="space-y-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Plus size={18} className="text-brand-orange" />
            Nueva Solicitud
          </h3>
          <div className="space-y-3">
            <input 
              type="number" 
              placeholder="Monto a retirar ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl py-4 px-6 text-lg font-bold focus:outline-brand-purple"
            />
            <input 
              type="text" 
              placeholder="Método (CLABE, Banco, etc)"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-gray-100 rounded-2xl py-4 px-6 focus:outline-brand-purple"
            />
          </div>
          <button className="w-full bg-brand-purple text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">
            SOLICITAR RETIRO
          </button>
        </form>

        <div className="space-y-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Clock size={18} className="text-brand-orange" />
            Historial de Retiros
          </h3>
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <p className="text-center py-10 text-gray-400 italic">No tienes retiros solicitados</p>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">${w.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{w.method}</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                    w.status === 'pending' ? "bg-brand-orange/10 text-brand-orange" : "bg-green-100 text-green-600"
                  )}>
                    {w.status === 'pending' ? 'Pendiente' : 'Completado'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DeliveryMap = ({ order, isSatellite }: { order: Order, isSatellite: boolean }) => {
  const center = order.restaurant_coords || { lat: 19.4326, lng: -99.1332 };
  
  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url={isSatellite 
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
          }
          attribution={isSatellite ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap'}
        />
        {order.restaurant_coords && (
          <Marker position={[order.restaurant_coords.lat, order.restaurant_coords.lng]}>
            <Popup>Recogida: {order.restaurant_address}</Popup>
          </Marker>
        )}
        {order.delivery_coords && (
          <Marker position={[order.delivery_coords.lat, order.delivery_coords.lng]}>
            <Popup>Entrega: {order.delivery_address}</Popup>
          </Marker>
        )}
        {order.restaurant_coords && order.delivery_coords && (
          <Polyline 
            positions={[
              [order.restaurant_coords.lat, order.restaurant_coords.lng],
              [order.delivery_coords.lat, order.delivery_coords.lng]
            ]} 
            color="#6D28D9"
            weight={4}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  );
};

const LoginScreen = ({ onToggleRegister }: { onToggleRegister: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("¡Bienvenido!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Error al iniciar sesión: " + (error.message || "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Error al iniciar sesión con Google");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-purple to-brand-orange flex flex-col items-center justify-center p-6 text-white">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <div className="bg-white p-4 rounded-3xl inline-block mb-4 shadow-2xl">
          <Navigation size={64} className="text-brand-purple" />
        </div>
        <h1 className="text-5xl font-black italic tracking-tighter mb-2">YA VOY</h1>
        <p className="text-xl font-medium opacity-90 uppercase tracking-widest">Repartidor</p>
      </motion.div>

      {!showEmailForm ? (
        <div className="w-full max-w-sm space-y-4">
          <button 
            onClick={() => setShowEmailForm(true)}
            className="w-full bg-white text-brand-purple font-bold py-4 rounded-2xl shadow-xl text-lg hover:bg-opacity-90 transition-all active:scale-95"
          >
            Inicio de sesión con correo
          </button>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white/10 border border-white/30 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg hover:bg-white/20 transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
            Inicio de sesión con Google
          </button>

          <div className="text-center pt-4">
            <button onClick={onToggleRegister} className="text-sm font-medium opacity-80 hover:opacity-100 underline">
              ¿No tienes cuenta? Registrarse
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <input 
              type="email" 
              placeholder="Correo electrónico" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-brand-purple font-bold py-4 rounded-2xl shadow-xl text-lg hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Iniciando..." : "INICIAR SESIÓN"}
          </button>

          <button 
            type="button"
            onClick={() => setShowEmailForm(false)}
            className="w-full text-sm font-bold opacity-70 hover:opacity-100 transition-all"
          >
            Volver
          </button>
        </form>
      )}

      <div className="mt-12 text-center max-w-xs">
        <p className="text-[10px] opacity-60 leading-tight">
          Al continuar, aceptas nuestros <span className="underline cursor-pointer">Términos y Condiciones</span> y nuestra <span className="underline cursor-pointer">Política de Privacidad</span>.
        </p>
      </div>
    </div>
  );
};

const RegisterScreen = ({ onToggleLogin, session }: { onToggleLogin: () => void, session?: any }) => {
  const [step, setStep] = useState(1);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formData, setFormData] = useState({
    email: session?.user?.email || '',
    password: '',
    name: session?.user?.user_metadata?.full_name || '',
    phone: '',
    address: '',
    vehicleType: 'moto' as 'moto' | 'auto' | 'bici',
    vehicleModel: '',
    vehiclePlate: '',
    docFront: 'https://picsum.photos/seed/front/400/250',
    docBack: 'https://picsum.photos/seed/back/400/250',
    docSelfie: session?.user?.user_metadata?.avatar_url || 'https://picsum.photos/seed/selfie/400/400',
  });
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  useEffect(() => {
    if (session && step === 1 && !showEmailForm) {
      setShowEmailForm(true);
    }
  }, [session]);

  const handleGoogleRegister = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    } catch (error) {
      console.error("Register error:", error);
      toast.error("Error al registrarse con Google");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 2) {
      setLoading(true);
      try {
        const response = await fetch('/api/verify/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.phone, code: verificationCode })
        });
        const data = await response.json();
        if (data.valid) {
          toast.success("Teléfono verificado");
          setStep(3);
        } else {
          toast.error("Código incorrecto");
        }
      } catch (error) {
        toast.error("Error al verificar código");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step < 4) {
      setStep(step + 1);
      return;
    }
    
    setLoading(true);
    try {
      let currentSession = session;
      if (!currentSession) {
        const { data, error } = await supabase.auth.signUp({ 
          email: formData.email, 
          password: formData.password 
        });
        if (error) throw error;
        currentSession = data.session;
      }
      
      const userId = currentSession?.user?.id || session?.user?.id;
      if (!userId) throw new Error("No user ID found");

      const newProfile: any = {
        id: userId,
        email: formData.email,
        name: formData.name,
        photo_url: formData.docSelfie,
        role: 'user',
        driver_status: 'offline',
        registration_status: 'pending_review',
        phone: formData.phone,
        verified: false,
        ine_front_url: formData.docFront,
        ine_back_url: formData.docBack,
        selfie_url: formData.docSelfie,
        vehicle_info: {
          type: formData.vehicleType,
          model: formData.vehicleModel,
          plate: formData.vehiclePlate,
        }
      };
      
      await supabase.from('users').upsert(newProfile);

      const registrationRequest: any = {
        user_id: userId,
        type: 'driver',
        status: 'pending',
        data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          vehicle: {
            type: formData.vehicleType,
            model: formData.vehicleModel,
            plate: formData.vehiclePlate
          }
        },
        documents: {
          front: formData.docFront,
          back: formData.docBack,
          selfie: formData.docSelfie
        },
        created_at: new Date().toISOString()
      };

      await supabase.from('solicitudes_de_registro').insert(registrationRequest);
      
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      }).catch(console.error);

      toast.success("Registro enviado correctamente");
    } catch (error: any) {
      console.error("Register error:", error);
      toast.error(error.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const sendVerification = async () => {
    if (!formData.phone) {
      toast.error("Ingresa tu teléfono");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      });
      const data = await response.json();
      if (data.status === 'pending') {
        setIsVerifyingPhone(true);
        toast.info("Código de verificación enviado al " + formData.phone);
      } else {
        toast.error("Error al enviar código: " + (data.error || "Intenta de nuevo"));
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-purple to-brand-orange flex flex-col items-center justify-center p-6 text-white">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <div className="bg-white p-4 rounded-3xl inline-block mb-4 shadow-2xl">
          <Navigation size={64} className="text-brand-purple" />
        </div>
        <h1 className="text-3xl font-black italic tracking-tighter mb-1 uppercase">Registro</h1>
        {!showEmailForm && <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Repartidor</p>}
        {showEmailForm && <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Paso {step} de 4</p>}
      </motion.div>

      {!showEmailForm ? (
        <div className="w-full max-w-sm space-y-4">
          <button 
            onClick={() => setShowEmailForm(true)}
            className="w-full bg-white text-brand-purple font-bold py-4 rounded-2xl shadow-xl text-lg hover:bg-opacity-90 transition-all active:scale-95"
          >
            Registrarse con correo
          </button>

          <button
            onClick={handleGoogleRegister}
            className="w-full bg-white/10 border border-white/30 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg hover:bg-white/20 transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
            Registrarse con Google
          </button>

          <div className="text-center pt-4">
            <button onClick={onToggleLogin} className="text-sm font-medium opacity-80 hover:opacity-100 underline">
              ¿Ya tienes cuenta? Iniciar sesión
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4">
          {step === 1 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              <input 
                type="text" 
                placeholder="Nombre Completo (como en tu INE)" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none"
                required
              />
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none"
                required
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none"
                required
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4 text-center">
              <p className="text-sm opacity-80 mb-4">Verifica tu número de teléfono para continuar</p>
              <input 
                type="tel" 
                placeholder="Teléfono (ej. +52...)" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none"
                required
              />
              {!isVerifyingPhone ? (
                <button 
                  type="button"
                  onClick={sendVerification}
                  className="w-full bg-brand-orange text-white font-bold py-3 rounded-xl shadow-lg"
                >
                  ENVIAR CÓDIGO
                </button>
              ) : (
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Código de 6 dígitos" 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full bg-white text-brand-purple rounded-2xl py-4 px-6 text-center text-2xl font-black tracking-widest focus:outline-none"
                    maxLength={6}
                  />
                  <p className="text-xs opacity-60">¿No recibiste el código? <button type="button" onClick={sendVerification} className="underline">Reenviar</button></p>
                </div>
              )}
            </motion.div>
          )}

        {step === 3 && (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
            <p className="text-sm opacity-80 text-center mb-4">Información del vehículo y dirección</p>
            <input 
              type="text" 
              placeholder="Dirección completa" 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none"
              required
            />
            <select 
              value={formData.vehicleType}
              onChange={(e) => setFormData({...formData, vehicleType: e.target.value as any})}
              className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white focus:outline-none appearance-none"
            >
              <option value="moto" className="text-black">Motocicleta</option>
              <option value="auto" className="text-black">Automóvil</option>
              <option value="bici" className="text-black">Bicicleta</option>
            </select>
            <input 
              type="text" 
              placeholder="Modelo (ej. Italika 150)" 
              value={formData.vehicleModel}
              onChange={(e) => setFormData({...formData, vehicleModel: e.target.value})}
              className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none"
              required
            />
            <input 
              type="text" 
              placeholder="Placas" 
              value={formData.vehiclePlate}
              onChange={(e) => setFormData({...formData, vehiclePlate: e.target.value})}
              className="w-full bg-white/20 border border-white/30 rounded-2xl py-4 px-6 text-white placeholder:text-white/60 focus:outline-none"
              required
            />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
            <p className="text-sm opacity-80 text-center mb-4">Documentación (INE/Identificación)</p>
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-dashed border-white/30 text-center">
                <Camera size={24} className="mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold uppercase">INE Frente</p>
                <p className="text-[10px] opacity-60 mt-1">Sube una foto clara del frente de tu identificación</p>
                <input 
                  type="text" 
                  placeholder="URL de imagen (Frente)" 
                  value={formData.docFront}
                  onChange={(e) => setFormData({...formData, docFront: e.target.value})}
                  className="w-full mt-2 bg-white/20 border border-white/30 rounded-xl py-2 px-4 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-dashed border-white/30 text-center">
                <Camera size={24} className="mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold uppercase">INE Reverso</p>
                <p className="text-[10px] opacity-60 mt-1">Sube una foto clara del reverso de tu identificación</p>
                <input 
                  type="text" 
                  placeholder="URL de imagen (Reverso)" 
                  value={formData.docBack}
                  onChange={(e) => setFormData({...formData, docBack: e.target.value})}
                  className="w-full mt-2 bg-white/20 border border-white/30 rounded-xl py-2 px-4 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-dashed border-white/30 text-center">
                <Camera size={24} className="mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold uppercase">Selfie con INE</p>
                <p className="text-[10px] opacity-60 mt-1">Tómate una selfie sosteniendo tu identificación</p>
                <input 
                  type="text" 
                  placeholder="URL de imagen (Selfie)" 
                  value={formData.docSelfie}
                  onChange={(e) => setFormData({...formData, docSelfie: e.target.value})}
                  className="w-full mt-2 bg-white/20 border border-white/30 rounded-xl py-2 px-4 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}
        
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => step === 1 ? setShowEmailForm(false) : setStep(step - 1)}
            className="flex-1 bg-white/10 border border-white/30 text-white font-bold py-4 rounded-2xl"
          >
            ATRÁS
          </button>
          <button 
            type="submit"
            disabled={loading || (step === 2 && !isVerifyingPhone)}
            className="flex-[2] bg-white text-brand-purple font-bold py-4 rounded-2xl shadow-xl text-lg disabled:opacity-50"
          >
            {loading ? "Procesando..." : step === 4 ? "FINALIZAR" : "SIGUIENTE"}
          </button>
        </div>
        </form>
      )}

      <div className="mt-12 text-center max-w-xs">
        <p className="text-[10px] opacity-60 leading-tight">
          Al continuar, aceptas nuestros <span className="underline cursor-pointer">Términos y Condiciones</span> y nuestra <span className="underline cursor-pointer">Política de Privacidad</span>.
        </p>
      </div>
    </div>
  );
};

const PendingReviewScreen = () => (
  <div className="min-h-screen bg-green-500 flex flex-col items-center justify-center p-8 text-white text-center">
    <motion.div 
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white/20 p-8 rounded-full mb-8"
    >
      <CheckCircle size={80} />
    </motion.div>
    <h1 className="text-4xl font-black italic mb-4">¡REGISTRO EXITOSO!</h1>
    <p className="text-xl font-medium mb-8 opacity-90">
      Tus documentos han sido enviados correctamente. Nuestro equipo revisará tu solicitud en las próximas 24-48 horas.
    </p>
    <div className="bg-white/10 p-6 rounded-3xl border border-white/20 max-w-sm">
      <p className="text-sm leading-relaxed">
        Te notificaremos por correo electrónico una vez que tu cuenta haya sido activada. ¡Gracias por querer ser parte de YA VOY!
      </p>
    </div>
    <button 
      onClick={() => supabase.auth.signOut()}
      className="mt-12 text-white/60 font-bold hover:text-white transition-colors flex items-center gap-2"
    >
      <LogOut size={20} /> CERRAR SESIÓN
    </button>
  </div>
);

const RejectedScreen = ({ reason, onRetry }: { reason?: string, onRetry: () => void }) => (
  <div className="min-h-screen bg-red-500 flex flex-col items-center justify-center p-8 text-white text-center">
    <motion.div 
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white/20 p-8 rounded-full mb-8"
    >
      <AlertCircle size={80} />
    </motion.div>
    <h1 className="text-4xl font-black italic mb-4">SOLICITUD RECHAZADA</h1>
    <p className="text-xl font-medium mb-6 opacity-90">
      Lo sentimos, tu solicitud no ha sido aprobada en este momento.
    </p>
    
    {reason && (
      <div className="bg-white text-red-600 p-6 rounded-3xl shadow-xl mb-8 max-w-sm w-full">
        <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">Motivo del rechazo:</p>
        <p className="font-bold text-lg">{reason}</p>
      </div>
    )}

    <button 
      onClick={onRetry}
      className="bg-white text-red-600 font-bold py-4 px-8 rounded-2xl shadow-xl text-lg mb-6 w-full max-w-sm"
    >
      VOLVER A ENVIAR SOLICITUD
    </button>

    <button 
      onClick={() => supabase.auth.signOut()}
      className="text-white/60 font-bold hover:text-white transition-colors flex items-center gap-2"
    >
      <LogOut size={20} /> CERRAR SESIÓN
    </button>
  </div>
);

// --- Main App ---

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [view, setView] = useState<'home' | 'earnings' | 'profile'>('home');
  const [isSatellite, setIsSatellite] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [restaurantKeywordInput, setRestaurantKeywordInput] = useState('');
  const [userKeywordInput, setUserKeywordInput] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id, session.user.email);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // New user
      const isRamses = email === '2430936@upt.edu.mx';
      const newProfile: any = {
        id: userId,
        email: email || '',
        name: isRamses ? 'RamsesREPARTO' : 'Repartidor',
        photo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(isRamses ? 'Ramses' : 'R')}&background=6D28D9&color=fff`,
        role: isRamses ? 'repartidor' : 'user',
        driver_status: 'offline',
        registration_status: isRamses ? 'approved' : 'not_started',
        verified: isRamses,
        debt: 0,
        balance: 0
      };
      await supabase.from('users').insert(newProfile);
      setProfile(newProfile as UserProfile);
    } else if (data) {
      setProfile(data as UserProfile);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.registration_status === 'approved') {
      const fetchOrders = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          const allOrders = data as Order[];
          setOrders(allOrders);
          setAvailableOrders(allOrders.filter(o => o.status === 'ready' && !o.driver_id));
          const active = allOrders.find(o => o.driver_id === profile.id && ['accepted', 'preparing', 'ready', 'delivering'].includes(o.status));
          setActiveOrder(active || null);
        }
      };

      fetchOrders();

      const channel = supabase
        .channel('orders-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
        }, () => {
          fetchOrders();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile]);

  // Simulate movement for active order
  useEffect(() => {
    if (!activeOrder || !profile) return;

    const interval = setInterval(async () => {
      const newLat = (activeOrder.driver_location?.lat || 19.4326) + (Math.random() - 0.5) * 0.001;
      const newLng = (activeOrder.driver_location?.lng || -99.1332) + (Math.random() - 0.5) * 0.001;
      
      try {
        await supabase
          .from('orders')
          .update({
            driver_location: { lat: newLat, lng: newLng },
            updated_at: new Date().toISOString()
          })
          .eq('id', activeOrder.id);
      } catch (e) {
        console.error("Location update failed", e);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activeOrder?.id, profile?.id]);

  const handleUpdatePhoto = async () => {
    // Identity Verification Enforcement: Warning for drivers
    if (profile?.role === 'repartidor') {
      const confirmWarning = confirm(
        "ADVERTENCIA DE SEGURIDAD:\n\nTu foto de perfil DEBE mostrar claramente tu rostro según tu INE.\n\nCualquier intento de usar fotos de paisajes, mascotas, objetos o rostros que no coincidan con tu identidad resultará en la ELIMINACIÓN PERMANENTE de tu cuenta sin previo aviso.\n\n¿Deseas continuar bajo tu propia responsabilidad?"
      );
      if (!confirmWarning) return;
    }

    const newUrl = prompt("Ingresa la URL de tu nueva foto de perfil:");
    if (newUrl && profile) {
      try {
        await supabase.from('users').update({ photo_url: newUrl }).eq('id', profile.id);
        toast.success("Foto actualizada");
      } catch (error) {
        toast.error("Error al actualizar foto");
      }
    }
  };

  const [showVehicleManager, setShowVehicleManager] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
    toast.info(`Llamando a ${number}...`);
  };

  const handleMessage = (number: string) => {
    window.location.href = `sms:${number}`;
    toast.info(`Enviando mensaje a ${number}...`);
  };

  const toggleStatus = async () => {
    if (!profile) return;
    const newStatus = profile.driver_status === 'online' ? 'offline' : 'online';
    try {
      await supabase.from('users').update({ driver_status: newStatus }).eq('id', profile.id);
      toast.success(`Ahora estás ${newStatus === 'online' ? 'en línea' : 'fuera de línea'}`);
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar estado");
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!profile || profile.driver_status !== 'online') {
      toast.error("Debes estar en línea para aceptar pedidos");
      return;
    }
    if ((profile.debt || 0) >= 100) {
      toast.error("Tienes una deuda acumulada de $100 o más. Por favor, liquida tu saldo para continuar.");
      return;
    }
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'delivering', 
          driver_id: profile.id,
          updated_at: new Date().toISOString(),
          driver_location: { lat: 19.4326, lng: -99.1332 },
          driver_name: profile.name,
          driver_phone: profile.phone || ''
        })
        .eq('id', orderId)
        .is('driver_id', null);

      if (orderError) throw orderError;

      const { error: userError } = await supabase
        .from('users')
        .update({ 
          current_order_id: orderId,
          driver_status: 'busy'
        })
        .eq('id', profile.id);

      if (userError) throw userError;

      toast.success("Pedido aceptado. ¡En marcha!");
    } catch (e) {
      console.error(e);
      toast.error("Error al aceptar el pedido");
    }
  };

  const verifyRestaurantKeyword = async () => {
    if (!activeOrder) return;
    if (restaurantKeywordInput.toLowerCase() === (activeOrder.restaurant_keyword || '1234').toLowerCase()) {
      try {
        await supabase
          .from('orders')
          .update({
            is_restaurant_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeOrder.id);
        
        setRestaurantKeywordInput('');
        toast.success("¡Recolección verificada! Ahora puedes ver los datos del cliente.");
      } catch (e) {
        toast.error("Error al verificar recolección");
      }
    } else {
      toast.error("Palabra clave del restaurante incorrecta");
    }
  };

  const verifyUserKeyword = async () => {
    if (!activeOrder) return;
    if (userKeywordInput.toLowerCase() === (activeOrder.user_keyword || '5678').toLowerCase()) {
      try {
        await supabase
          .from('orders')
          .update({
            is_user_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeOrder.id);

        setUserKeywordInput('');
        toast.success("¡Código de entrega verificado!");
      } catch (e) {
        toast.error("Error al verificar entrega");
      }
    } else {
      toast.error("Código de entrega incorrecto");
    }
  };

  const completeOrder = async (orderId: string) => {
    if (!profile || !activeOrder) return;
    if (!activeOrder.is_restaurant_verified || !activeOrder.is_user_verified) {
      toast.error("Debes completar las verificaciones antes de finalizar");
      return;
    }
    try {
      const commission = orders.find(o => o.id === orderId)?.commission || 0;

      await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      await supabase
        .from('users')
        .update({ 
          current_order_id: null,
          driver_status: 'online',
          total_deliveries: (profile.total_deliveries || 0) + 1,
          balance: (profile.balance || 0) + commission,
          total_earnings: (profile.total_earnings || 0) + commission
        })
        .eq('id', profile.id);

      toast.success("¡Pedido entregado con éxito!");
    } catch (e) {
      console.error(e);
      toast.error("Error al finalizar el pedido");
    }
  };

  if (loading) return <LoadingScreen />;

  if (!session?.user) {
    return showRegister ? (
      <RegisterScreen onToggleLogin={() => setShowRegister(false)} />
    ) : (
      <LoginScreen onToggleRegister={() => setShowRegister(true)} />
    );
  }

  // Check if user is approved repartidor
  if (profile?.role !== 'repartidor' || !profile?.verified) {
    if (profile?.registration_status === 'pending_review') {
      return <PendingReviewScreen />;
    }
    if (profile?.registration_status === 'rejected') {
      return <RejectedScreen reason={profile.rejection_reason} onRetry={() => supabase.from('users').update({ registration_status: 'not_started' }).eq('id', profile.id)} />;
    }
    // If not started or just a regular user, show register flow
    return <RegisterScreen onToggleLogin={() => supabase.auth.signOut()} session={session} />;
  }

  if (view === 'earnings' && profile) {
    return <EarningsScreen orders={orders} profile={profile} onBack={() => setView('home')} />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-brand-purple text-white p-6 pt-12 rounded-b-[3rem] sticky top-0 z-50 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <img 
              src={profile?.photo_url} 
              alt={profile?.name} 
              className="w-14 h-14 rounded-2xl border-2 border-white/30 shadow-lg object-cover" 
            />
            <div className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-brand-purple",
              profile?.driver_status === 'online' ? "bg-green-500" : profile?.driver_status === 'busy' ? "bg-brand-orange" : "bg-gray-400"
            )} />
          </div>
          <div>
            <h2 className="font-black text-lg leading-tight italic">{profile?.name}</h2>
            <p className="text-xs opacity-70 uppercase tracking-widest font-black">
              {profile?.driver_status === 'online' ? 'Disponible' : profile?.driver_status === 'busy' ? 'En entrega' : 'Desconectado'}
            </p>
          </div>
        </div>
        <button 
          onClick={toggleStatus}
          className={cn(
            "px-6 py-2 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95",
            profile?.driver_status === 'offline' ? "bg-white text-brand-purple" : "bg-brand-orange text-white"
          )}
        >
          {profile?.driver_status === 'offline' ? 'CONECTAR' : 'DESCONECTAR'}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {activeOrder ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-gray-200 relative">
              {activeOrder.is_restaurant_verified ? (
                <DeliveryMap order={activeOrder} isSatellite={isSatellite} />
              ) : (
                <div className="h-full w-full bg-gray-100 flex flex-col items-center justify-center p-8 text-center">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 max-w-xs">
                    <Lock size={48} className="text-brand-purple mx-auto mb-4" />
                    <h3 className="font-black text-lg mb-2 italic">Mapa Bloqueado</h3>
                    <p className="text-xs text-gray-500">Ingresa la palabra clave del restaurante para desbloquear la ubicación del cliente.</p>
                  </div>
                </div>
              )}
              
              {/* Map Controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
                {activeOrder.is_restaurant_verified && (
                  <button 
                    onClick={() => setIsSatellite(!isSatellite)}
                    className={cn(
                      "p-3 rounded-2xl shadow-xl transition-all",
                      isSatellite ? "bg-brand-orange text-white" : "bg-white text-gray-700"
                    )}
                  >
                    <Layers size={20} />
                  </button>
                )}
              </div>
            </div>

            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-white p-6 rounded-t-[3rem] shadow-2xl -mt-12 relative z-10 border-t border-gray-100"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
              
              {/* Phase 1: Restaurant Verification */}
              {!activeOrder.is_restaurant_verified && (
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1 font-sans">Pase 1: Recolección</p>
                      <h2 className="text-2xl font-black text-gray-900 italic">{activeOrder.restaurant_name}</h2>
                    </div>
                    <div className="bg-brand-orange/10 p-3 rounded-2xl">
                      <Clock className="text-brand-orange" size={24} />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 space-y-4">
                    <p className="text-xs font-bold text-gray-600 flex items-center gap-2">
                      <Lock size={14} /> Solicita la palabra clave al restaurante
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Palabra Restaurante"
                        value={restaurantKeywordInput}
                        onChange={(e) => setRestaurantKeywordInput(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-brand-purple"
                      />
                      <button 
                        onClick={verifyRestaurantKeyword}
                        className="bg-brand-purple text-white px-6 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
                      >
                        VERIFICAR
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase 2: Client/Final Info (locked until restaurant verified) */}
              <div className={cn("transition-all duration-500", !activeOrder.is_restaurant_verified && "opacity-40 pointer-events-none")}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    {activeOrder.is_restaurant_verified ? (
                      <>
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <CheckCircle size={10} /> Recolección Exitosa
                        </p>
                        <h2 className="text-2xl font-black text-gray-900 italic">{activeOrder.client_name || 'Cliente'}</h2>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin size={14} className="text-brand-orange" />
                          {activeOrder.delivery_address}
                        </p>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                          <Lock size={12} /> Datos del cliente bloqueados
                        </p>
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="bg-brand-purple/10 p-3 rounded-2xl">
                    <UserIcon className="text-brand-purple" size={24} />
                  </div>
                </div>

                {activeOrder.is_restaurant_verified && !activeOrder.is_user_verified && (
                  <div className="bg-brand-purple/5 p-4 rounded-3xl border border-brand-purple/10 mb-6 space-y-3">
                    <p className="text-xs font-bold text-brand-purple flex items-center gap-2">
                      <Lock size={14} /> Solicita el código de entrega al cliente
                    </p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Código Usuario"
                        value={userKeywordInput}
                        onChange={(e) => setUserKeywordInput(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-brand-purple"
                      />
                      <button 
                        onClick={verifyUserKeyword}
                        className="bg-brand-orange text-white px-6 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
                      >
                        VERIFICAR
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button 
                    disabled={!activeOrder.is_restaurant_verified}
                    onClick={() => handleCall(activeOrder.driver_phone || '555-0123')}
                    className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 font-bold py-4 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all disabled:opacity-50"
                  >
                    <Phone size={18} /> Llamar
                  </button>
                  <button 
                    disabled={!activeOrder.is_restaurant_verified}
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 font-bold py-4 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all disabled:opacity-50"
                  >
                    <MessageSquare size={18} /> Chat
                  </button>
                </div>

                <button 
                  onClick={() => completeOrder(activeOrder.id)}
                  disabled={!activeOrder.is_restaurant_verified || !activeOrder.is_user_verified}
                  className={cn(
                    "w-full font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]",
                    (activeOrder.is_restaurant_verified && activeOrder.is_user_verified) 
                      ? "bg-brand-purple text-white hover:bg-opacity-90" 
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {activeOrder.is_user_verified ? <CheckCircle size={24} /> : <Lock size={20} />}
                  FINALIZAR ENTREGA
                </button>
              </div>
            </motion.div>
            
            <AnimatePresence>
              {isChatOpen && activeOrder && (
                <ChatModal order={activeOrder} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-full bg-gray-50 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-900">Pedidos Disponibles</h2>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <TrendingUp size={20} className="text-brand-orange" />
              </div>
            </div>

            <div className="space-y-6">
              {availableOrders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-medium">Esperando nuevos pedidos...</p>
                </div>
              ) : (
                availableOrders.map(order => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-gray-50 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    
                    <div className="flex justify-between items-start mb-4 relative">
                      <div>
                        <p className="text-xs font-black text-brand-orange uppercase tracking-widest mb-1">Nuevo Pedido</p>
                        <h3 className="text-xl font-bold text-gray-900">{order.restaurantName || 'Restaurante'}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-brand-purple">${(order.commission || 15).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Ganancia</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 relative">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-brand-purple/10 rounded-full flex items-center justify-center mt-0.5">
                          <div className="w-2 h-2 bg-brand-purple rounded-full" />
                        </div>
                        <p className="text-sm text-gray-600 leading-tight">{order.restaurantAddress}</p>
                      </div>
                      <div className="w-px h-4 bg-gray-200 ml-3" />
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-brand-orange/10 rounded-full flex items-center justify-center mt-0.5">
                          <MapPin size={12} className="text-brand-orange" />
                        </div>
                        <p className="text-sm text-gray-600 leading-tight">{order.deliveryAddress}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => acceptOrder(order.id)}
                      className="w-full bg-brand-purple text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95"
                    >
                      ACEPTAR RUTA <ChevronRight size={20} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <div className="bg-white border-t border-gray-100 p-4 flex justify-around items-center shadow-[0_-10px_30px_rgba(0,0,0,0.05)] relative z-20">
        <button 
          onClick={() => setView('home')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'home' ? "text-brand-purple scale-110" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Navigation size={24} fill={view === 'home' ? "currentColor" : "none"} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Rutas</span>
        </button>
        
        <button 
          onClick={() => setView('earnings')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'earnings' ? "text-brand-purple scale-110" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <TrendingUp size={24} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Ganancias</span>
        </button>

        <button 
          onClick={() => setView('profile')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'profile' ? "text-brand-purple scale-110" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <UserIcon size={24} fill={view === 'profile' ? "currentColor" : "none"} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Perfil</span>
        </button>
      </div>

      {/* Profile Modal Overlay */}
      <AnimatePresence>
        {view === 'profile' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-50 overflow-y-auto"
          >
            <div className="bg-brand-purple text-white p-8 pt-16 rounded-b-[4rem] relative shadow-2xl">
              <button 
                onClick={() => setView('home')}
                className="absolute top-8 right-8 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"
              >
                <X size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <img 
                  src={profile?.photo_url} 
                  alt={profile?.name} 
                  className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white/30 shadow-2xl"
                />
                <button 
                  onClick={handleUpdatePhoto}
                  className="absolute bottom-0 right-0 bg-brand-orange p-3 rounded-2xl shadow-xl text-white hover:scale-110 transition-all"
                >
                  <Camera size={20} />
                </button>
              </div>
              <h2 className="text-3xl font-black italic flex items-center gap-2">
                {profile?.name}
                {profile?.registration_status === 'approved' && (
                  <div title="Identidad Verificada (INE)" className="bg-white/20 p-1 rounded-full">
                    <CheckCircle size={16} className="text-green-300" />
                  </div>
                )}
              </h2>
              {profile?.registration_status === 'approved' && (
                <p className="text-[10px] text-green-300 font-bold uppercase tracking-widest mt-1">Nombre Verificado por INE (Protegido)</p>
              )}
              <p className="text-brand-purple-light font-bold uppercase tracking-widest text-sm">{profile?.email}</p>
            </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 p-4 rounded-3xl text-center backdrop-blur-md">
                  <p className="text-[10px] uppercase font-black opacity-60">Entregas</p>
                  <p className="text-xl font-black">{profile?.total_deliveries || 0}</p>
                </div>
                  <button 
                    onClick={() => setIsReviewsOpen(true)}
                    className="bg-white/10 p-4 rounded-3xl text-center backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
                  >
                    <p className="text-[10px] uppercase font-black opacity-60">Rating</p>
                    <p className="text-xl font-black">{(profile?.rating || 5.0).toFixed(1)} ⭐</p>
                  </button>
                  <div className="bg-white/10 p-4 rounded-3xl text-center backdrop-blur-md">
                  <p className="text-[10px] uppercase font-black opacity-60">Balance</p>
                  <p className="text-xl font-black">${(profile?.balance || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-3xl text-center backdrop-blur-md">
                  <p className="text-[10px] uppercase font-black opacity-60">Deuda</p>
                  <p className="text-xl font-black text-brand-orange">${(profile?.debt || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Configuración</h3>
                
                <div className="bg-gray-50 rounded-[2rem] p-2 space-y-1">
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full animate-pulse",
                        profile?.driver_status === 'online' ? "bg-green-500" : "bg-gray-300"
                      )} />
                      <span className="font-bold text-gray-700">Estado: {profile?.driver_status === 'online' ? 'Disponible' : 'Desconectado'}</span>
                    </div>
                    <button 
                      onClick={toggleStatus}
                      className={cn(
                        "px-6 py-2 rounded-xl font-black text-xs transition-all",
                        profile?.driver_status === 'online' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      )}
                    >
                      {profile?.driver_status === 'online' ? 'OFF' : 'ON'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 text-gray-700">
                      <CheckCircle size={20} className={profile?.verified ? "text-green-500" : "text-gray-300"} />
                      <span className="font-bold">Verificación: {profile?.verified ? 'Verificado' : 'Pendiente'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Package size={20} className="text-brand-purple" />
                      <span className="font-bold">Vehículo: {profile?.vehicle_info?.model}</span>
                    </div>
                    <button 
                      onClick={() => setShowVehicleManager(true)}
                      className="text-xs font-black text-brand-orange uppercase hover:underline"
                    >
                      Gestionar
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Otras Opciones</h3>
                <div className="bg-gray-50 rounded-[2rem] p-2 space-y-1">
                  <button 
                    onClick={() => setShowAdvancedSettings(true)}
                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm group"
                  >
                    <span className="font-bold text-gray-700 group-hover:text-brand-purple transition-colors">Configuración Avanzada</span>
                    <ChevronRight size={18} className="text-gray-300" />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => signOut(auth)}
                className="w-full bg-red-50 text-red-600 font-black py-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-red-100 transition-all"
              >
                <LogOut size={24} /> CERRAR SESIÓN
              </button>
            </div>

            <AnimatePresence>
              {showVehicleManager && profile && (
                <VehicleManager 
                  profile={profile} 
                  onClose={() => setShowVehicleManager(false)} 
                />
              )}
              {showAdvancedSettings && (
                <AdvancedSettings 
                  onClose={() => setShowAdvancedSettings(false)} 
                />
              )}
              {isReviewsOpen && profile && (
                <ReviewsModal
                  profile={profile}
                  isOpen={isReviewsOpen}
                  onClose={() => setIsReviewsOpen(false)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const VehicleManager = ({ profile, onClose }: { profile: UserProfile, onClose: () => void }) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    type: 'moto',
    model: '',
    plate: '',
    papers_url: ''
  });

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('driver_vehicles')
        .select('*')
        .eq('driver_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(error);
        return;
      }
      setVehicles(data);
    };

    fetchVehicles();

    const channel = supabase
      .channel('vehicles-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'driver_vehicles',
        filter: `driver_id=eq.${profile.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVehicles(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setVehicles(prev => prev.map(v => v.id === payload.new.id ? payload.new : v));
        } else if (payload.eventType === 'DELETE') {
          setVehicles(prev => prev.filter(v => v.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.model || !newVehicle.plate) {
      toast.error("Completa todos los campos");
      return;
    }
    try {
      const { error } = await supabase.from('driver_vehicles').insert({
        driver_id: profile.id,
        ...newVehicle,
        status: 'pending_review',
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      await supabase.from('solicitudes_vehiculo').insert({
        user_id: profile.id,
        user_name: profile.name,
        ...newVehicle,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      
      setShowAddForm(false);
      setNewVehicle({ type: 'moto', model: '', plate: '', papers_url: '' });
      toast.success("Vehículo enviado para verificación");
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar vehículo");
    }
  };

  const selectVehicle = async (v: any) => {
    if (v.status !== 'approved') {
      toast.error("Este vehículo aún no está verificado");
      return;
    }
    try {
      await supabase.from('users').update({
        vehicle_info: {
          type: v.type,
          model: v.model,
          plate: v.plate
        }
      }).eq('id', profile.id);
      toast.success("Vehículo activo actualizado");
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar vehículo");
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 bg-white z-[3000] flex flex-col"
    >
      <div className="bg-brand-purple p-8 pt-16 rounded-b-[3rem] text-white flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><ChevronLeft size={24} /></button>
          <h2 className="text-2xl font-black italic">Gestión de Vehículos</h2>
        </div>
        <Package size={24} className="opacity-70" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-700">Tus Vehículos</h3>
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-xs font-black text-brand-purple bg-brand-purple/10 px-4 py-2 rounded-xl"
            >
              <Plus size={14} /> AGREGAR
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Show currently selected as primary */}
            <div className="p-5 bg-brand-purple/5 border-2 border-brand-purple/20 rounded-[2rem]">
              <p className="text-[10px] font-black text-brand-purple uppercase mb-2 tracking-widest">Vehículo Activo</p>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-lg text-gray-900">{profile.vehicle_info?.model}</h4>
                  <p className="text-xs text-gray-500 uppercase">{profile.vehicle_info?.plate}</p>
                </div>
                <CheckCircle size={24} className="text-green-500" />
              </div>
            </div>

            {vehicles.filter(v => v.plate !== profile.vehicle_info?.plate).map(v => (
              <div 
                key={v.id} 
                onClick={() => selectVehicle(v)}
                className={cn(
                  "p-5 border border-gray-100 rounded-[2rem] flex items-center justify-between hover:border-brand-purple/30 transition-all cursor-pointer",
                  v.status === 'approved' ? "bg-white" : "bg-gray-50 opacity-80"
                )}
              >
                <div>
                  <h4 className="font-bold text-gray-800">{v.model}</h4>
                  <p className="text-[10px] text-gray-400 uppercase">{v.plate}</p>
                </div>
                <div className={cn(
                  "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                  v.status === 'approved' ? "bg-green-100 text-green-600" : "bg-brand-orange/10 text-brand-orange"
                )}>
                  {v.status === 'approved' ? 'Verificado' : 'En Revisión'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 z-[3100] flex items-end">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="w-full bg-white rounded-t-[3rem] p-8 space-y-6 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black italic">Nuevo Vehículo</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddVehicle} className="space-y-4">
              <select 
                value={newVehicle.type}
                onChange={(e) => setNewVehicle({...newVehicle, type: e.target.value})}
                className="w-full bg-gray-100 rounded-2xl py-4 px-6 focus:outline-brand-purple"
              >
                <option value="moto">Motocicleta</option>
                <option value="auto">Automóvil</option>
                <option value="bici">Bicicleta</option>
              </select>
              <input 
                type="text" 
                placeholder="Modelo (ej. Italika 250)"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                className="w-full bg-gray-100 rounded-2xl py-4 px-6 focus:outline-brand-purple"
                required
              />
              <input 
                type="text" 
                placeholder="Placas"
                value={newVehicle.plate}
                onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value})}
                className="w-full bg-gray-100 rounded-2xl py-4 px-6 focus:outline-brand-purple"
                required
              />
              <div className="bg-brand-orange/10 p-4 rounded-2xl border border-brand-orange/20">
                <p className="text-xs text-brand-orange font-bold flex items-center gap-2">
                  <AlertCircle size={16} /> 
                  Requiere verificación de papeles
                </p>
                <input 
                  type="text" 
                  placeholder="URL de Documentos (Tarjeta Circulación)"
                  value={newVehicle.papers_url}
                  onChange={(e) => setNewVehicle({...newVehicle, papers_url: e.target.value})}
                  className="w-full mt-2 bg-white/50 rounded-xl py-2 px-4 text-xs focus:outline-brand-orange"
                />
              </div>
              <button className="w-full bg-brand-purple text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">
                ENVIAR PARA REVISIÓN
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const AdvancedSettings = ({ onClose }: { onClose: () => void }) => {
  const handleChangePassword = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      try {
        const newPassword = prompt("Ingresa tu nueva contraseña:");
        if (newPassword && newPassword.length >= 6) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) throw error;
          toast.success("Contraseña actualizada correctamente");
        } else if (newPassword) {
          toast.error("La contraseña debe tener al menos 6 caracteres");
        }
      } catch (e: any) {
        toast.error("Error al actualizar: " + (e.message || "Intenta de nuevo"));
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("¿ESTAS SEGURO? Esta acción es irreversible y eliminará todos tus datos.")) {
      if (confirm("Confirmación final: Escribe 'ELIMINAR' para continuar.")) {
        // Supabase deletion usually requires server-side or a specific setup
        toast.error("Funcionalidad restringida por seguridad actual. Contacta a soporte.");
      }
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 bg-white z-[3000] flex flex-col"
    >
      <div className="bg-gray-900 p-8 pt-16 rounded-b-[3rem] text-white flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full"><ChevronLeft size={24} /></button>
          <h2 className="text-2xl font-black italic">Avanzado</h2>
        </div>
        <Eye size={24} className="opacity-70" />
      </div>

      <div className="flex-1 p-8 space-y-6">
        <div className="space-y-4">
          <button 
            onClick={handleChangePassword}
            className="w-full flex items-center gap-4 p-5 bg-gray-50 rounded-3xl text-left hover:bg-gray-100 transition-all border border-gray-100"
          >
            <div className="bg-brand-purple/10 p-3 rounded-2xl text-brand-purple">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-black text-gray-900">Cambiar Contraseña</p>
              <p className="text-xs text-gray-500">Actualiza tus credenciales de acceso</p>
            </div>
          </button>

          <button 
            onClick={handleDeleteAccount}
            className="w-full flex items-center gap-4 p-5 bg-red-50 rounded-3xl text-left hover:bg-red-100 transition-all border border-red-100"
          >
            <div className="bg-red-500/10 p-3 rounded-2xl text-red-500">
              <X size={24} />
            </div>
            <div>
              <p className="font-black text-red-600">Eliminar Cuenta</p>
              <p className="text-xs text-red-400">Borrado permanente de datos</p>
            </div>
          </button>
        </div>

        <div className="bg-gray-50 p-6 rounded-[2.5rem] mt-10">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Información de Sistema</p>
          <div className="space-y-3 opacity-60 text-xs font-medium">
            <div className="flex justify-between"><span>Versión App</span><span>2.4.0-build</span></div>
            <div className="flex justify-between"><span>ID de Sesión</span><span className="font-mono text-[8px]">{session?.user?.id.slice(0, 12)}...</span></div>
            <div className="flex justify-between"><span>Conexión</span><span className="text-green-600 font-bold">Segura (SSL)</span></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
