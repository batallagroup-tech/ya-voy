import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Copy, Check, X, ArrowLeft, Loader2, Sparkles, Send, Users, Wallet } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, increment, runTransaction } from 'firebase/firestore';
import { toast } from 'sonner';

interface ReferralManagerProps {
  onClose: () => void;
  profile: any;
}

export const ReferralManager: React.FC<ReferralManagerProps> = ({ onClose, profile }) => {
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const REWARD_REFERRER = 50;
  const REWARD_FRIEND = 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(profile?.referralCode || '');
    setCopied(true);
    toast.success('¡Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCode.trim()) return;

    if (profile?.hasUsedReferral) {
      toast.error('Ya has utilizado un código de invitación.');
      return;
    }

    if (referralCode.toUpperCase() === profile?.referralCode) {
      toast.error('No puedes usar tu propio código.');
      return;
    }

    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.trim().toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Código inválido. Verifica que sea correcto.');
        setIsSubmitting(false);
        return;
      }

      const referrerDoc = querySnapshot.docs[0];
      const referrerId = referrerDoc.id;

      // Use a transaction for atomic reward distribution
      await runTransaction(db, async (transaction) => {
        const currentUserRef = doc(db, 'users', profile.uid);
        const referrerRef = doc(db, 'users', referrerId);

        // Update current user (referee/friend)
        transaction.update(currentUserRef, {
          hasUsedReferral: true,
          referredBy: referralCode.trim().toUpperCase(),
          referralRewards: increment(REWARD_FRIEND),
          balance: increment(REWARD_FRIEND)
        });

        // Update referrer
        transaction.update(referrerRef, {
          referralCount: increment(1),
          referralRewards: increment(REWARD_REFERRER),
          balance: increment(REWARD_REFERRER)
        });
      });

      toast.success(`¡Felicidades! Has recibido ${REWARD_FRIEND} monedas.`);
      setReferralCode('');
      onClose();
    } catch (err) {
      console.error('Referral error:', err);
      toast.error('Error al procesar el código. Revisa tu conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right overflow-hidden transition-colors duration-300">
      <header className="p-8 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 flex items-center space-x-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-purple-600/5 rotate-12 pointer-events-none">
          <Gift size={200} />
        </div>
        <button 
          onClick={onClose} 
          className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-purple-600 transition-colors relative z-10 active:scale-95"
        >
          <ArrowLeft size={20}/>
        </button>
        <div className="relative z-10">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Invita y Gana</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Comparte y recibe beneficios</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full max-w-lg mx-auto p-8 space-y-8 no-scrollbar">
        {/* Reward Card */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-purple-200 dark:shadow-none">
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <Sparkles size={160} />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Wallet size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full">Mis Recompensas</span>
            </div>
            
            <div>
              <p className="text-4xl font-black italic tracking-tighter">${(profile?.referralRewards || 0).toFixed(2)}</p>
              <p className="text-[10px] font-bold text-white/60 uppercase mt-1">Créditos acumulados por invitaciones</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-white/10 rounded-3xl p-4 backdrop-blur-sm">
                <Users size={16} className="mb-2 opacity-60" />
                <p className="text-xl font-black italic">{profile?.referralCount || 0}</p>
                <p className="text-[8px] font-bold uppercase opacity-60">Invitados</p>
              </div>
              <div className="bg-white/10 rounded-3xl p-4 backdrop-blur-sm">
                <Sparkles size={16} className="mb-2 opacity-60" />
                <p className="text-xl font-black italic">+{REWARD_REFERRER}</p>
                <p className="text-[8px] font-bold uppercase opacity-60">Por amigo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tu Código Personal</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[35px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-6">
            <div className="text-5xl font-black italic uppercase tracking-tighter text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-8 py-6 rounded-[30px] border-2 border-dashed border-purple-200 dark:border-purple-800">
              {profile?.referralCode}
            </div>
            <p className="text-xs text-slate-500 font-bold text-center px-4">
              Comparte este código con tus amigos. Cuando lo usen, ellos recibirán <span className="text-purple-600 font-black">${REWARD_FRIEND}</span> y tú recibirás <span className="text-purple-600 font-black">${REWARD_REFERRER}</span> de crédito!
            </p>
            <button 
              onClick={handleCopy}
              className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
            </button>
          </div>
        </section>

        {/* Apply Section */}
        {!profile?.hasUsedReferral && (
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">¿Tienes un código?</h3>
            <form onSubmit={handleApplyCode} className="space-y-4">
              <div className="relative">
                <Gift className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Introduce el código aquí"
                  className="w-full p-6 pl-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all uppercase"
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting || !referralCode.trim()}
                className="w-full py-6 bg-purple-600 text-white rounded-[30px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-purple-100 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Send size={18} />
                    <span>Canjear Beneficio</span>
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {profile?.hasUsedReferral && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 flex items-center gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl">
              <Check size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-tight">Código Aplicado</p>
              <p className="text-[10px] font-bold text-slate-400">Ya has disfrutado de tu bono de bienvenida.</p>
            </div>
          </div>
        )}

        <div className="pt-8 pb-12 flex flex-col items-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ya Voy! Referral System v1.0</p>
        </div>
      </main>
    </div>
  );
};
