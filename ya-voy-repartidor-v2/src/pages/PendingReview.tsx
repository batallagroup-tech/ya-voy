import { useClerk } from "@clerk/clerk-react"
import { motion } from "motion/react"
import { Clock, LogOut } from "lucide-react"

const GRAD = "linear-gradient(135deg, #7B2FF7 0%, #F107A3 50%, #FF6B00 100%)"

export default function PendingReview() {
  const { signOut } = useClerk()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-white text-center"
      style={{ background: GRAD }}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center mb-8">
        <Clock size={56} className="text-white" />
      </motion.div>
      <h1 className="text-3xl font-black mb-3">¡Solicitud enviada!</h1>
      <p className="text-white/80 mb-8 max-w-xs text-sm leading-relaxed">
        Tu solicitud está en revisión. Te notificaremos en 24–48 horas cuando tu cuenta esté activa.
      </p>
      <div className="bg-white/10 rounded-2xl p-5 max-w-xs text-sm text-white/70 mb-10">
        Asegúrate de que tus documentos e información sean correctos para agilizar el proceso.
      </div>
      <button onClick={() => signOut()} className="flex items-center gap-2 text-white/50 hover:text-white text-sm">
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  )
}

