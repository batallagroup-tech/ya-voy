import React from 'react';
import { motion } from 'motion/react';
import { 
  Ticket, Gift, Users, Star, 
  ChevronRight, Copy, Share2, 
  Zap, Clock, ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface BenefitsCenterProps {
  userData: any;
  onSelectStore: (store: any) => void;
}

export const BenefitsCenter: React.FC<BenefitsCenterProps> = ({ userData, onSelectStore }) => {
  const copyReferral = () => {
    const code = userData?.referralCode || `YAVOY-${(userData?.displayName || "VIP").toUpperCase().split(' ')[0]}-2024`;
    navigator.clipboard.writeText(code);
    toast.success("Código copiado al portapapeles");
  };

  const activeCoupons = [
    { id: '1', code: 'PRIMERAVOY', discount: '$50 MXN', desc: 'En tu primer pedido', min: '$200 MXN', expiry: '31 May' },
    { id: '2', code: 'ENVIOYAVOY', discount: 'Envío Gratis', desc: 'En tiendas seleccionadas', min: '$150 MXN', expiry: 'Hoy' },
  ];

  const promotions = [
    { id: 'S1', name: 'Pizza Nostra', promo: '2x1 en Pepperoni', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800', type: 'Comida' },
    { id: 'S2', name: 'Farmacia San Rafael', promo: '15% Descuento', img: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?q=80&w=800', type: 'Salud' },
  ];

  const points = userData?.points !== undefined ? userData.points : 1250;

  const redeemPoints = async () => {
    if (points < 1000) {
      toast.error("Necesitas al menos 1,000 puntos para canjear.");
      return;
    }
    
    try {
       const reward = 50;
       await updateDoc(doc(db, 'users', userData.uid), {
         points: increment(-1000),
         balance: increment(reward)
       });
       toast.success(`¡Canjeado! Has recibido $${reward} MXN.`);
    } catch (err) {
       console.error("Redeem error:", err);
       toast.error("Error al procesar el canje.");
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Points Summary Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl shadow-purple-200 dark:shadow-none"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap size={140} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Mis Puntos Club</p>
          <div className="flex items-end space-x-2">
            <h2 className="text-5xl font-black italic tracking-tighter leading-none">{points.toLocaleString()}</h2>
            <p className="text-sm font-black uppercase mb-1">puntos</p>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <Star size={12} className="text-amber-300 fill-amber-300" />
                </div>
              ))}
            </div>
            <button 
              onClick={redeemPoints}
              className="px-6 py-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/30 transition-all active:scale-95"
            >
              Canjear
            </button>
          </div>
        </div>
      </motion.div>

      {/* Referral Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 px-1">Invita y Gana</h3>
        <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-800/30 p-6 rounded-[35px] space-y-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white dark:bg-slate-900 text-amber-500 rounded-2xl shadow-sm">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-black italic uppercase tracking-tight text-amber-900 dark:text-amber-400">Regala $100, Gana $50</h4>
              <p className="text-xs font-bold text-amber-800/60 dark:text-amber-200/50 mt-1 leading-relaxed">
                Comparte tu código con amigos. Ellos reciben $100 en su primer pedido y tú recibes $50 cuando completen su compra.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-800/50 shadow-inner">
            <div className="flex-1 px-4 font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm truncate">
              {userData?.referralCode || `YAVOY-${(userData?.displayName || "VIP").toUpperCase().split(' ')[0]}-2024`}
            </div>
            <button 
              onClick={copyReferral}
              className="p-3 bg-amber-500 text-white rounded-xl active:scale-90 transition-transform"
            >
              <Copy size={18} />
            </button>
            <button className="p-3 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Coupons List */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 px-1">Mis Cupones</h3>
        <div className="space-y-3">
          {activeCoupons.map(coupon => (
            <div key={coupon.id} className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-[30px] border border-slate-50 dark:border-slate-800 shadow-sm flex items-center space-x-4">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Ticket size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black dark:text-white uppercase tracking-tight text-sm h-1">{coupon.discount}</h4>
                  <span className="text-[8px] font-black text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full uppercase tracking-tighter">Exp. {coupon.expiry}</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-2">{coupon.desc}</p>
                <div className="mt-2 flex items-center text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase">
                  <Clock size={10} className="mr-1" /> Mín. {coupon.min}
                </div>
              </div>
              <div className="absolute top-0 right-0 h-full w-1.5 bg-purple-500/10 group-hover:bg-purple-500/20 transition-all" />
            </div>
          ))}
        </div>
      </section>

      {/* Promotions / Gift Cards */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 px-1">Ofertas Destacadas</h3>
        <div className="grid grid-cols-2 gap-4">
          {promotions.map(promo => (
            <div 
              key={promo.id} 
              onClick={() => onSelectStore({ id: promo.id, type: promo.type })}
              className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden group cursor-pointer"
            >
              <div className="h-24 relative">
                <img src={promo.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={promo.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[10px] font-black text-white uppercase truncate">{promo.name}</p>
                </div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10">
                <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase leading-tight italic tracking-tight">
                  {promo.promo}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-purple-600 shadow-sm">
                    <ShoppingBag size={12} />
                  </div>
                  <ChevronRight size={14} className="text-purple-300 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))}
          
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-[35px] flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-2 opacity-60">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400">
              <Gift size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase leading-tight">Tarjetas Regalo Próximamente</p>
          </div>
        </div>
      </section>
    </div>
  );
};
