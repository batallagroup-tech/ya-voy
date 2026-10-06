import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { motion } from "motion/react";
import { MapPin, Banknote, CreditCard, Bell, HelpCircle, FileText, ChevronRight, LogOut, Trash2, User, Camera, Loader2, Wallet, Star, Share2, Sparkles, ShieldCheck } from "lucide-react";
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

export default function PerfilTab({ 
  userId, 
  user, 
  fotoPerfil, 
  direcciones, 
  tarjetas, 
  metodoPago, 
  onMetodoPagoChange, 
  onFotoChange, 
  onShowDirecciones, 
  onShowTarjetas, 
  onShowSoporte, 
  onShowDeleteConfirm, 
  onSignOut 
}: Props) {
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
      fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ya_voy_preset");
      const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dpihs4gtg"}/image/upload`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.secure_url) {
        onFotoChange(d.secure_url);
        const token = await getToken();
        await fetch(API + "/api/usuario/perfil/" + userId, { 
          method: "PATCH", 
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, 
          body: JSON.stringify({ foto_perfil: d.secure_url }) 
        });
        toast.success("Foto de perfil actualizada");
      }
    } catch { 
      toast.error("Error al subir la imagen"); 
    } finally { 
      setSubiendoFoto(false); 
    }
  };

  const aplicarReferido = async () => {
    if (!codigoReferido.trim()) return;
    setAplicandoRef(true);
    try {
      const token = await getToken();
      const r = await fetch(API + "/api/usuario/referral/usar", {
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (token || "") },
        body: JSON.stringify({ codigo: codigoReferido.trim().toUpperCase() }),
      });
      const d = await r.json();
      if (!r.ok) { 
        toast.error(d.error || "Código de referido inválido"); 
        return; 
      }
      setWalletBalance(b => b + (d.bonus || 0));
      toast.success(`¡Bienvenido! Se acreditaron +$${d.bonus} a tu monedero`);
      setShowReferral(false);
      setCodigoReferido("");
    } catch { 
      toast.error("Error al aplicar el código"); 
    } finally { 
      setAplicandoRef(false); 
    }
  };

  const compartirReferido = async () => {
    if (!referralCode) return;
    const texto = `¡Usa mi código de descuento ${referralCode} en Ya Voy y recibe saldo gratis para tu comida! 🍔🛵`;
    if (navigator.share) {
      await navigator.share({ title: "Únete a Ya Voy", text: texto }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(texto);
      toast.success("Código copiado al portapapeles");
    }
  };

  return (
    <motion.div 
      key="perfil" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="p-4 space-y-4">

      {/* Profile Card Header */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10" />
        
        <div className="relative w-20 h-20 mb-3 mt-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-purple-100">
            {fotoPerfil ? (
              <img src={fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
            ) : user?.imageUrl ? (
              <img src={user.imageUrl} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={36} className="text-purple-600" />
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center cursor-pointer shadow-md text-white active:scale-90 transition-transform">
            {subiendoFoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f); }} />
          </label>
        </div>

        <p className="font-black text-slate-900 text-lg">{user?.fullName || "Cliente Ya Voy"}</p>
        <p className="text-xs text-slate-400 mt-0.5">{user?.primaryEmailAddress?.emailAddress || "Usuario verificado"}</p>
      </div>

      {/* Wallet + Loyalty Points */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-2">
            <Wallet size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-black text-slate-900 text-xl tracking-tight">${walletBalance.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Saldo en Monedero</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between">
          <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mb-2">
            <Star size={18} className="text-amber-500 fill-amber-500" />
          </div>
          <div>
            <p className="font-black text-slate-900 text-xl tracking-tight">{puntos}</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Puntos de Lealtad</p>
          </div>
        </div>
      </div>

      {/* Referral Program */}
      {referralCode && (
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-purple-600" />
              <p className="font-black text-slate-900 text-xs uppercase tracking-wider">Gana Dinero con Referidos</p>
            </div>
            <button 
              onClick={compartirReferido} 
              className="flex items-center gap-1 text-xs font-black text-purple-600 hover:text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
              <Share2 size={13} /> Compartir
            </button>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl py-3 px-4 text-center">
            <p className="font-black text-purple-700 text-2xl tracking-widest">{referralCode}</p>
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Comparte tu código con amigos y ambos reciben <span className="font-black text-green-600">$30 MXN</span> en su primer pedido.
          </p>

          {!showReferral ? (
            <button 
              onClick={() => setShowReferral(true)} 
              className="w-full py-2.5 text-xs font-bold text-purple-600 border border-purple-200 rounded-2xl hover:bg-purple-50 transition-colors">
              ¿Tienes un código de referido?
            </button>
          ) : (
            <div className="flex gap-2 pt-1">
              <input 
                value={codigoReferido} 
                onChange={e => setCodigoReferido(e.target.value.toUpperCase())}
                placeholder="YV-XXXXX" 
                className="flex-1 px-3 py-2.5 bg-slate-50 rounded-2xl text-xs border border-slate-200 outline-none font-bold tracking-wider uppercase focus:border-purple-400" 
              />
              <button 
                onClick={aplicarReferido} 
                disabled={aplicandoRef || !codigoReferido} 
                className="px-4 py-2.5 rounded-2xl text-xs font-black text-white disabled:opacity-50 shadow-sm" 
                style={{ background: GRAD }}>
                {aplicandoRef ? "..." : "Canjear"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings & Options List */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <button 
          onClick={onShowDirecciones}
          className="w-full px-4 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
            <MapPin size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-xs">Mis Direcciones de Entrega</p>
            <p className="text-[11px] text-slate-400">{direcciones.length} guardada{direcciones.length !== 1 ? "s" : ""}</p>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <div className="px-4 py-4 flex items-center gap-3.5 border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
            {metodoPago === "efectivo" ? <Banknote size={18} /> : <CreditCard size={18} />}
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-xs">Método de Pago Predeterminado</p>
            <p className="text-[11px] text-slate-400 capitalize">{metodoPago === "efectivo" ? "Efectivo" : "Tarjeta bancaria"}</p>
          </div>
          <button 
            onClick={() => { 
              const nuevo = metodoPago === "efectivo" ? "tarjeta" : "efectivo"; 
              onMetodoPagoChange(nuevo); 
              localStorage.setItem("ya_voy_pago", nuevo); 
            }}
            className="text-xs font-black px-3 py-1.5 rounded-xl border border-slate-200 text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors">
            Cambiar
          </button>
        </div>

        <button 
          onClick={onShowTarjetas}
          className="w-full px-4 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
            <CreditCard size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-xs">Mis Tarjetas Guardadas</p>
            <p className="text-[11px] text-slate-400">
              {tarjetas.length > 0 ? `${tarjetas.length} tarjeta${tarjetas.length !== 1 ? "s" : ""}` : "Gestionar tarjetas seguras"}
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <div className="px-4 py-4 flex items-center gap-3.5 border-b border-slate-50">
          <div className="w-9 h-9 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
            <Bell size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-xs">Notificaciones en Vivo</p>
            <p className="text-[11px] text-slate-400">Avisos de estatus y ofertas</p>
          </div>
          <button 
            onClick={() => { 
              const next = !notificaciones; 
              setNotificaciones(next); 
              localStorage.setItem("ya_voy_notif", next ? "1" : "0"); 
            }}
            className={`w-12 h-6 rounded-full transition-all relative ${notificaciones ? "" : "bg-slate-200"}`}
            style={notificaciones ? { background: GRAD } : {}}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${notificaciones ? "right-0.5" : "left-0.5"}`} />
          </button>
        </div>

        <div className="px-4 py-4 flex items-center gap-3.5">
          <div className="w-9 h-9 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shrink-0">
            <span className="text-base">🌙</span>
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-xs">Modo Oscuro</p>
            <p className="text-[11px] text-slate-400">Apariencia visual de la app</p>
          </div>
          <button 
            onClick={() => { 
              const next = !darkMode; 
              setDarkMode(next); 
              localStorage.setItem("ya_voy_dark", next ? "1" : "0"); 
              document.documentElement.classList.toggle("dark", next); 
            }}
            className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? "" : "bg-slate-200"}`}
            style={darkMode ? { background: GRAD } : {}}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${darkMode ? "right-0.5" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Support and Legal */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <button 
          onClick={onShowSoporte} 
          className="w-full px-4 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50">
          <div className="w-9 h-9 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 shrink-0">
            <HelpCircle size={18} />
          </div>
          <p className="font-bold text-slate-900 text-xs flex-1 text-left">Ayuda y Soporte Técnico</p>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <button 
          onClick={() => window.open("https://batallagroup-tech.github.io/ya-voy/", "_blank")} 
          className="w-full px-4 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 shrink-0">
            <FileText size={18} />
          </div>
          <p className="font-bold text-slate-900 text-xs flex-1 text-left">Términos y Privacidad</p>
          <ChevronRight size={18} className="text-slate-300" />
        </button>
      </div>

      {/* Session Actions */}
      <div className="space-y-2 pt-2">
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-center gap-2 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
          <LogOut size={16} /> Cerrar Sesión
        </button>

        <button 
          onClick={onShowDeleteConfirm}
          className="w-full py-3.5 bg-red-50/60 rounded-2xl flex items-center justify-center gap-2 text-red-500 font-bold text-xs hover:bg-red-100 active:scale-95 transition-all">
          <Trash2 size={16} /> Eliminar Cuenta
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-2 text-purple-600">
                <LogOut size={24} />
              </div>
              <h3 className="font-black text-slate-900 text-lg">¿Cerrar sesión?</h3>
              <p className="text-slate-500 text-xs mt-1">Tendrás que volver a ingresar tus credenciales para ordenar.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={onSignOut} 
                className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl text-xs hover:bg-red-600 active:scale-95 transition-all shadow-md">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
          Desarrollado por <span className="text-purple-600">Batalla Group</span>
        </p>
      </div>
    </motion.div>
  );
}
