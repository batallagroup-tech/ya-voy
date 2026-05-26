import { motion } from 'motion/react';
import { XCircle, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';

interface Props { reason?: string; onReapply: () => void; }

export default function Rejected({ reason, onReapply }: Props) {
  const { signOut } = useClerk();
  return (
    <div className="min-h-[100dvh] bg-red-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-xl border border-red-100 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-1">Solicitud Rechazada</h1>
        <p className="text-sm text-slate-500 mb-5">Tu solicitud no fue aprobada en este momento.</p>
        {reason && (
          <div className="bg-red-50 p-4 rounded-2xl mb-6 text-left border border-red-100">
            <div className="flex items-center gap-2 text-red-600 font-bold mb-1 text-sm">
              <AlertCircle size={16} />
              <span>Motivo del rechazo:</span>
            </div>
            <p className="text-red-800 font-medium text-sm">{reason}</p>
          </div>
        )}
        <div className="flex flex-col gap-2 mb-6">
          <button onClick={onReapply}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all text-sm">
            <RefreshCw size={18} /> Corregir y Reenviar
          </button>
          <button onClick={() => { window.location.href = 'mailto:soporte@batallagroup.com'; }}
            className="w-full py-3.5 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-sm">
            <Mail size={18} /> Contactar Soporte
          </button>
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
