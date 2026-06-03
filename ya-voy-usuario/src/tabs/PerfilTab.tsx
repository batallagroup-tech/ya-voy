import { useState } from "react";
import { motion } from "motion/react";
import { MapPin, Banknote, CreditCard, Bell, HelpCircle, FileText, ChevronRight, LogOut, Trash2, User, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GRAD, API } from "../lib/constants";
import type { Direccion } from "../components/DireccionesScreen";

interface Props {
  userId: string;
  user: any;
  fotoPerfil: string;
  direcciones: Direccion[];
  tarjetas: any[];
  metodoPago: string;
  onMetodoPagoChange: (pago: string) => void;
  onFotoChange: (url: string) => void;
  onShowDirecciones: () => void;
  onShowTarjetas: () => void;
  onShowSoporte: () => void;
  onShowDeleteConfirm: () => void;
  onSignOut: () => void;
}

export default function PerfilTab({ userId, user, fotoPerfil, direcciones, tarjetas, metodoPago, onMetodoPagoChange, onFotoChange, onShowDirecciones, onShowTarjetas, onShowSoporte, onShowDeleteConfirm, onSignOut }: Props) {
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [notificaciones, setNotificaciones] = useState(() => localStorage.getItem("ya_voy_notif") !== "0");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ya_voy_dark") === "1");

  const subirFoto = async (file: File) => {
    setSubiendoFoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.secure_url) {
        onFotoChange(d.secure_url);
        await fetch(API + "/api/usuario/perfil/" + userId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto_perfil: d.secure_url }) });
        toast.success("Foto actualizada");
      }
    } catch { toast.error("Error al subir foto"); }
    finally { setSubiendoFoto(false); }
  };

  return (
    <motion.div key="perfil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center text-center">
        <div className="relative w-20 h-20 mb-3">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-purple-200">
            {fotoPerfil
              ? <img src={fotoPerfil} className="w-full h-full object-cover" />
              : user?.imageUrl
                ? <img src={user.imageUrl} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-purple-100 flex items-center justify-center"><User size={36} className="text-purple-600" /></div>}
          </div>
          <label className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
            {subiendoFoto ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f); }} />
          </label>
        </div>
        <p className="font-black text-slate-900 text-xl">{user?.fullName || "Usuario"}</p>
        <p className="text-sm text-slate-500 mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <button onClick={onShowDirecciones}
          className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><MapPin size={18} className="text-purple-600" /></div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-sm">Mis direcciones</p>
            <p className="text-xs text-slate-500">{direcciones.length} guardada{direcciones.length !== 1 ? "s" : ""}</p>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
            {metodoPago === "efectivo" ? <Banknote size={18} className="text-purple-600" /> : <CreditCard size={18} className="text-purple-600" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">Método de pago</p>
            <p className="text-xs text-slate-500">{metodoPago === "efectivo" ? "Efectivo" : "Tarjeta"}</p>
          </div>
          <button onClick={() => {
            const nuevo = metodoPago === "efectivo" ? "tarjeta" : "efectivo";
            onMetodoPagoChange(nuevo);
            localStorage.setItem("ya_voy_pago", nuevo);
          }} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600">
            Cambiar
          </button>
        </div>

        <button onClick={onShowTarjetas}
          className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><CreditCard size={18} className="text-purple-600" /></div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-sm">Mis tarjetas</p>
            <p className="text-xs text-slate-500">
              {tarjetas.length > 0
                ? tarjetas.length + " tarjeta" + (tarjetas.length !== 1 ? "s" : "") + " guardada" + (tarjetas.length !== 1 ? "s" : "")
                : "Sin tarjetas guardadas"}
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><Bell size={18} className="text-purple-600" /></div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">Notificaciones</p>
            <p className="text-xs text-slate-500">Recibe alertas de tus pedidos</p>
          </div>
          <button onClick={() => {
            const next = !notificaciones;
            setNotificaciones(next);
            localStorage.setItem("ya_voy_notif", next ? "1" : "0");
          }} className={`w-12 h-6 rounded-full transition-all relative ${notificaciones ? "" : "bg-slate-200"}`}
            style={notificaciones ? { background: GRAD } : {}}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${notificaciones ? "right-0.5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="px-4 py-4 flex items-center gap-3 border-t border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><span className="text-lg">🌙</span></div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">Modo oscuro</p>
            <p className="text-xs text-slate-500">Cambia la apariencia de la app</p>
          </div>
          <button onClick={() => {
            const next = !darkMode;
            setDarkMode(next);
            localStorage.setItem("ya_voy_dark", next ? "1" : "0");
            document.documentElement.classList.toggle("dark", next);
          }} className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? "" : "bg-slate-200"}`}
            style={darkMode ? { background: GRAD } : {}}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${darkMode ? "right-0.5" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <button onClick={onShowSoporte} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"><HelpCircle size={18} className="text-slate-500" /></div>
          <p className="font-bold text-slate-900 text-sm">Ayuda y soporte</p>
          <ChevronRight size={18} className="text-slate-300 ml-auto" />
        </button>
        <button onClick={() => window.open("https://batallagroup-tech.github.io/ya-voy/", "_blank")} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"><FileText size={18} className="text-slate-500" /></div>
          <p className="font-bold text-slate-900 text-sm">Términos y condiciones</p>
          <ChevronRight size={18} className="text-slate-300 ml-auto" />
        </button>
      </div>

      <button onClick={onSignOut}
        className="w-full py-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-bold hover:bg-slate-50 transition-all">
        <LogOut size={18} /> Cerrar sesión
      </button>

      <button onClick={onShowDeleteConfirm}
        className="w-full py-4 bg-red-50 rounded-2xl flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-100 transition-all">
        <Trash2 size={18} /> Eliminar cuenta
      </button>

      <p className="text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
        Desarrollado por <span className="text-slate-400">Batalla Group</span>
      </p>
    </motion.div>
  );
}
