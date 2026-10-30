import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowDownCircle, X, ExternalLink } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { GRAD, API } from "../lib/constants";

// Código de versión local de esta compilación
export const CURRENT_APP_VERSION_CODE = 50;
export const CURRENT_APP_VERSION_NAME = "1.3.8";

interface VersionInfo {
  latestVersionCode: number;
  latestVersionName: string;
  minVersionCode: number;
  forceUpdate: boolean;
  title: string;
  message: string;
  storeUrl: string;
}

export default function UpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Si ya se descartó en las últimas 24 horas y no es forzada, no volver a molestar
    const dismissedUntil = localStorage.getItem("ya_voy_user_update_dismissed_until");
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const checkVersion = async () => {
      let localCode = CURRENT_APP_VERSION_CODE;

      if (Capacitor.isNativePlatform()) {
        try {
          const info = await CapApp.getInfo();
          if (info?.build) localCode = parseInt(info.build, 10) || localCode;
        } catch (e) {
          console.warn("Error leyendo versión nativa", e);
        }
      }

      fetch(`${API}/api/config/versions`)
        .then((r) => r.json())
        .then((data) => {
          const u = data?.usuario as VersionInfo | undefined;
          if (u && typeof u.latestVersionCode === "number" && u.latestVersionCode > localCode) {
            setUpdateInfo(u);
            setIsOpen(true);
          }
        })
        .catch(() => {});
    };

    checkVersion();
  }, []);

  const handleUpdate = () => {
    if (!updateInfo?.storeUrl) return;
    const playStoreUri = "market://details?id=com.batallagroup.yavoy.usuario";
    try {
      if (Capacitor.isNativePlatform()) {
        window.location.href = playStoreUri;
      } else {
        window.open(updateInfo.storeUrl, "_system");
      }
    } catch {
      window.location.href = updateInfo.storeUrl;
    }
  };

  const handleDismiss = () => {
    if (updateInfo?.forceUpdate) return;
    try {
      localStorage.setItem("ya_voy_user_update_dismissed_until", (Date.now() + 24 * 60 * 60 * 1000).toString());
    } catch {}
    setIsOpen(false);
  };

  if (!isOpen || !updateInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-rose-100 overflow-hidden"
        >
          {/* Fondo decorativo con destello */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {!updateInfo.forceUpdate && (
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          )}

          {/* Insignia animada con icono */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-rose-900/20"
               style={{ background: GRAD }}>
            <ArrowDownCircle size={32} className="animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400 items-center justify-center text-[9px] font-black text-rose-950">
                <Sparkles size={9} />
              </span>
            </span>
          </div>

          <span className="inline-block px-3 py-1 bg-rose-50 text-[#9C0D38] border border-rose-200 text-[11px] font-black tracking-wider uppercase rounded-full mb-2">
            Versión {updateInfo.latestVersionName} Disponible
          </span>

          <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight">
            {updateInfo.title || "¡Nueva versión disponible en Google Play!"}
          </h3>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {updateInfo.message || "Hemos preparado mejoras importantes en velocidad, monedero de recompensas y notificaciones para brindarte la mejor experiencia."}
          </p>

          <div className="space-y-2.5">
            <button
              onClick={handleUpdate}
              className="w-full py-3.5 px-4 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
              style={{ background: GRAD }}
            >
              <span>Actualizar en Google Play</span>
              <ExternalLink size={14} />
            </button>

            {!updateInfo.forceUpdate && (
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Recordar más tarde
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
