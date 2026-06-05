import { useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { getSolicitud } from '../lib/api';

export default function PendingReview() {
  const { signOut, userId } = useFirebaseAuth();

  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      try {
        const s: any = await getSolicitud(userId);
        if (s && s.status !== 'pendiente') window.location.reload();
      } catch {}
    };
    const interval = setInterval(check, 20000);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={52} className="text-green-500" />
        </motion.div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">¡Solicitud Enviada!</h1>
        <p className="text-slate-500 text-sm font-medium mb-6">
          Recibimos tu información. Nuestro equipo la revisará y te notificaremos el resultado.
        </p>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6 text-left space-y-2">
          <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-3">Próximos pasos</p>
          {['Validación de documentos (INE)', 'Verificación de identidad facial', 'Activación de tu perfil'].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-green-700">{i + 1}</span>
              </div>
              <p className="text-sm text-slate-600 font-medium">{item}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-medium mb-6">
          <Loader2 size={14} className="animate-spin" />
          Actualizando estado automáticamente...
        </div>
        <button onClick={() => signOut()} className="text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors">
          Cerrar sesión
        </button>
        <div className="mt-6">
          <p className="text-slate-300 text-[8px] font-black uppercase tracking-[0.2em]">
            Desarrollado por <span className="text-slate-400">Batalla Group</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
