import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { motion } from "motion/react";
import { X, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { GRAD, API } from "../lib/constants";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

interface Props {
  userId: string;
  userEmail: string | undefined;
  userName: string | undefined;
  tarjetas: any[];
  onTarjetasUpdate: (tarjetas: any[]) => void;
  onClose: () => void;
}

export default function TarjetasModal({ userId, userEmail, userName, tarjetas, onTarjetasUpdate, onClose }: Props) {
  const { getToken } = useFirebaseAuth();
  const [loading, setLoading] = useState(false);
  const [showAgregar, setShowAgregar] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState("");
  const [setupStripe, setSetupStripe] = useState<any>(null);
  const [setupCard, setSetupCard] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);

  const cargarTarjetas = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + token };
      await fetch(API + "/api/stripe/customer", {
        method: "POST", headers,
        body: JSON.stringify({ userId, email: userEmail, nombre: userName }),
      });
      const res = await fetch(API + "/api/stripe/payment-methods/" + userId, { headers });
      const data = await res.json();
      onTarjetasUpdate(data.cards || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { cargarTarjetas(); }, []);

  const eliminar = async (pmId: string) => {
    try {
      const token = await getToken();
      await fetch(API + "/api/stripe/payment-methods/" + pmId, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
      onTarjetasUpdate(tarjetas.filter(c => c.id !== pmId));
      toast.success("Tarjeta eliminada");
    } catch { toast.error("Error al eliminar"); }
  };

  const abrirAgregar = async () => {
    setShowAgregar(true);
    try {
      const token = await getToken();
      const res = await fetch(API + "/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!data.clientSecret) throw new Error("No se pudo iniciar");
      const stripe = await loadStripe(STRIPE_PK);
      setSetupStripe(stripe);
      setSetupClientSecret(data.clientSecret);
      setTimeout(() => {
        const elements = stripe!.elements({ clientSecret: data.clientSecret, appearance: { theme: "stripe" } });
        const card = elements.create("payment");
        card.mount("#stripe-setup-element");
        setSetupCard({ elements, card });
      }, 300);
    } catch (e: any) { toast.error(e.message); setShowAgregar(false); }
  };

  const confirmarTarjeta = async () => {
    if (!setupStripe || !setupCard) return;
    setGuardando(true);
    try {
      const { error } = await setupStripe.confirmSetup({
        elements: setupCard.elements,
        confirmParams: { return_url: window.location.origin },
        redirect: "if_required",
      });
      if (error) { toast.error(error.message || "Error"); return; }
      toast.success("Tarjeta guardada");
      setShowAgregar(false); setSetupClientSecret(""); setSetupCard(null);
      await cargarTarjetas();
    } catch (e: any) { toast.error(e.message); }
    finally { setGuardando(false); }
  };

  if (showAgregar) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[90] flex items-end">
        <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
          className="bg-white w-full rounded-t-3xl p-6 space-y-4 overflow-y-auto" style={{ maxHeight: "90vh" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Agregar tarjeta</h3>
            <button onClick={() => { setShowAgregar(false); setSetupClientSecret(""); setSetupCard(null); }}>
              <X size={22} className="text-slate-400" />
            </button>
          </div>
          <div id="stripe-setup-element" className="min-h-[200px]" />
          <button onClick={confirmarTarjeta} disabled={guardando} style={{ background: GRAD }}
            className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
            {guardando ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
            {guardando ? "Guardando..." : "Guardar tarjeta"}
          </button>
          <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
            ⚠️ Al guardar tu tarjeta se realizará un cargo temporal de $1 MXN para verificarla. Este cargo se revierte automáticamente en 1-7 días hábiles.
          </p>
          <p className="text-center text-xs text-slate-400">Pago seguro procesado por Stripe</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[80] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Mis tarjetas</h3>
          <button onClick={onClose}><X size={22} className="text-slate-400" /></button>
        </div>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-purple-500" size={28} /></div>
        ) : tarjetas.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin tarjetas guardadas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tarjetas.map(card => (
              <div key={card.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-lg font-black text-slate-700 shrink-0">
                  {card.brand === "visa" ? "VISA" : card.brand === "mastercard" ? "MC" : card.brand?.toUpperCase()?.slice(0, 4)}
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-sm">•••• •••• •••• {card.last4}</p>
                  <p className="text-xs text-slate-500">Vence {card.exp_month}/{card.exp_year}</p>
                </div>
                <button onClick={() => eliminar(card.id)} className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={14} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={abrirAgregar} style={{ background: GRAD }}
          className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2">
          <CreditCard size={20} /> Agregar tarjeta
        </button>
      </motion.div>
    </motion.div>
  );
}
