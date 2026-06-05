import { useFirebaseAuth } from "../hooks/useFirebaseAuth"
import { motion } from "motion/react"
import { XCircle, LogOut } from "lucide-react"

const GRAD = "linear-gradient(135deg, #7B2FF7 0%, #F107A3 50%, #FF6B00 100%)"

interface Props { reason?: string; onReapply: () => void }

export default function Rejected({ reason, onReapply }: Props) {
  const { signOut } = useFirebaseAuth()
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 text-white text-center"
      style={{ background: GRAD }}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center mb-8">
        <XCircle size={56} className="text-white" />
      </motion.div>
      <h1 className="text-3xl font-black mb-3">Solicitud rechazada</h1>
      {reason && (
        <div className="bg-white text-slate-800 rounded-2xl p-5 mb-6 max-w-xs text-sm font-medium">
          <p className="font-black text-red-600 text-xs uppercase tracking-wider mb-1">Motivo</p>
          <p>{reason}</p>
        </div>
      )}
      <p className="text-white/70 mb-8 text-sm max-w-xs">Puedes enviar una nueva solicitud con la información corregida.</p>
      <button onClick={onReapply}
        className="w-full max-w-xs bg-white font-black py-4 rounded-2xl mb-4 shadow-xl"
        style={{ color: "#F107A3" }}>
        Volver a solicitar
      </button>
      <button onClick={() => signOut()} className="flex items-center gap-2 text-white/50 hover:text-white text-sm">
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  )
}


