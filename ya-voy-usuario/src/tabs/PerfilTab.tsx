import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, Banknote, CreditCard, Bell, HelpCircle, FileText, 
  ChevronRight, LogOut, Trash2, User, Loader2, Wallet, 
  Star, Share2, Sparkles, Pencil, Phone, Mail, X, Check 
} from "lucide-react";
import { toast } from "sonner";
import { GRAD, API, COLOR_CARMINE } from "../lib/constants";
import { supabase } from "../lib/supabase";
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
  onFotoChange: _onFotoChange, 
  onShowDirecciones, 
  onShowTarjetas, 
  onShowSoporte, 
  onShowDeleteConfirm, 
  onSignOut 
}: Props) {
  const { getToken } = useFirebaseAuth();
  const [avatarError, setAvatarError] = useState(false);
  const [notificaciones, setNotificaciones] = useState(() => localStorage.getItem("ya_voy_notif") !== "0");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ya_voy_dark") === "1");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userAspectosStats, setUserAspectosStats] = useState<{ rating: number; total: number; aspectos: Record<string, number> } | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(() => {
    return localStorage.getItem("ya_voy_ref_code_" + (userId || "")) || null;
  });
  const [showReferral, setShowReferral] = useState(false);
  const [codigoReferido, setCodigoReferido] = useState("");
  const [aplicandoRef, setAplicandoRef] = useState(false);

  // User details state & edit modal
  const [userNombre, setUserNombre] = useState(() => {
    return localStorage.getItem("ya_voy_real_name") || user?.fullName || "Cliente Ya Voy";
  });
  const [userPhone, setUserPhone] = useState(() => {
    return localStorage.getItem("ya_voy_phone") || "";
  });
  const [showEditarPerfil, setShowEditarPerfil] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getToken().then(token => {
      if (!token) return;
      const h = { Authorization: "Bearer " + token };
      fetch(API + "/api/usuario/wallet/" + userId, { headers: h }).then(r => r.json()).then(d => setWalletBalance(Number(d.balance || 0))).catch(() => {});
      fetch(API + "/api/usuario/puntos/" + userId, { headers: h }).then(r => r.json()).then(d => setPuntos(Number(d.puntos || 0))).catch(() => {});
      fetch(API + "/api/usuario/referral/" + userId, { headers: h }).then(r => r.json()).then(d => {
        if (d.code) {
          setReferralCode(d.code);
          localStorage.setItem("ya_voy_ref_code_" + userId, d.code);
        }
      }).catch(() => {});
      fetch(API + "/api/usuario/perfil/" + userId, { headers: h }).then(r => r.json()).then(d => {
        const localCustom = localStorage.getItem("ya_voy_custom_name_" + userId) || localStorage.getItem("ya_voy_real_name");
        if (localCustom) {
          setUserNombre(localCustom);
        } else if (d.nombre) {
          setUserNombre(d.nombre);
          localStorage.setItem("ya_voy_real_name", d.nombre);
        }
        if (d.telefono) {
          setUserPhone(d.telefono);
          localStorage.setItem("ya_voy_phone", d.telefono);
        }
      }).catch(() => {});
      fetch(API + "/api/usuario/perfil/" + userId + "/calificaciones-aspectos", { headers: h })
        .then(r => r.json())
        .then(d => setUserAspectosStats(d))
        .catch(() => {});
    });
  }, [userId]);

  const abrirEditarPerfil = () => {
    setEditNombre(userNombre);
    setEditPhone(userPhone);
    setShowEditarPerfil(true);
  };

  const guardarPerfil = async () => {
    if (!editNombre.trim()) {
      toast.error("Por favor ingresa tu nombre completo.");
      return;
    }
    const cleanPhone = editPhone.replace(/\D/g, "");
    if (editPhone.trim() && cleanPhone.length < 10) {
      toast.error("El número de teléfono debe tener al menos 10 dígitos.");
      return;
    }

    setGuardandoPerfil(true);
    try {
      const token = await getToken();
      // 1. Guardar en backend Postgres
      if (token) {
        await fetch(API + "/api/usuario/perfil/" + userId, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": "Bearer " + token 
          },
          body: JSON.stringify({ 
            nombre: editNombre.trim(), 
            telefono: editPhone.trim() 
          })
        });
      }

      // 2. Actualizar metadata de Supabase Auth
      await supabase.auth.updateUser({
        data: {
          full_name: editNombre.trim(),
          phone: editPhone.trim()
        }
      });

      // 3. Persistir en localStorage
      localStorage.setItem("ya_voy_real_name", editNombre.trim());
      if (userId) localStorage.setItem("ya_voy_custom_name_" + userId, editNombre.trim());
      if (editPhone.trim()) localStorage.setItem("ya_voy_phone", editPhone.trim());

      setUserNombre(editNombre.trim());
      if (editPhone.trim()) setUserPhone(editPhone.trim());
      setShowEditarPerfil(false);
      toast.success("¡Perfil actualizado con éxito!");
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar el perfil");
    } finally {
      setGuardandoPerfil(false);
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

  const imagenAvatar = fotoPerfil || user?.imageUrl;

  return (
    <motion.div 
      key="perfil" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="p-4 space-y-4">

      {/* Profile Card Header */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-r from-[#9C0D38]/10 via-[#7A0A2C]/10 to-[#9C0D38]/10" />
        
        {/* Avatar sin botón de subida manual (usando Google / sesión) */}
        <div className="relative w-20 h-20 mb-3 mt-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-rose-50 flex items-center justify-center">
            {imagenAvatar && !avatarError ? (
              <img 
                src={imagenAvatar} 
                alt="" 
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={36} className="text-[#9C0D38]" />
              </div>
            )}
          </div>
        </div>

        {/* Nombre con botón de lapicito */}
        <div className="flex items-center gap-2 justify-center">
          <p className="font-black text-slate-900 text-lg">{userNombre}</p>
          <button 
            onClick={abrirEditarPerfil}
            className="w-7 h-7 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#9C0D38] flex items-center justify-center transition-all active:scale-90 shadow-2xs"
            title="Editar nombre y teléfono">
            <Pencil size={13} />
          </button>
        </div>

        {/* Correo */}
        <p className="text-xs text-slate-400 mt-0.5">{user?.primaryEmailAddress?.emailAddress || "Usuario verificado"}</p>

        {/* Teléfono obligatorio */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-xs font-semibold text-slate-600">
          <Phone size={12} className="text-[#9C0D38]" />
          <span>{userPhone || "Sin teléfono (toca el lápiz para agregar)"}</span>
        </div>
      </div>

      {/* Wallet + Calificación del Cliente */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => setShowWalletModal(true)}
          className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between text-left hover:border-rose-200 active:scale-[0.98] transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center">
              <Wallet size={18} className="text-[#9C0D38]" />
            </div>
            <span className="text-[10px] font-black text-[#9C0D38] bg-rose-50 px-2 py-0.5 rounded-full">Ver ▸</span>
          </div>
          <div>
            <p className="font-black text-slate-900 text-xl tracking-tight">${walletBalance.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Saldo en Monedero</p>
          </div>
        </button>

        <button 
          onClick={() => setShowRatingModal(true)}
          className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between text-left hover:border-amber-200 active:scale-[0.98] transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center">
              <Star size={18} className="text-amber-500 fill-amber-500" />
            </div>
            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Aspectos ▸</span>
          </div>
          <div>
            <p className="font-black text-slate-900 text-xl tracking-tight">
              {userAspectosStats?.total ? Number(userAspectosStats.rating || 0).toFixed(1) : "0.0"} ⭐
            </p>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Mi Calificación</p>
          </div>
        </button>
      </div>

      {/* Referral Program */}
      {referralCode && (
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#9C0D38]" />
              <p className="font-black text-slate-900 text-xs uppercase tracking-wider">Gana Dinero con Referidos</p>
            </div>
            <button 
              onClick={compartirReferido}
              className="flex items-center gap-1 text-xs font-black text-[#9C0D38] hover:text-[#7A0A2C] bg-rose-50 px-2.5 py-1 rounded-xl transition-colors">
              <Share2 size={13} /> Compartir
            </button>
          </div>
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-2xl py-3 px-4 text-center">
            <p className="font-black text-[#9C0D38] text-2xl tracking-widest">{referralCode}</p>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Comparte tu código con amigos. Cuando hagan su primer pedido, ambos recibirán saldo en monedero.
          </p>

          {!showReferral ? (
            <button 
              onClick={() => setShowReferral(true)}
              className="w-full py-2.5 text-xs font-bold text-[#9C0D38] border border-rose-200 rounded-2xl hover:bg-rose-50 transition-colors">
              ¿Tienes un código de referido?
            </button>
          ) : (
            <div className="flex gap-2 pt-1">
              <input 
                value={codigoReferido}
                onChange={e => setCodigoReferido(e.target.value.toUpperCase())}
                placeholder="CÓDIGO DE AMIGO"
                className="flex-1 px-3 py-2.5 bg-slate-50 rounded-2xl text-xs border border-slate-200 outline-none font-bold tracking-wider uppercase focus:border-[#9C0D38]" 
              />
              <button 
                onClick={aplicarReferido}
                disabled={aplicandoRef || !codigoReferido.trim()}
                className="px-4 py-2.5 rounded-2xl text-xs font-black text-white disabled:opacity-50 transition-transform active:scale-95"
                style={{ background: GRAD }}>
                {aplicandoRef ? "..." : "Canjear"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Settings Menu */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <button 
          onClick={onShowDirecciones}
          className="w-full px-4 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50">
          <div className="w-9 h-9 bg-rose-50 rounded-2xl flex items-center justify-center text-[#9C0D38] shrink-0">
            <MapPin size={18} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-slate-900 text-xs">Mis Direcciones de Entrega</p>
            <p className="text-[11px] text-slate-400">{direcciones.length} guardada{direcciones.length !== 1 ? "s" : ""}</p>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>

        <div className="px-4 py-4 flex items-center gap-3.5 border-b border-slate-50">
          <div className="w-9 h-9 bg-rose-50 rounded-2xl flex items-center justify-center text-[#9C0D38] shrink-0">
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
            className="text-xs font-black px-3 py-1.5 rounded-xl border border-rose-200 text-[#9C0D38] bg-rose-50 hover:bg-rose-100 transition-colors">
            Cambiar
          </button>
        </div>

        <button 
          onClick={onShowTarjetas}
          className="w-full px-4 py-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50">
          <div className="w-9 h-9 bg-rose-50 rounded-2xl flex items-center justify-center text-[#9C0D38] shrink-0">
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
          <div className="w-9 h-9 bg-rose-50 rounded-2xl flex items-center justify-center text-[#9C0D38] shrink-0">
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
          <div className="w-9 h-9 bg-rose-50 rounded-2xl flex items-center justify-center text-[#9C0D38] shrink-0">
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

      {/* Modal Editar Perfil (Lapicito) */}
      <AnimatePresence>
        {showEditarPerfil && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 200, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 200, opacity: 0 }}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
              
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-[#9C0D38]">
                    <Pencil size={15} />
                  </div>
                  <h3 className="font-black text-slate-900 text-base">Editar Mis Datos</h3>
                </div>
                <button 
                  onClick={() => setShowEditarPerfil(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5 pt-1">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <User size={12} className="text-[#9C0D38]" /> Nombre Completo
                  </label>
                  <input 
                    type="text"
                    value={editNombre}
                    onChange={e => setEditNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#9C0D38] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Phone size={12} className="text-[#9C0D38]" /> Teléfono Móvil (10 dígitos) *
                  </label>
                  <input 
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="Ej. 7971234567"
                    maxLength={10}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#9C0D38] focus:bg-white transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Obligatorio para que los repartidores puedan contactarte al entregar.</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" /> Correo Electrónico
                  </label>
                  <div className="px-4 py-3 bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-500 flex items-center justify-between">
                    <span className="truncate">{user?.primaryEmailAddress?.emailAddress || "Sin correo"}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0 ml-2">Google</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button 
                  onClick={() => setShowEditarPerfil(false)}
                  disabled={guardandoPerfil}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={guardarPerfil}
                  disabled={guardandoPerfil}
                  className="flex-1 py-3.5 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
                  style={{ background: GRAD }}>
                  {guardandoPerfil ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Guardar Datos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Monedero con Movimientos */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#9C0D38] flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <h3 className="font-black text-slate-900 text-base">Monedero Ya Voy</h3>
                </div>
                <button onClick={() => setShowWalletModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <X size={16} />
                </button>
              </div>

              {/* Balance Card */}
              <div className="p-4 rounded-2xl text-white text-center shadow-lg" style={{ background: GRAD }}>
                <p className="text-xs uppercase tracking-wider font-bold opacity-80">Saldo Disponible</p>
                <p className="text-3xl font-black mt-1">${walletBalance.toFixed(2)} <span className="text-sm font-bold">MXN</span></p>
                <p className="text-[11px] opacity-90 mt-1">Usa tu saldo directamente al pagar tus pedidos</p>
              </div>

              {/* Movimientos */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Historial de movimientos</p>
                
                {walletBalance > 0 ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🎁</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Bono por referidos / bienvenida</p>
                          <p className="text-[10px] text-slate-400">Acreditado a tu monedero</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-green-600">+${walletBalance.toFixed(2)}</span>
                    </div>

                    <div className="p-3 bg-slate-50/60 rounded-2xl border border-slate-100/60 flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🎟️</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Cupones y promociones</p>
                          <p className="text-[10px] text-slate-400">Canjeables en carrito</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">Activo</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                      <Wallet size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-600">No tienes movimientos recientes</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Comparte tu código de referido para ganar saldo gratis para tus órdenes.
                    </p>
                  </div>
                )}
              </div>

              <button onClick={() => setShowWalletModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors">
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Mi Calificación con Desglose de Aspectos */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Star size={16} className="fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Mi Calificación</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Valoración como comensal</p>
                  </div>
                </div>
                <button onClick={() => setShowRatingModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <X size={16} />
                </button>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-center">
                <p className="text-4xl font-black text-slate-900">
                  {userAspectosStats?.total ? Number(userAspectosStats.rating || 0).toFixed(1) : "0.0"}
                </p>
                <div className="flex justify-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={15} className={Boolean(userAspectosStats?.total) && i <= Math.round(Number(userAspectosStats?.rating || 0)) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
                  ))}
                </div>
                <p className="text-xs font-bold text-amber-800 mt-1">
                  {userAspectosStats?.total ?? 0} entregas evaluadas por repartidores
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Aspectos destacados</p>
                {userAspectosStats?.aspectos && Object.keys(userAspectosStats.aspectos).length > 0 ? (
                  <div className="space-y-2.5">
                    {(() => {
                      const maxV = Math.max(...Object.values(userAspectosStats.aspectos), 1);
                      return Object.entries(userAspectosStats.aspectos)
                        .sort((a, b) => b[1] - a[1])
                        .map(([aspecto, count]) => (
                          <div key={aspecto} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-slate-700">{aspecto}</span>
                              <span className="font-black text-[#9C0D38]">{count} voto{count !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxV) * 100}%`, background: GRAD }} />
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[
                      { nombre: "Puntualidad al recibir", base: 100 },
                      { nombre: "Buena comunicación", base: 100 },
                      { nombre: "Amabilidad", base: 100 },
                      { nombre: "Ubicación clara", base: 100 },
                    ].map(a => (
                      <div key={a.nombre} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">{a.nombre}</span>
                          <span className="text-[10px] font-black text-green-600">⭐ Excelente</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${a.base}%` }} />
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400 text-center pt-1">
                      Tus repartidores valoran cada entrega. Mantén un trato cordial para conservar tu excelente puntuación.
                    </p>
                  </div>
                )}
              </div>

              <button onClick={() => setShowRatingModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors">
                Cerrar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Cierre de Sesión */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-2 text-[#9C0D38]">
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
          Desarrollado por <span className="text-[#9C0D38]">Batalla Group</span>
        </p>
      </div>
    </motion.div>
  );
}
