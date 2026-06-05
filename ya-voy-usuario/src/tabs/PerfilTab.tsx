import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { motion } from "motion/react";
import { MapPin, Banknote, CreditCard, Bell, HelpCircle, FileText, ChevronRight, LogOut, Trash2, User, Camera, Loader2, Wallet, Star, Share2 } from "lucide-react";
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
  const { getToken } = useFirebaseAuth();
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [notificaciones, setNotificaciones] = useState(() => localStorage.getItem("ya_voy_notif") !== "0");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ya_voy_dark") === "1");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [puntos, setPuntos] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [codigoReferido, setCodigoReferido] = useState("");
  const [aplicandoRef, setAplicandoRef] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getToken().then(token => {
      if (!token) return;
      const h = { Authorization: "Bearer " + token };
      fetch(API + "/api/usuario/wallet/" + userId, { headers: h }).then(r => r.json()).then(d => setWalletBalance(Number(d.balance || 0))).catch(() => {});
      fetch(API + "/api/usuario/puntos/" + userId, { headers: h }).then(r => r.json()).then(d => setPuntos(Number(d.puntos || 0))).catch(() => {});
      fetch(API + "/api/usuario/referral/" + userId, { headers: h }).then(r => r.json()).then(d => setReferralCode(d.code || null)).catch(() => {});
    });
  }, [userId]);

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

  const aplicarReferido = async () => {
    if (!codigoReferido.trim()) return;
    setAplicandoRef(true);
    try {
      const token = await getToken();
      const r = await fetch(API + "/api/usuario/referral/usar", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (token || "") },
        body: JSON.stringify({ codigo: codigoReferido.trim().toUpperCase() }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error || "Código inválido"); return; }
      setWalletBalance(b => b + (d.bonus || 0));
      toast.success(`¡Bienvenido! +$${d.bonus} de saldo`);
      setShowReferral(false);
    } catch { toast.error("Error al aplicar código"); }
    finally { setAplicandoRef(false); }
  };

  const compartirReferido = async () => {
    if (!referralCode) return;
    const texto = `¡Usa mi código ${referralCode} en Ya Voy y obtén $15 de saldo en tu primer pedido! 🛵`;
    if (navigator.share) {
      await navigator.share({ text: texto }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado al portapapeles");
    }
  };

  return (
    <motion.div key="perfil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">

      {/* Avatar y nombre */}
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

      {/* Wallet + Puntos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center mb-1"><Wallet size={18} className="text-indigo-600" /></div>
          <p className="font-black text-slate-900 text-xl">${walletBalance.toFixed(2)}</p>
          <p className="text-xs text-slate-500 font-bold">Saldo disponible</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center mb-1"><Star size={18} className="text-amber-500" /></div>
          <p className="font-black text-slate-900 text-xl">{puntos}</p>
          <p className="text-xs text-slate-500 font-bold">Puntos acumulados</p>
          {puntos >= 100 && <p className="text-[10px] text-green-600 font-black">¡Canjeable por ${Math.floor(puntos / 100) * 10}!</p>}
        </div>
      </div>

      {/* Referidos */}
      {referralCode && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-black text-slate-900 text-sm">Tu código de referido</p>
            <button onClick={compartirReferido} className="flex items-center gap-1 text-xs font-bold text-purple-600">
              <Share2 size={14} /> Compartir
            </button>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl py-3 px-4 text-center mb-3">
            <p className="font-black text-purple-700 text-2xl tracking-widest">{referralCode}</p>
          </div>
          <p className="text-xs text-slate-500 text-center">Comparte y gana <span className="font-black text-green-600">$30</span> cuando tu referido haga su primer pedido</p>
          {!showReferral ? (
            <button onClick={() => setShowReferral(true)} className="w-full mt-3 py-2 text-xs font-bold text-purple-600 border border-purple-200 rounded-xl">
              Tengo un código de referido
            </button>
          ) : (
            <div className="flex gap-2 mt-3">
              <input value={codigoReferido} onChange={e => setCodigoReferido(e.target.value.toUpperCase())}
                placeholder="YV-XXXXX" className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none font-bold tracking-wider" />
              <button onClick={aplicarReferido} disabled={aplicandoRef} className="px-4 py-2 rounded-xl text-sm font-black text-white disabled:opacity-50" style={{ background: GRAD }}>
                {aplicandoRef ? "..." : "Aplicar"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Configuración */}
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
          <button onClick={() => { const nuevo = metodoPago === "efectivo" ? "tarjeta" : "efectivo"; onMetodoPagoChange(nuevo); localStorage.setItem("ya_voy_pago", nuevo); }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600">
            Cambiar
          </button>
        </div>

        <button onClick={onShowTarjetas}
          className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><CreditCard size={18} className="text-purple-600" /></div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-sm">Mis tarjetas</p>
            <p className="text-xs text-slate-500">
              {tarjetas.length > 0 ? tarjetas.length + " tarjeta" + (tarjetas.length !== 1 ? "s" : "") : "Sin tarjetas guardadas"}
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
          <button onClick={() => { const next = !notificaciones; setNotificaciones(next); localStorage.setItem("ya_voy_notif", next ? "1" : "0"); }}
            className={`w-12 h-6 rounded-full transition-all relative ${notificaciones ? "" : "bg-slate-200"}`}
            style={notificaciones ? { background: GRAD } : {}}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${notificaciones ? "right-0.5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><span className="text-lg">🌙</span></div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">Modo oscuro</p>
            <p className="text-xs text-slate-500">Cambia la apariencia de la app</p>
          </div>
          <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("ya_voy_dark", next ? "1" : "0"); document.documentElement.classList.toggle("dark", next); }}
            className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? "" : "bg-slate-200"}`}
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

      <button onClick={() => setShowLogoutConfirm(true)}
        className="w-full py-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-bold hover:bg-slate-50 transition-all">
        <LogOut size={18} /> Cerrar sesión
      </button>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-black text-slate-900 text-lg mb-1">¿Cerrar sesión?</h3>
            <p className="text-slate-500 text-sm mb-6">Tendrás que iniciar sesión nuevamente.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl">Cancelar</button>
              <button onClick={onSignOut} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl">Cerrar sesión</button>
            </div>
          </div>
        </div>
      )}

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
