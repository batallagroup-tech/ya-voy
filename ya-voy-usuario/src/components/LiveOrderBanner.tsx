import { motion } from "motion/react";
import { Bike, Utensils, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import type { Pedido } from "../types";

interface Props {
  pedido: Pedido | null;
  onOpenPedido: (pedido: Pedido) => void;
}

export default function LiveOrderBanner({ pedido, onOpenPedido }: Props) {
  if (!pedido || pedido.status === "entregado" || pedido.status === "cancelado") return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "preparando":
        return {
          icon: <Utensils size={18} className="text-amber-500 animate-pulse" />,
          title: "Preparando tu pedido",
          subtitle: pedido.negocio_nombre || "Restaurante",
          progress: 50,
          color: "from-amber-500 to-orange-500",
          badge: "En cocina",
        };
      case "en_camino":
        return {
          icon: <Bike size={18} className="text-emerald-400 animate-bounce" />,
          title: "¡Repartidor en camino!",
          subtitle: "En camino a tu ubicación",
          progress: 80,
          color: "from-emerald-500 to-teal-600",
          badge: "En camino 🛵",
        };
      case "listo":
      case "pickup_listo":
        return {
          icon: <CheckCircle2 size={18} className="text-yellow-400" />,
          title: "Pedido listo",
          subtitle: "Esperando recolección / entrega",
          progress: 65,
          color: "from-yellow-500 to-amber-600",
          badge: "Listo 📦",
        };
      default: // nuevo / pendiente_pago
        return {
          icon: <Clock size={18} className="text-blue-400 animate-pulse" />,
          title: "Pedido registrado",
          subtitle: "Confirmando disponibilidad con el comercio",
          progress: 25,
          color: "from-blue-500 to-indigo-600",
          badge: "Recibido ⏱️",
        };
    }
  };

  const info = getStatusInfo(pedido.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={() => onOpenPedido(pedido)}
      className="fixed top-3 left-4 right-4 z-[999] cursor-pointer"
      style={{ marginTop: "env(safe-area-inset-top)" }}
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-3xl shadow-2xl border border-white/10 flex flex-col gap-2 relative overflow-hidden group hover:border-amber-400/40 transition-all">
        {/* Glow accent line */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${info.color}`} />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 shadow-inner">
              {info.icon}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white truncate tracking-tight">{info.title}</h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-amber-300 shrink-0">
                  {info.badge}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">{info.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform">
            <span>Ver mapa</span>
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Live Animated Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-0.5">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${info.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${info.color}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
