import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trash2, Plus, CreditCard as CardIcon, CheckCircle2, AlertCircle, Loader2, Banknote, Lock, ShieldCheck, Shield, ChevronRight, Fingerprint, Cpu } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Card } from '../types';

// Initialize Stripe with the environment variable
const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51P...dummy_key');

const StripeCardForm = ({ onAddCard, onCancel, isVerifying, setIsVerifying }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [holderName, setHolderName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !isComplete) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    if (!holderName.trim()) {
      setError('Ingresa el nombre del titular');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement as any,
        billing_details: {
          name: holderName,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'La tarjeta fue rechazada');
        setIsVerifying(false);
      } else if (paymentMethod) {
        onAddCard({
          last4: paymentMethod.card?.last4 || '****',
          brand: paymentMethod.card?.brand || 'Tarjeta',
          holder: holderName.toUpperCase(),
          expiry: `${paymentMethod.card?.exp_month}/${String(paymentMethod.card?.exp_year).slice(-2)}`,
          color: getCardColor(paymentMethod.card?.brand || ''),
          stripeId: paymentMethod.id
        });
        setIsVerifying(false);
      }
    } catch (err) {
      setError('Error de conexión con Stripe');
      setIsVerifying(false);
    }
  };

  const getCardColor = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa': return 'from-blue-600 via-blue-700 to-indigo-900';
      case 'mastercard': return 'from-rose-600 via-rose-700 to-red-900';
      case 'amex': return 'from-emerald-500 via-emerald-600 to-teal-900';
      default: return 'from-slate-700 via-slate-800 to-slate-950';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[40px] md:rounded-[60px] border-4 border-slate-100 dark:border-slate-800 shadow-3xl shadow-purple-100/50 dark:shadow-none space-y-6 md:space-y-10 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-600 to-indigo-600" />
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-black text-xl md:text-2xl italic uppercase tracking-tighter text-slate-800 dark:text-white">Nueva Blindada</h3>
          <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Cpu size={10} md:size={12} className="text-purple-600" />
            <span>Encriptación de Punto a Punto</span>
          </p>
        </div>
        <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl md:rounded-3xl flex items-center justify-center text-purple-600">
          <Fingerprint size={24} md:size={28} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        <div className="space-y-2 md:space-y-3">
          <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Detalles Digitales</label>
          <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] md:rounded-[35px] border-2 border-transparent focus-within:border-purple-600 transition-all shadow-inner">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#0f172a',
                    fontFamily: 'JetBrains Mono, monospace',
                    '::placeholder': { color: '#94a3b8' },
                    fontWeight: '700',
                  },
                  invalid: { color: '#ef4444', iconColor: '#ef4444' },
                },
              }}
              onChange={(e) => {
                setError(e.error ? e.error.message : null);
                setIsComplete(e.complete);
              }}
            />
          </div>
        </div>

        <div className="space-y-2 md:space-y-3">
          <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Nombre del Titular</label>
          <input 
            type="text" 
            placeholder="COMO APARECE EN EL PLÁSTICO" 
            className="w-full p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] md:rounded-[35px] font-black uppercase outline-none border-2 border-transparent focus:border-purple-600 transition-all shadow-inner placeholder:text-slate-200 text-sm md:text-base" 
            value={holderName} 
            onChange={e => setHolderName(e.target.value)} 
          />
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3 text-red-500 text-[10px] font-black bg-red-50 dark:bg-red-900/20 p-4 rounded-[20px]"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}

        <div className="flex gap-4 pt-4">
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={isVerifying} 
            className="flex-1 py-5 md:py-7 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[28px] md:rounded-[35px] font-black uppercase text-[8px] md:text-[10px] tracking-widest active:scale-95 transition-all"
          >
            Abortar
          </button>
          <button 
            type="submit" 
            disabled={!stripe || !isComplete || isVerifying} 
            className="flex-[2] py-5 md:py-7 bg-purple-600 text-white rounded-[28px] md:rounded-[35px] font-black uppercase text-[8px] md:text-[10px] tracking-widest shadow-xl md:shadow-2xl shadow-purple-200 dark:shadow-none active:scale-95 transition-all disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 flex items-center justify-center space-x-2 md:space-x-3"
          >
            {isVerifying ? (
              <>
                <Loader2 className="animate-spin" size={16} md:size={20} />
                <span>Blindando...</span>
              </>
            ) : (
              <span>Validar y Guardar</span>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export const PaymentManager = ({ setShowPaymentManager, userData, onAddCard, onRemoveCard }: { setShowPaymentManager: (s: boolean) => void; userData: any; onAddCard: (c: any) => void; onRemoveCard: (id: string) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  return (
    <div className="absolute inset-0 z-[150] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-700">
      <header className="p-6 md:p-12 pb-12 md:pb-20 bg-white dark:bg-slate-900 border-b-8 border-purple-600 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 p-10 opacity-5 rotate-12 pointer-events-none">
           <ShieldCheck size={400} />
        </div>
        
        <div className="flex items-center space-x-4 md:space-x-8 relative z-10">
          <button 
            onClick={() => setShowPaymentManager(false)} 
            className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800 rounded-[24px] md:rounded-[32px] text-slate-800 dark:text-white hover:bg-purple-600 hover:text-white transition-all transform active:scale-90 shadow-xl md:shadow-2xl shadow-slate-100 dark:shadow-none"
          >
            <ArrowLeft size={24} md:size={32} strokeWidth={3}/>
          </button>
          <div className="space-y-1 md:space-y-2">
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter dark:text-white leading-[0.8] flex flex-col">
              <span className="text-purple-600">Bóveda</span>
              <span>Digital</span>
            </h2>
            <div className="flex items-center space-x-2 md:space-x-3 mt-2 md:mt-4">
              <div className="flex -space-x-1.5 md:-space-x-2">
                 <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900"></div>
                 <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-red-500 border-2 border-white dark:border-slate-900"></div>
                 <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-orange-500 border-2 border-white dark:border-slate-900"></div>
              </div>
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo de seguridad activo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6 relative z-10">
          <div className="hidden lg:flex flex-col items-end space-y-1">
             <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-600">Secure Storage</span>
             <span className="text-sm font-black italic uppercase text-slate-800 dark:text-white">PCI DSS Level 1</span>
          </div>
          <div className="p-4 md:p-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-[24px] md:rounded-[30px] border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-3 md:gap-4 ml-auto md:ml-0">
             <Shield size={20} md:size={28} />
             <div className="flex flex-col text-left">
                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest leading-none">Status</span>
                <span className="text-[10px] md:text-xs font-black uppercase">Blindado</span>
             </div>
          </div>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-20 space-y-12 md:space-y-20 pb-40 no-scrollbar">
        {/* Verification Alert if not verified */}
        {!userData.verificado && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 md:p-10 bg-black dark:bg-white rounded-[40px] md:rounded-[55px] text-white dark:text-slate-900 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative overflow-hidden group border-4 border-purple-500"
          >
            <div className="p-6 md:p-8 bg-purple-600 rounded-full text-white shadow-3xl shadow-purple-500/50 group-hover:rotate-12 transition-transform duration-700">
              <Shield size={32} md:size={44} strokeWidth={3} />
            </div>
            <div className="flex-1 space-y-2 md:space-y-4 text-center md:text-left">
              <h4 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">Verificación Pendiente</h4>
              <p className="text-xs md:text-sm font-bold text-white/60 dark:text-slate-500 leading-relaxed max-w-xl">Habilita límites de compra sin restricciones y el pago en efectivo verificando tu identidad real.</p>
            </div>
            <button className="w-full md:w-auto px-10 py-5 bg-white dark:bg-slate-900 text-black dark:text-white rounded-full font-black uppercase text-[10px] md:text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl">
              Verificar ahora
            </button>
          </motion.div>
        )}
        {/* Cash Section - Big and bold */}
        <section className="space-y-6 md:space-y-10">
          <div className="flex items-center space-x-6">
             <h3 className="text-[10px] md:text-[13px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Efectivo</h3>
             <div className="flex-1 h-[2px] bg-slate-100 dark:bg-slate-900"></div>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className={`group relative p-8 md:p-16 rounded-[40px] md:rounded-[70px] border-4 transition-all duration-700 ${
              userData.verificado 
                ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-xl md:shadow-3xl shadow-emerald-100 dark:shadow-none' 
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-50 grayscale'
            }`}
          >
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className={`p-6 md:p-10 rounded-[24px] md:rounded-[45px] shadow-2xl transition-all duration-700 ${userData.verificado ? 'bg-emerald-500 text-white rotate-3 group-hover:rotate-0' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                <Banknote size={32} md:size={60} strokeWidth={3} />
              </div>
              <div className="flex-1 space-y-1 md:space-y-3 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4">
                   <h4 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Efectivo</h4>
                   {userData.verificado && (
                     <div className="p-1.5 md:p-2 bg-emerald-100 text-emerald-600 rounded-full">
                        <CheckCircle2 size={16} md:size={24} />
                     </div>
                   )}
                </div>
                <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest max-w-md">
                   {userData.verificado ? 'Pagos físicos contra entrega habilitados globalmente.' : 'Verifica tu cuenta para habilitar el pago físico.'}
                </p>
              </div>
              {!userData.verificado && (
                <div className="absolute right-6 md:right-12 top-6 md:top-1/2 md:-translate-y-1/2 p-3 md:p-6 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-400">
                  <Lock size={16} md:size={32} />
                </div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Cards - The jewel of the vault */}
        <section className="space-y-8 md:space-y-12">
          <div className="flex items-center justify-between">
             <div className="flex items-center space-x-6 flex-1">
                <h3 className="text-[10px] md:text-[13px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Tarjetas</h3>
                <div className="flex-1 h-[2px] bg-slate-100 dark:bg-slate-900"></div>
             </div>
             <div className="ml-4 md:ml-6 px-3 md:px-4 py-1 md:py-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl md:rounded-2xl flex items-center gap-2 md:gap-3">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-purple-600 rounded-full animate-ping"></div>
                <span className="text-[8px] md:text-[10px] font-black text-purple-600 uppercase">Live Processing</span>
             </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
            {(userData.tarjetas || []).map((card: Card, idx: number) => (
              <motion.div 
                key={card.id} 
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative h-[280px] md:h-[340px] w-full bg-gradient-to-br ${card.color} rounded-[40px] md:rounded-[70px] p-8 md:p-16 text-white shadow-xl md:shadow-3xl shadow-slate-300 dark:shadow-none overflow-hidden group flex flex-col justify-between transform-gpu hover:-translate-y-2 transition-all duration-700`}
              >
                {/* Gloss effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full" />
                
                {/* Decorative chip icon */}
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 scale-150 group-hover:scale-125 transition-transform duration-1000">
                  <ShieldCheck size={300} />
                </div>

                <div className="flex justify-between items-start relative z-10">
                   <div className="space-y-4 md:space-y-6">
                      <div className="w-16 h-10 md:w-20 md:h-14 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-200 rounded-xl md:rounded-2xl shadow-xl border border-white/20 relative overflow-hidden">
                         <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 opacity-30">
                            {[...Array(12)].map((_, i) => <div key={i} className="border-[0.5px] border-black/40"></div>)}
                         </div>
                      </div>
                      <div className="px-4 md:px-6 py-1.5 md:py-2 bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] w-fit italic">
                         {card.brand} Secured
                      </div>
                   </div>
                   <button 
                    onClick={() => onRemoveCard(card.id)} 
                    className="p-4 md:p-6 bg-white/10 hover:bg-red-500 text-white rounded-2xl md:rounded-3xl active:scale-90 transition-all backdrop-blur-2xl border border-white/10 group/trash"
                   >
                    <Trash2 size={18} md:size={24} className="group-hover/trash:animate-pulse" />
                   </button>
                </div>

                <div className="space-y-6 md:space-y-10 relative z-10">
                   <p className="text-2xl md:text-5xl font-black tracking-[0.3em] font-mono leading-none drop-shadow-2xl">
                     •••• {card.last4}
                   </p>
                   <div className="flex justify-between items-end border-t border-white/20 pt-6 md:pt-10">
                      <div className="space-y-1">
                        <span className="text-[7px] md:text-[10px] font-black uppercase text-white/50 tracking-widest leading-none">Titular</span>
                        <p className="text-sm md:text-2xl font-black uppercase truncate max-w-[150px] md:max-w-[200px]">{card.holder}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[7px] md:text-[10px] font-black uppercase text-white/50 tracking-widest leading-none">Expira</span>
                        <p className="text-sm md:text-2xl font-black">{card.expiry}</p>
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}

            <AnimatePresence mode="wait">
              {isAdding ? (
                <Elements stripe={stripePromise}>
                  <div className="col-span-full">
                    <StripeCardForm 
                      onAddCard={(card: any) => {
                        onAddCard(card);
                        setIsAdding(false);
                      }}
                      onCancel={() => setIsAdding(false)}
                      isVerifying={isVerifying}
                      setIsVerifying={setIsVerifying}
                    />
                  </div>
                </Elements>
              ) : (
                <motion.button 
                  layoutId="add-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setIsAdding(true)} 
                  className="w-full h-[280px] md:h-[340px] bg-white dark:bg-slate-900 rounded-[40px] md:rounded-[70px] border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-4 md:space-y-8 text-slate-300 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-500 group shadow-lg md:shadow-2xl shadow-slate-100 dark:shadow-none"
                >
                  <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-800 rounded-[24px] md:rounded-[40px] text-slate-800 dark:text-white group-hover:bg-purple-600 group-hover:text-white group-hover:rotate-180 transition-all duration-700 shadow-inner">
                    <Plus size={32} md:size={60} strokeWidth={3}/>
                  </div>
                  <div className="text-center space-y-2 px-6">
                    <span className="block text-lg md:text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white">Blindar Nueva Tarjeta</span>
                    <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mx-auto max-w-[200px] leading-relaxed">Protegemos tu identidad con encriptación militar</p>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Security Footer */}
        <footer className="pt-10 md:pt-20 border-t border-slate-100 dark:border-slate-900 flex flex-col items-center space-y-8 md:space-y-12">
           <div className="grid grid-cols-3 gap-6 md:gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex flex-col items-center gap-2 md:gap-3">
                 <ShieldCheck size={24} md:size={40} />
                 <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest">AES-256</span>
              </div>
              <div className="flex flex-col items-center gap-2 md:space-y-3">
                 <Lock size={24} md:size={40} />
                 <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest">TOKENIZED</span>
              </div>
              <div className="flex flex-col items-center gap-2 md:gap-3">
                 <Cpu size={24} md:size={40} />
                 <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest">PCI-DSS</span>
              </div>
           </div>
           <div className="text-center space-y-2 md:space-y-4 max-w-xl px-6">
             <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-loose">
               Flash Delivery no almacena los datos reales de su tarjeta. Toda la información es procesada y tokenizada mediante Stripe para garantizar la máxima seguridad en cada transacción.
             </p>
             <div className="flex items-center justify-center gap-4 md:gap-6">
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-purple-600 rounded-full animate-ping"></span>
                <span className="text-[7px] md:text-[9px] font-black uppercase text-purple-600 tracking-tighter">Bóveda Activa y Segura</span>
             </div>
           </div>
        </footer>
      </div>
    </div>
  );
};
