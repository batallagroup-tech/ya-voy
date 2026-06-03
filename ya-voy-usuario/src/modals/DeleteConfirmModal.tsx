import { motion } from "motion/react";
import { Trash2 } from "lucide-react";

interface Props {
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmModal({ onConfirm, onClose }: Props) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={28} className="text-red-500" />
        </div>
        <h3 className="text-lg font-black text-slate-900 mb-2">¿Eliminar cuenta?</h3>
        <p className="text-sm text-slate-500 mb-6">Se eliminarán todos tus datos, pedidos y direcciones. Esta acción es permanente.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl">Eliminar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
