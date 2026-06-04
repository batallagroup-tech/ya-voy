import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { crearPedido } from "../lib/api";
import { GRAD } from "../lib/constants";

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

interface Props {
  clientSecret: string;
  pedidoData: any;
  token: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function StripePagoModal({ clientSecret, pedidoData, token, onSuccess, onClose }: Props) {
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStripe(STRIPE_PK).then(stripe => {
      if (cancelled || !stripe) return;
      setStripeInstance(stripe);
      const elements = stripe.elements({ clientSecret, appearance: { theme: "stripe" } });
      const card = elements.create("payment");
      card.mount("#stripe-payment-element");
      setCardElement({ elements, card });
    });
    return () => { cancelled = true; };
  }, [clientSecret]);

  const handlePagar = async () => {
    if (!stripeInstance || !cardElement) return;
    setLoading(true);
    try {
      const { error, paymentIntent } = await stripeInstance.confirmPayment({
        elements: cardElement.elements,
        confirmParams: { return_url: window.location.origin },
        redirect: "if_required",
      });
      if (error) { toast.error(error.message || "Error en el pago"); return; }
      if (paymentIntent?.status === "succeeded") {
        await crearPedido(pedidoData, token);
        toast.success("¡Pago exitoso! Pedido enviado.");
        onSuccess();
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[80] flex items-end">
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        className="bg-white w-full rounded-t-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Pago con tarjeta</h3>
          <button onClick={onClose}><X size={22} className="text-slate-400" /></button>
        </div>
        <div className="text-center pb-1">
          <p className="font-black text-2xl text-slate-900">${String((pedidoData?.total || 0).toFixed(2))} <span className="text-sm font-bold text-slate-400">MXN</span></p>
        </div>
        <div id="stripe-payment-element" className="min-h-[120px]" />
        <button onClick={handlePagar} disabled={loading} style={{ background: GRAD }}
          className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
          {loading ? "Procesando..." : "Pagar ahora"}
        </button>
        <p className="text-center text-xs text-slate-400">Pago seguro procesado por Stripe</p>
      </motion.div>
    </motion.div>
  );
}
