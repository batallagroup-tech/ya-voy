import { motion } from 'motion/react';
import { Clock, CheckCircle2, Utensils } from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';

export default function PendingReview() {
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9333ea] via-[#ef4444] to-[#f97316] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
          className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5"
        >
          <Clock size={40} className="text-[#FF6B00]" />
        </motion.div>

        <h1 className="text-2xl font-black text-slate-900 mb-3">En Revisión</h1>

        <div className="space-y-3 text-slate-600 mb-6">
          <p className="font-medium text-sm">
            Tu solicitud fue recibida correctamente.
          </p>
          <div className="flex items-center justify-center gap-2 text-[#FF6B00] font-bold text-sm">
            <Clock size={18} />
            <span>Plazo: Máx. 3 días</span>
          </div>
          <p className="text-xs">
            Recibirás una notificación cuando tu cuenta sea activada.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl mb-8 flex items-center gap-3 text-left">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Utensils size={20} className="text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estado</p>
            <p className="text-slate-900 font-bold">Pendiente de aprobación</p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
        >
          Cerrar Sesión
        </button>

        <div className="mt-8">
          <p className="text-slate-300 text-[8px] font-black uppercase tracking-[0.2em]">
            Desarrollado por <span className="text-slate-400">Batalla Group</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}