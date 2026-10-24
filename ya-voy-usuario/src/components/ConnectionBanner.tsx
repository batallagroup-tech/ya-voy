import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, CheckCircle2 } from "lucide-react";

export default function ConnectionBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    let timer: any = null;

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
    };

    const handleOffline = () => {
      if (timer) clearTimeout(timer);
      setShowRestored(false);
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white shadow-lg shadow-black/25 select-none"
        >
          <div className="pt-2 pb-2 px-4 flex items-center justify-center gap-2 text-xs font-black tracking-wide">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <WifiOff size={15} className="animate-pulse shrink-0" />
            <span>Sin conexión. Reconectando...</span>
          </div>
        </motion.div>
      )}

      {isOnline && showRestored && (
        <motion.div
          key="restored"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white shadow-lg shadow-emerald-950/25 select-none"
        >
          <div className="pt-2 pb-2 px-4 flex items-center justify-center gap-2 text-xs font-black tracking-wide">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>Conexión restablecida</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
