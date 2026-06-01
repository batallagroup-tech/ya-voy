import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useUser, useClerk, useSignIn, AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "motion/react";
import {
  ShoppingBag, Search, Home, Clock, User, MapPin, Star, ChevronRight,
  Plus, Minus, X, Loader2, LogOut, ShoppingCart, Utensils, Store,
  Package, Trash2, CreditCard, Banknote, Bell, HelpCircle, FileText,
  ChevronDown, Check, ArrowLeft, Mail, Eye, EyeOff, MessageSquare, Send, RefreshCw, Camera
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { syncUsuario, getNegocios, getProductos, crearPedido, getPedidos, getProductosFeed } from "./lib/api";
import OnboardingFlow from "./components/OnboardingFlow";
const _API = import.meta.env.VITE_API_URL || "http://localhost:3001";

import DireccionesScreen from "./components/DireccionesScreen";
import ServerWarmup from "./components/ServerWarmup"
import { usePushNotifications } from "./hooks/usePushNotifications"
import { Stripe, PaymentSheetEventsEnum } from "@capacitor-community/stripe"
import { Capacitor } from "@capacitor/core";
import type { Direccion } from "./components/DireccionesScreen";
import { AdMob, BannerAdSize, BannerAdPosition } from "@capacitor-community/admob"
import { loadStripe } from "@stripe/stripe-js";
const _STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

const GRAD = "linear-gradient(135deg, #6C3CE1 0%, #9B59B6 50%, #E91E8C 100%)";

function LoginScreen() {
  const { signIn, isLoaded } = useSignIn();
  const [mode, setMode] = useState<'selection' | 'email'>('selection');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeCardElement, setStripeCardElement] = useState<any>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [stripePagoLoading, setStripePagoLoading] = useState(false);
  const [pendingPedidoData, setPendingPedidoData] = useState<any>(null);
  const [showTarjetas, setShowTarjetas] = useState(false);
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [tarjetasLoading, setTarjetasLoading] = useState(false);
  const [showAgregarTarjeta, setShowAgregarTarjeta] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState("");
  const [setupStripeInstance, setSetupStripeInstance] = useState<any>(null);
  const [setupCardElement, setSetupCardElement] = useState<any>(null);
  const [guardandoTarjeta, setGuardandoTarjeta] = useState(false);
  const [showChatPedido, setShowChatPedido] = useState<string | null>(null);
  const [chatMensajes, setChatMensajes] = useState<any[]>([]);
  const [chatTexto, setChatTexto] = useState("");
  const [chatEnviando, setChatEnviando] = useState(false);
  const [chatNoLeidos, setChatNoLeidos] = useState<Record<string, number>>({});
  const chatPollRef = useRef<any>(null);
  const [repUbicacion, setRepUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const ubPollRef = useRef<any>(null);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true); setError('');
    try {
      const r = await signIn!.create({ identifier: email, password });
      if (r.status === 'complete') window.location.reload();
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Correo o contrasena incorrectos.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    if (!isLoaded) return;
    await signIn!.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: window.location.origin + '/sso-callback',
      redirectUrlComplete: window.location.origin + '/',
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6" style={{ background: GRAD }}>
      <AnimatePresence mode="wait">
        {mode === 'selection' && (
          <motion.div key="sel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl">
                <ShoppingBag size={48} className="text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-5xl font-black text-white tracking-widest">YA VOY</h1>
                <p className="text-white/80 text-sm font-bold tracking-[0.4em] uppercase mt-1">Delivery Inteligente</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3 mt-4">
              <button onClick={handleGoogle}
                className="w-full bg-white text-purple-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-purple-50 transition-all">
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#6C3CE1" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg>
                Continuar con Google
              </button>
              <button onClick={() => setMode('email')}
                className="w-full bg-white/20 backdrop-blur text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/30 hover:bg-white/30 transition-all">
                <Mail size={20} /> Continuar con correo
              </button>
            </div>
            <p className="text-white/30 text-xs text-center">Al continuar, aceptas nuestros Terminos y Condiciones.</p>
          </motion.div>
        )}
        {mode === 'email' && (
          <motion.div key="email" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full max-w-xs">
            <button onClick={() => setMode('selection')} className="mb-6 text-white/70 flex items-center gap-2 hover:text-white">
              <ArrowLeft size={18} /> Volver
            </button>
            <h2 className="text-2xl font-black text-white mb-6">Iniciar sesion</h2>
            <form onSubmit={handleEmail} className="flex flex-col gap-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="Correo electronico"
                className="w-full px-4 py-4 rounded-2xl bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:border-white font-medium" />
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="Contrasena"
                  className="w-full px-4 py-4 rounded-2xl bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:border-white font-medium" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-white bg-white/20 rounded-xl px-4 py-3 text-sm font-medium">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-white text-purple-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-purple-50 transition-all disabled:opacity-60 mt-2">
                {loading && <Loader2 className="animate-spin" size={20} />}
                Entrar
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <div id="clerk-captcha" className="hidden" />
      <p className="absolute bottom-6 text-white/30 text-xs">Desarrollado por Batalla Group</p>
    </div>
  );
}
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.4 }}
      style={{ background: GRAD }} className="fixed inset-0 flex flex-col items-center justify-center">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }} className="flex flex-col items-center gap-6">
        <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl">
          <ShoppingBag size={48} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-black text-white tracking-widest">YA VOY</h1>
          <p className="text-white/80 text-sm font-bold tracking-[0.4em] uppercase mt-1">Delivery Inteligente</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}
        className="absolute bottom-10 flex flex-col items-center gap-1">
        <p className="text-white/50 text-xs tracking-widest uppercase">Desarrollado por</p>
        <p className="text-white/90 text-sm font-black tracking-[0.3em] uppercase">Batalla Group</p>
      </motion.div>
    </motion.div>
  );
}

interface CartItem { productoId: string; nombre: string; precio: number; cantidad: number; negocioId: string; }

export default function App() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [showSplash, setShowSplash] = useState(true)
  const [rtGlow, setRtGlow] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDirecciones, setShowDirecciones] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false)
  const [cancelRazon, setCancelRazon] = useState("")
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showSoporte, setShowSoporte] = useState(false);
  const [soporteTipo, setSoporteTipo] = useState("");
  const [soporteComentario, setSoporteComentario] = useState("");
  const [soporteLoading, setSoporteLoading] = useState(false);

  const [appConfig, setAppConfig] = useState<Record<string,string>>({})
  const [tab, setTab] = useState<"home" | "explorar" | "pedidos" | "perfil">("home");
  const [categoria, setCategoria] = useState<"comida" | "tienda" | "envio">("comida");
  const [subCategoria, setSubCategoria] = useState("Todos");

  const [negocios, setNegocios] = useState<any[]>([]);
  const [productosFeed, setProductosFeed] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState<any>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [cuponCodigo, setCuponCodigo] = useState("")
  const [cuponAplicado, setCuponAplicado] = useState<{codigo:string;descuento:number;tipo:string;valor:number}|null>(null)
  const [cuponLoading, setCuponLoading] = useState(false)
  const [cuponError, setCuponError] = useState("")
  const [costoEnvio, setCostoEnvio] = useState(35)
  const [costoEnvioLoading, setCostoEnvioLoading] = useState(false)
  const [tiempoEstimado, setTiempoEstimado] = useState("")
  const [fotoPerfil, setFotoPerfil] = useState("")
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidoDetalle, setPedidoDetalle] = useState<any>(null);
  const [codigoOpciones, setCodigoOpciones] = useState<string[]>([]);
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [esperandoTimer, setEsperandoTimer] = useState<number | null>(null);
  const [ratingRest, setRatingRest] = useState(0);
  const [ratingRep, setRatingRep] = useState(0);
  const [ratingRestFrase, setRatingRestFrase] = useState("");
  const [ratingRepFrase, setRatingRepFrase] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeCardElement, setStripeCardElement] = useState<any>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [stripePagoLoading, setStripePagoLoading] = useState(false);
  const [pendingPedidoData, setPendingPedidoData] = useState<any>(null);
  const [showTarjetas, setShowTarjetas] = useState(false);
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [tarjetasLoading, setTarjetasLoading] = useState(false);
  const [showAgregarTarjeta, setShowAgregarTarjeta] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState("");
  const [setupStripeInstance, setSetupStripeInstance] = useState<any>(null);
  const [setupCardElement, setSetupCardElement] = useState<any>(null);
  const [guardandoTarjeta, setGuardandoTarjeta] = useState(false);
  const [showChatPedido, setShowChatPedido] = useState<string | null>(null);
  const [chatMensajes, setChatMensajes] = useState<any[]>([]);
  const [chatTexto, setChatTexto] = useState("");
  const [chatEnviando, setChatEnviando] = useState(false);
  const [chatNoLeidos, setChatNoLeidos] = useState<Record<string, number>>({});
  const chatPollRef = useRef<any>(null);
  const [repUbicacion, setRepUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const ubPollRef = useRef<any>(null);

  const [metodoPago, setMetodoPago] = useState(() => localStorage.getItem("ya_voy_pago") || "efectivo");
  const [notificaciones, setNotificaciones] = useState(() => localStorage.getItem("ya_voy_notif") !== "0");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ya_voy_dark") === "1")
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    try { return JSON.parse(localStorage.getItem("ya_voy_location") || "null"); } catch { return null; }
  });

  const direcciones: Direccion[] = (() => {
    try { return JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]"); } catch { return []; }
  })();
  const direccionPrincipal = direcciones.find(d => d.principal) || direcciones[0];

  const subCategorias: Record<string, string[]> = {
    comida: ["Todos", "Tacos", "Hamburguesas", "Pizza", "Sushi", "Comida Corrida", "Alitas", "Ensaladas", "Mariscos", "Postres", "Bebidas"],
    tienda: ["Todos"],
    envio: [],
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !user) return;
    syncUsuario({ userId, email: user.primaryEmailAddress?.emailAddress ?? "", nombre: user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "", fotoUrl: user.imageUrl ?? "", rol: "cliente" }).catch(() => {});
    fetch(_API + "/api/config").then(r => r.json()).then(d => setAppConfig(d)).catch(() => {})
    if (!localStorage.getItem("ya_voy_onboarding_done")) {
      setShowOnboarding(true);
    } else {
      loadNegocios();
    }
  }, [isLoaded, isSignedIn, userId]);


  // countdown + auto-expirar cuando llega a 0
  useEffect(() => {
    if (esperandoTimer === null || esperandoTimer <= 0) return;
    const iv = setInterval(() => {
      setEsperandoTimer(t => {
        if (t === null) return null;
        if (t <= 1) {
          // Llamar endpoint para marcar entregado
          const pedidoEsp = pedidos.find((p: any) => p.status === "esperando_cliente");
          if (pedidoEsp) {
            fetch(`${_API}/api/repartidor/pedidos/${pedidoEsp.id}/expirar-espera`, { method: "PATCH" })
              .then(() => loadPedidos())
              .catch(() => {});
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [esperandoTimer]);
    useEffect(() => { if (tab === "pedidos") loadPedidos(); }, [tab]);

  const ADMOB_BANNER_ID_USR = "ca-app-pub-3849768825456219/7317936592"
  useEffect(() => { AdMob.initialize().catch(() => {}) }, [])
  useEffect(() => {
    if (tab === "explorar") {
      AdMob.showBanner({ adId: ADMOB_BANNER_ID_USR, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 56 }).catch(() => {})
    } else { AdMob.hideBanner().catch(() => {}) }
    return () => { AdMob.hideBanner().catch(() => {}) }
  }, [tab])
  useEffect(() => {
    if (categoria === "comida" && productosFeed.length === 0) loadProductosFeed();
    if (categoria === "tienda") loadNegocios();
  }, [categoria]);

  const loadNegocios = async (loc?: [number, number] | null) => {
    setLoading(true);
    const coords = loc ?? userLocation;
    try { setNegocios(await getNegocios(coords?.[0], coords?.[1]) as any[]); }
    catch {} finally { setLoading(false); }
  };

  const loadProductosFeed = async () => {
    setLoading(true)
    try { setProductosFeed((await getProductosFeed() as any[]) || []) }
    catch {} finally { setLoading(false) }
  }

  const prevPedidosStatusRef = useRef<Record<string,string>>({})
  const playSound = (tipo: "enCamino" | "llegando") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const note = (freq: number, time: number, dur: number, vol = 0.3) => {
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = "sine"; o.frequency.value = freq
        g.gain.setValueAtTime(0, time)
        g.gain.linearRampToValueAtTime(vol, time + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, time + dur)
        o.start(time); o.stop(time + dur)
      }
      if (tipo === "enCamino") {
        note(440, ctx.currentTime, 0.25)
        note(554, ctx.currentTime + 0.2, 0.25)
        note(659, ctx.currentTime + 0.4, 0.4)
      } else {
        // llegando — urgente
        [0,0.18,0.36,0.54,0.9,1.08,1.26,1.44].forEach(t => note(880, ctx.currentTime+t, 0.15, 0.4))
      }
    } catch {}
  }

  const loadPedidos = async () => {
    if (!userId) return;
    try {
      const data = await getPedidos(userId) as any[];
      setPedidos(data);
      data.forEach((p: any) => {
        const prev = prevPedidosStatusRef.current[p.id]
        if (prev && prev !== p.status) {
          if (p.status === "en_camino") playSound("enCamino")
          if (p.status === "esperando_cliente") playSound("llegando")
        }
        prevPedidosStatusRef.current[p.id] = p.status
      })
      const enCamino = data.find((p: any) => p.status === 'en_camino' && p.repartidor_id);
      if (enCamino) { iniciarPollUbicacion(enCamino.repartidor_id); }
      else { detenerPollUbicacion(); }
      const esp = data.find((p: any) => p.status === 'esperando_cliente');
      if (esp) {
        const desde = esp.esperando_desde ? new Date(esp.esperando_desde).getTime() : Date.now();
        const secs = Math.max(0, 600 - Math.floor((Date.now() - desde) / 1000));
        setEsperandoTimer(secs);
      } else {
        setEsperandoTimer(null);
      }
    } catch {}
  };

  const handleOnboardingDone = ({ location, pago }: { location: [number, number] | null; pago: string }) => {
    localStorage.setItem("ya_voy_onboarding_done", "1");
    if (location) { localStorage.setItem("ya_voy_location", JSON.stringify(location)); setUserLocation(location); }
    localStorage.setItem("ya_voy_pago", pago);
    setMetodoPago(pago);
    setShowOnboarding(false);
    loadNegocios(location);
  };

  const openNegocio = async (n: any) => {
    setNegocioSeleccionado(n);
    calcularEnvio(n);
    try { setProductos(await getProductos(n.id) as any[]); } catch {}
  };

  const addToCart = (p: any) => {
    const pNegocioId = p.negocioId || p.negocio_id || negocioSeleccionado?.id || "";
    if (cart.length > 0 && cart[0].negocioId !== pNegocioId) {
      toast.error("Solo puedes pedir de un restaurante a la vez");
      return;
    }
    setCart(prev => {
      const exists = prev.find(i => i.productoId === p.id);
      if (exists) return prev.map(i => i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, negocioId: pNegocioId }];
    });
    toast.success(`${p.nombre} agregado`);
  };

  const removeFromCart = (productoId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.productoId === productoId);
      if (!item) return prev;
      if (item.cantidad === 1) return prev.filter(i => i.productoId !== productoId);
      return prev.map(i => i.productoId === productoId ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const total = cart.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const cartCount = cart.reduce((a, i) => a + i.cantidad, 0);

  const handlePedir = async () => {
    if (!cart.length || !userId) return;
    const pedidoData = {
      clienteId: userId,
      negocioId: cart[0].negocioId,
      items: cart,
      total: total + costoEnvio - (cuponAplicado?.descuento || 0),
      notas: "",
      metodoPago,
      cuponCodigo: cuponAplicado?.codigo || null,
      descuentoCupon: cuponAplicado?.descuento || 0,
      costoEnvio,
      tiempoEstimado,
    };

    if (metodoPago === "tarjeta") {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(_API + "/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({ amount: pedidoData.total, currency: "mxn", costoEnvio }),
        });
        const data = await res.json();
        if (!data.clientSecret) throw new Error("No se pudo iniciar el pago");
        if (Capacitor.isNativePlatform()) {
          await Stripe.initialize({ publishableKey: _STRIPE_PK });
          await Stripe.createPaymentSheet({
            paymentIntentClientSecret: data.clientSecret,
            merchantDisplayName: "Ya Voy Batalla Group",
            style: "alwaysLight",
          });
          const result = await Stripe.presentPaymentSheet();
          if (result.paymentResult === PaymentSheetEventsEnum.Completed) {
            await crearPedido(pedidoData);
            setCart([]); setShowCart(false); setNegocioSeleccionado(null);
            toast.success("Pedido enviado!"); setTab("pedidos");
          } else { toast.error("Pago cancelado"); }
        } else {
          setPendingPedidoData(pedidoData);
          setStripeClientSecret(data.clientSecret);
          const stripeObj = await loadStripe(_STRIPE_PK);
          setStripeInstance(stripeObj);
          setShowStripeModal(true);
          setTimeout(async () => {
            const elements = stripeObj!.elements({ clientSecret: data.clientSecret, appearance: { theme: "stripe" } });
            const card = elements.create("payment");
            card.mount("#stripe-payment-element");
            setStripeCardElement({ elements, card });
          }, 300);
        }
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
      return;
    }
    setLoading(true);
    try {
      await crearPedido(pedidoData);
      setCart([]); setShowCart(false); setNegocioSeleccionado(null);
      toast.success("Pedido enviado!"); setTab("pedidos");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleConfirmarPagoWeb = async () => {
    if (!stripeInstance || !stripeCardElement || !stripeClientSecret) return;
    setStripePagoLoading(true);
    try {
      const { error, paymentIntent } = await stripeInstance.confirmPayment({
        elements: stripeCardElement.elements,
        confirmParams: { return_url: window.location.origin },
        redirect: "if_required",
      });
      if (error) { toast.error(error.message || "Error en el pago"); return; }
      if (paymentIntent?.status === "succeeded") {
        await crearPedido(pendingPedidoData);
        setCart([]); setShowCart(false); setNegocioSeleccionado(null);
        setShowStripeModal(false); setStripeClientSecret(""); setPendingPedidoData(null);
        toast.success("Pago exitoso! Pedido enviado!"); setTab("pedidos");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setStripePagoLoading(false); }
  };

  const handleDeleteAccount = async () => {
    try {
      await user?.delete();
      localStorage.clear();
    } catch { toast.error("Error al eliminar cuenta"); }
    setShowDeleteConfirm(false);
  };

  const ensureCustomer = async () => {
    await fetch(_API + "/api/stripe/customer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email: user?.primaryEmailAddress?.emailAddress, nombre: user?.fullName }),
    });
  };

  const abrirChatUsuario = async (pedidoId: string) => {
    setShowChatPedido(pedidoId);
    await cargarChatMensajes(pedidoId);
    chatPollRef.current = setInterval(() => cargarChatMensajes(pedidoId), 3000);
    fetch(_API + "/api/mensajes/" + pedidoId + "/leidos", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lectorTipo: "usuario" })
    }).catch(() => {});
    setChatNoLeidos(prev => ({ ...prev, [pedidoId]: 0 }));
  };

  const cerrarChatUsuario = () => {
    setShowChatPedido(null);
    clearInterval(chatPollRef.current);
    setChatMensajes([]);
  };

  const iniciarPollUbicacion = (repartidorId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(_API + "/api/repartidor/" + repartidorId + "/ubicacion");
        const data = await res.json();
        if (data.lat_actual && data.lng_actual) {
          setRepUbicacion({ lat: Number(data.lat_actual), lng: Number(data.lng_actual) });
        }
      } catch {}
    };
    poll();
    ubPollRef.current = setInterval(poll, 5000);
  };

  const detenerPollUbicacion = () => {
    clearInterval(ubPollRef.current);
    setRepUbicacion(null);
  };

  const cargarChatMensajes = async (pedidoId: string) => {
    try {
      const res = await fetch(_API + "/api/mensajes/" + pedidoId);
      const data = await res.json();
      if (Array.isArray(data)) {
        setChatMensajes(data);
        const noLeidos = data.filter((m: any) => m.remitente_tipo === "repartidor" && !m.leido).length;
        setChatNoLeidos(prev => ({ ...prev, [pedidoId]: noLeidos }));
      }
    } catch {}
  };

  const enviarChatMensaje = async () => {
    if (!showChatPedido || !chatTexto.trim() || !userId) return;
    setChatEnviando(true);
    try {
      await fetch(_API + "/api/mensajes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: showChatPedido, remitenteId: userId, remitenteTipo: "usuario", texto: chatTexto })
      });
      setChatTexto("");
      await cargarChatMensajes(showChatPedido);
    } catch { toast.error("Error al enviar"); }
    finally { setChatEnviando(false); }
  };

  const loadTarjetas = async () => {
    if (!userId) return;
    setTarjetasLoading(true);
    try {
      await ensureCustomer();
      const res = await fetch(_API + "/api/stripe/payment-methods/" + userId);
      const data = await res.json();
      setTarjetas(data.cards || []);
    } catch {}
    finally { setTarjetasLoading(false); }
  };

  const calcularEnvio = async (negocioOverride?: any) => {
    const negocioRef = negocioOverride ?? negocioSeleccionado; if (!negocioRef?.lat || !negocioRef?.lng) {
      setCostoEnvio(35); return
    }
    const loc = userLocation || (direccionPrincipal?.lat && direccionPrincipal?.lng ? [direccionPrincipal.lat, direccionPrincipal.lng] as [number,number] : null)
    if (!loc) { setCostoEnvio(35); return }
    setCostoEnvioLoading(true)
    try {
      const res = await fetch(_API + "/api/stripe/calcular-envio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latUsuario: loc[0], lngUsuario: loc[1], latNegocio: negocioRef.lat, lngNegocio: negocioRef.lng })
      })
      const d = await res.json()
      if (d.costoEnvio) setCostoEnvio(d.costoEnvio)
      if (d.tiempoEstimado) setTiempoEstimado(d.tiempoEstimado)
    } catch {} finally { setCostoEnvioLoading(false) }
  }

  const handleAbrirTarjetas = async () => {
    setShowTarjetas(true);
    await loadTarjetas();
  };

  const handleAgregarTarjeta = async () => {
    setShowAgregarTarjeta(true);
    try {
      const res = await fetch(_API + "/api/stripe/setup-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!data.clientSecret) throw new Error("No se pudo iniciar");
      const stripeObj = await loadStripe(_STRIPE_PK);
      setSetupStripeInstance(stripeObj);
      setSetupClientSecret(data.clientSecret);
      setTimeout(async () => {
        const elements = stripeObj!.elements({ clientSecret: data.clientSecret, appearance: { theme: "stripe" } });
        const card = elements.create("payment");
        card.mount("#stripe-setup-element");
        setSetupCardElement({ elements, card });
      }, 300);
    } catch (e: any) { toast.error(e.message); setShowAgregarTarjeta(false); }
  };

  const handleConfirmarTarjeta = async () => {
    if (!setupStripeInstance || !setupCardElement) return;
    setGuardandoTarjeta(true);
    try {
      const { error } = await setupStripeInstance.confirmSetup({
        elements: setupCardElement.elements,
        confirmParams: { return_url: window.location.origin },
        redirect: "if_required",
      });
      if (error) { toast.error(error.message || "Error"); return; }
      toast.success("Tarjeta guardada");
      setShowAgregarTarjeta(false); setSetupClientSecret(""); setSetupCardElement(null);
      await loadTarjetas();
    } catch (e: any) { toast.error(e.message); }
    finally { setGuardandoTarjeta(false); }
  };

  const handleEliminarTarjeta = async (pmId: string) => {
    try {
      await fetch(_API + "/api/stripe/payment-methods/" + pmId, { method: "DELETE" });
      setTarjetas(prev => prev.filter(c => c.id !== pmId));
      toast.success("Tarjeta eliminada");
    } catch { toast.error("Error al eliminar"); }
  };

  const productosFeedFiltrados = productosFeed.filter(p =>
    (subCategoria === "Todos" || p.categoria === subCategoria) &&
    (p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.negocio_nombre?.toLowerCase().includes(search.toLowerCase()))
  );
  const negociosFiltrados = negocios.filter(n => {
    const tipo = categoria === "comida" ? "restaurante" : "tienda";
    return n.tipo?.toLowerCase().includes(tipo) && n.nombre?.toLowerCase().includes(search.toLowerCase());
  });

  const statusColor: Record<string, string> = {
    nuevo: "bg-blue-500", preparando: "bg-orange-500", listo: "bg-yellow-500",
    en_camino: "bg-purple-500", entregado: "bg-green-500", cancelado: "bg-red-500"
  };
  const statusLabel: Record<string, string> = {
    nuevo: "Recibido", preparando: "Preparando", listo: "Listo",
    en_camino: "En camino", entregado: "Entregado", cancelado: "Cancelado"
  };

  if (window.location.pathname === "/sso-callback") return <AuthenticateWithRedirectCallback />;
  if (showSplash) return <AnimatePresence><SplashScreen onDone={() => setShowSplash(false)} /></AnimatePresence>;
  if (!isLoaded || !isSignedIn) return <LoginScreen />;
  if (showOnboarding) return <AnimatePresence><OnboardingFlow userName={user?.firstName || "amigo"} onDone={handleOnboardingDone} /></AnimatePresence>;
  if (showDirecciones) return <DireccionesScreen onBack={() => setShowDirecciones(false)} />;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <Toaster position="top-center" />
      <ServerWarmup />

      {/* NEGOCIO SELECCIONADO */}
      <AnimatePresence>
        {negocioSeleccionado && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
            <div className="h-48 relative shrink-0" style={{ background: GRAD }}>
              {negocioSeleccionado.imagen_url
                ? <img src={negocioSeleccionado.imagen_url} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={64} className="text-white/50" /></div>}
              <button onClick={() => setNegocioSeleccionado(null)}
                className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
                <ArrowLeft size={20} className="text-white" />
              </button>
              {cartCount > 0 && (
                <button onClick={() => setShowCart(true)}
                  className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
                  <ShoppingCart size={18} className="text-purple-600" />
                  <span className="font-black text-purple-600">{cartCount}</span>
                </button>
              )}
            </div>
            <div className="p-4 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-black text-slate-900">{negocioSeleccionado.nombre}</h2>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1"><Star size={14} className="text-yellow-400 fill-yellow-400" /><span className="text-sm font-bold">{Number(negocioSeleccionado.rating || 0).toFixed(1)}</span></div>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500">{negocioSeleccionado.tipo}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500">Envío $35</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
              {productos.length === 0
                ? <div className="text-center py-12 text-slate-400"><ShoppingBag size={40} className="mx-auto mb-3 opacity-30" /><p>Sin productos</p></div>
                : productos.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0 overflow-hidden">
                      {p.imagen_url ? <img src={p.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">{p.nombre}</p>
                      {p.descripcion && <p className="text-xs text-slate-500 line-clamp-2">{p.descripcion}</p>}
                      <p className="font-black mt-1" style={{ color: "#6C3CE1" }}>${Number(p.precio).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cart.find(i => i.productoId === p.id) && (
                        <>
                          <button onClick={() => removeFromCart(p.id)} className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Minus size={14} className="text-purple-600" />
                          </button>
                          <span className="font-black text-slate-900 w-4 text-center">{cart.find(i => i.productoId === p.id)?.cantidad}</span>
                        </>
                      )}
                      <button onClick={() => addToCart(p)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GRAD }}>
                        <Plus size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            {cartCount > 0 && (
              <div className="p-4 border-t bg-white shrink-0">
                <button onClick={() => setShowCart(true)} style={{ background: GRAD }}
                  className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-between px-6">
                  <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">{cartCount}</span>
                  <span>Ver pedido</span>
                  <span>${total.toFixed(2)}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARRITO */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black">Tu pedido</h3>
                <button onClick={() => setShowCart(false)}><X size={24} className="text-slate-400" /></button>
              </div>
              <div className="space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item.productoId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeFromCart(item.productoId)} className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <Minus size={12} className="text-purple-600" />
                        </button>
                        <span className="font-black text-slate-900 w-5 text-center text-sm">{item.cantidad}</span>
                        <button onClick={() => addToCart({ id: item.productoId, nombre: item.nombre, precio: item.precio })} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: GRAD }}>
                          <Plus size={12} className="text-white" />
                        </button>
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.nombre}</span>
                    </div>
                    <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 mb-3">
                <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-slate-500"><span>Envío</span><span>$35.00</span></div>
                <div className="flex justify-between text-sm text-slate-500"><span>Servicio</span><span>$8.50</span></div>
                <div className="flex justify-between font-black text-slate-900 text-lg"><span>Total</span><span>${(total + costoEnvio - (cuponAplicado?.descuento || 0)).toFixed(2)}</span></div>
                {cuponAplicado && <div className="flex justify-between text-sm text-green-600 font-bold"><span>Cupon {cuponAplicado.codigo}</span><span>-${cuponAplicado.descuento.toFixed(2)}</span></div>}
              </div>
              <div className="flex gap-2 mb-3">
                <input value={cuponCodigo} onChange={e => { setCuponCodigo(e.target.value.toUpperCase()); setCuponError(""); }}
                  placeholder="Codigo de cupon"
                  className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-purple-400 font-medium" />
                <button onClick={async () => {
                  if (!cuponCodigo.trim()) return
                  setCuponLoading(true); setCuponError("")
                  try {
                    const r = await fetch(_API + "/api/usuario/cupones/validar", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ codigo: cuponCodigo.trim(), total: total + costoEnvio, negocioId: negocioSeleccionado?.id })
                    })
                    const d = await r.json()
                    if (!r.ok) { setCuponError(d.error || "Cupon invalido"); return }
                    setCuponAplicado(d)
                    toast.success("Cupon aplicado: -$" + d.descuento.toFixed(2))
                  } catch { setCuponError("Error al validar") }
                  finally { setCuponLoading(false) }
                }} disabled={cuponLoading || !!cuponAplicado}
                  className="px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50"
                  style={{ background: GRAD }}>
                  {cuponLoading ? "..." : cuponAplicado ? "OK" : "Aplicar"}
                </button>
                {cuponAplicado && <button onClick={() => { setCuponAplicado(null); setCuponCodigo(""); }} className="px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 border border-red-200">X</button>}
              </div>
              {cuponError && <p className="text-xs text-red-500 font-bold -mt-2 mb-3">{cuponError}</p>}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  {metodoPago === "efectivo" ? <Banknote size={18} className="text-slate-600" /> : <CreditCard size={18} className="text-slate-600" />}
                  <span className="text-sm font-bold text-slate-600">{metodoPago === "efectivo" ? "Pago en efectivo" : "Pago con tarjeta"}</span>
                </div>
                <button onClick={() => { const n = metodoPago === "efectivo" ? "tarjeta" : "efectivo"; setMetodoPago(n); localStorage.setItem("ya_voy_pago", n); }}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 bg-white">
                  Cambiar
                </button>
              </div>
              {direccionPrincipal && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl mb-4">
                  <MapPin size={18} className="text-purple-600" />
                  <span className="text-sm font-medium text-slate-600 truncate">{direccionPrincipal.label}: {direccionPrincipal.direccion}</span>
                </div>
              )}
              <button onClick={handlePedir} disabled={loading} style={{ background: GRAD }}
                className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={20} /> : null}
                Confirmar pedido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETALLE PEDIDO */}
      <AnimatePresence>
        {pedidoDetalle && (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
            className="fixed inset-0 bg-white z-50 flex flex-col overflow-y-auto">
            <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0">
              <button onClick={() => setPedidoDetalle(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <h1 className="font-black text-slate-900">Detalle del pedido</h1>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-slate-900 text-lg">{pedidoDetalle.negocio_nombre}</h2>
                  <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white ${statusColor[pedidoDetalle.status] || "bg-slate-400"}`}>
                    {statusLabel[pedidoDetalle.status] || pedidoDetalle.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{new Date(pedidoDetalle.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Productos</p>
                <div className="space-y-2">
                  {(Array.isArray(pedidoDetalle.items) ? pedidoDetalle.items : []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.cantidad}x {item.nombre}</span>
                      <span className="font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 mt-3 pt-3 space-y-1">
                  <div className="flex justify-between text-sm text-slate-500"><span>Envío</span><span>$35.00</span></div>
                  <div className="flex justify-between text-sm text-slate-500"><span>Servicio</span><span>$8.50</span></div>
                  <div className="flex justify-between font-black text-slate-900 text-base mt-1"><span>Total</span><span>${Number(pedidoDetalle.total).toFixed(2)}</span></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entrega</p>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-purple-600 shrink-0" />
                  <p className="text-sm text-slate-700">{pedidoDetalle.direccion_entrega}</p>
                </div>
              </div>
              {pedidoDetalle.status === "en_camino" && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-xl">🛵</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-purple-600 uppercase tracking-wider">En camino</p>
                    <p className="text-sm font-bold text-slate-700">El repartidor va hacia ti</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pedidoDetalle.repartidor_rating && Number(pedidoDetalle.repartidor_rating) < 5 ? "⭐ " + Number(pedidoDetalle.repartidor_rating).toFixed(1) + " calificacion" : "⭐ Nuevo repartidor"}</p>
                    {repUbicacion ? (
                      <a href={`https://www.google.com/maps?q=${repUbicacion.lat},${repUbicacion.lng}`} target="_blank" rel="noreferrer"
                        className="text-xs text-purple-500 font-bold underline mt-0.5 block">
                        📍 Ver ubicación del repartidor
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">Tiempo estimado: {pedidoDetalle.tiempo_estimado || "15-30 min"}</p>
                    )}
                  </div>
                </div>
              )}
              {pedidoDetalle.status === "preparando" && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-xl">👨‍🍳</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-orange-600 uppercase tracking-wider">Preparando</p>
                    <p className="text-sm font-bold text-slate-700">El restaurante esta preparando tu orden</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tiempo estimado: {pedidoDetalle.tiempo_estimado || "10-20 min"}</p>
                  </div>
                </div>
              )}
              {pedidoDetalle.status === "listo" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0"><span className="text-xl">📦</span></div>
                  <div><p className="text-xs font-black text-yellow-600 uppercase tracking-wider">Listo</p>
                  <p className="text-sm font-bold text-slate-700">Tu pedido esta listo — esperando repartidor</p></div>
                </div>
              )}
              {pedidoDetalle.status === "nuevo" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-xl">⏳</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Recibido</p>
                    <p className="text-sm font-bold text-slate-700">Esperando confirmacion del restaurante</p>
                  </div>
                </div>
              )}
              {["nuevo","preparando"].includes(pedidoDetalle.status) && (
                <button onClick={() => { setShowCancelar(true); setCancelRazon("") }}
                  className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 font-bold text-sm mt-2 mb-2">
                  ✕ Cancelar pedido
                </button>
              )}
              {["en_camino","esperando_cliente"].includes(pedidoDetalle.status) && (
                <button onClick={() => abrirChatUsuario(pedidoDetalle.id)}
                  className="relative w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-purple-200 text-purple-600 bg-purple-50">
                  <MessageSquare size={18} /> Chatear con el repartidor
                  {(chatNoLeidos[pedidoDetalle.id] || 0) > 0 && (
                    <span className="absolute top-2 right-3 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">
                      {chatNoLeidos[pedidoDetalle.id]}
                    </span>
                  )}
                </button>
              )}
              {pedidoDetalle.status === 'en_camino' && !codigoConfirmado && codigoOpciones.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-purple-200 p-4">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">El repartidor llego — muestra tu palabra</p>
                  <p className="text-sm text-slate-600 mb-3">Muestra UNA de estas palabras al repartidor. El repartidor la seleccionara en su app para confirmar la entrega:</p>
                  <div className="space-y-2">
                    {codigoOpciones.map(op => (
                      <button key={op} onClick={async () => { await fetch(`${_API}/api/usuario/pedidos/confirmar`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pedidoId: pedidoDetalle.id, codigo: op }) }); if (op === pedidoDetalle.codigo_entrega) { setCodigoConfirmado(true); setPedidoDetalle((p: any) => ({ ...p, status: 'entregado' })); toast.success('¡Pedido entregado!'); setTimeout(() => setShowRating(true), 800); } else { toast.error('Código incorrecto'); } }}
                        className="w-full py-3 rounded-xl font-black text-lg tracking-widest border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-slate-700">
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(pedidoDetalle.status === 'entregado' || codigoConfirmado) && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl mb-1">✅</p>
                  <p className="font-black text-green-700">¡Pedido entregado!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>




      {/* BANNER ESPERA REPARTIDOR */}
      {esperandoTimer !== null && (
        <motion.div initial={{ y: -80 }} animate={{ y: 0 }}
          className="fixed top-0 left-0 right-0 z-[80] bg-amber-500 text-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-sm">🛵 El repartidor esta en tu puerta</p>
              <p className="text-xs opacity-90">Sal a recibir tu pedido — {Math.floor(esperandoTimer/60)}:{String(esperandoTimer%60).padStart(2,"0")} — si no sales, el pedido se marca entregado sin reembolso</p>
            </div>
            <div className="text-2xl font-black tabular-nums">
              {Math.floor(esperandoTimer/60)}:{String(esperandoTimer%60).padStart(2,"0")}
            </div>
          </div>
          {esperandoTimer === 0 && (
            <p className="text-xs font-bold mt-1 text-amber-100">Tiempo agotado — el pedido se marcó como entregado sin reembolso</p>
          )}
        </motion.div>
      )}

      {/* MODAL RATING */}
      <AnimatePresence>
        {showRating && pedidoDetalle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[70] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 space-y-5">
              <div className="text-center">
                <div className="text-4xl mb-2">⭐</div>
                <h2 className="font-black text-xl text-slate-900">¿Cómo te fue?</h2>
                <p className="text-sm text-slate-500 mt-1">Tu opinión ayuda a mejorar el servicio</p>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="font-bold text-slate-700 mb-3 text-sm">🍽️ Restaurante</p>
                  <div className="flex justify-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setRatingRest(i)} className="p-1 transition-transform hover:scale-110">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill={i <= ratingRest ? "#F59E0B" : "none"} stroke={i <= ratingRest ? "#F59E0B" : "#CBD5E1"} strokeWidth="1.5">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  {ratingRest > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(ratingRest <= 2
                        ? ["Tardaron mucho","Comida fria","Orden incorrecta","Mala atencion"]
                        : ratingRest === 3
                        ? ["Bien en general","Podria mejorar","Comida correcta"]
                        : ["Excelente comida","Rapido","Todo perfecto","Lo recomiendo"]
                      ).map(frase => (
                        <button key={frase} onClick={() => setRatingRestFrase(frase)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${ratingRestFrase === frase ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500"}`}>
                          {frase}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-3 text-sm">🛵 Repartidor</p>
                  <div className="flex justify-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setRatingRep(i)} className="p-1 transition-transform hover:scale-110">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill={i <= ratingRep ? "#F59E0B" : "none"} stroke={i <= ratingRep ? "#F59E0B" : "#CBD5E1"} strokeWidth="1.5">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  {ratingRep > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(ratingRep <= 2
                        ? ["Llego tarde","Mala actitud","Comida danada","No siguio instrucciones"]
                        : ratingRep === 3
                        ? ["Bien en general","Entrega correcta","Puntual"]
                        : ["Muy amable","Entrega rapida","Excelente servicio","Lo recomiendo"]
                      ).map(frase => (
                        <button key={frase} onClick={() => setRatingRepFrase(frase)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${ratingRepFrase === frase ? "border-pink-500 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-500"}`}>
                          {frase}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={async () => {
                if (ratingRest && ratingRep) {
                  await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/usuario/pedidos/${pedidoDetalle.id}/rating`, {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating_restaurante: ratingRest, rating_repartidor: ratingRep, comentario_rating: [ratingRestFrase, ratingRepFrase].filter(Boolean).join(" | ") })
                  });
                  setShowRating(false); setRatingRest(0); setRatingRep(0); setRatingRestFrase(""); setRatingRepFrase(""); toast.success("Gracias por tu calificacion!");
                } else { toast.error("Califica ambos para continuar"); }
              }} className="w-full py-4 rounded-2xl text-white font-black text-lg" style={{ background: GRAD }}>
                Enviar calificación
              </button>
              <button onClick={() => setShowRating(false)} className="w-full py-2 text-slate-400 text-sm font-bold">
                Omitir
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PRODUCTO */}
      <AnimatePresence>
        {productoSeleccionado && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="relative h-52 shrink-0">
                {productoSeleccionado.imagen_url
                  ? <img src={productoSeleccionado.imagen_url} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: GRAD }}>🍽️</div>}
                <button onClick={() => setProductoSeleccionado(null)}
                  className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center">
                  <X size={18} className="text-white" />
                </button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-black text-xl text-slate-900 flex-1">{productoSeleccionado.nombre}</h2>
                  <span className="font-black text-xl ml-3" style={{ color: "#6C3CE1" }}>${Number(productoSeleccionado.precio).toFixed(2)}</span>
                </div>
                {productoSeleccionado.descripcion && (
                  <p className="text-slate-500 text-sm mb-4 leading-relaxed">{productoSeleccionado.descripcion}</p>
                )}
                <button onClick={() => { openNegocio({ id: productoSeleccionado.negocio_id, nombre: productoSeleccionado.negocio_nombre, imagen_url: productoSeleccionado.negocio_imagen, rating: productoSeleccionado.negocio_rating, tipo: "restaurante" }); setProductoSeleccionado(null); }}
                  className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm mb-3 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  🏪 Ver todos los productos de {productoSeleccionado.negocio_nombre}
                </button>
              </div>
              <div className="p-4 border-t bg-white shrink-0">
                <button onClick={() => { addToCart({ id: productoSeleccionado.id, nombre: productoSeleccionado.nombre, precio: productoSeleccionado.precio, negocioId: productoSeleccionado.negocio_id }); setProductoSeleccionado(null); }}
                  className="w-full py-4 rounded-2xl text-white font-black text-lg flex items-center justify-center gap-2"
                  style={{ background: GRAD }}>
                  <Plus size={20} /> Agregar al carrito
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowDirecciones(true)} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: GRAD }}>
              <MapPin size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Entregar en</p>
              <div className="flex items-center gap-1">
                <p className="font-black text-slate-900 text-sm">{direccionPrincipal?.label || "Mi ubicación"}</p>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {cartCount > 0 && (
              <button onClick={() => setShowCart(true)} className="relative p-2">
                <ShoppingCart size={22} className="text-slate-600" />
                <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-[10px] font-black rounded-full flex items-center justify-center" style={{ background: "#6C3CE1" }}>{cartCount}</span>
              </button>
            )}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-100 border-2 border-purple-200">
              {user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <User size={18} className="text-purple-600 m-auto mt-1" />}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* HOME */}
          {tab === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              {/* Categorias grandes */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "comida", label: "COMIDA", icon: Utensils },
                  { id: "tienda", label: "TIENDA", icon: Store },
                  { id: "envio", label: "ENVÍO", icon: Package },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => { setCategoria(id as any); setSubCategoria("Todos"); }}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${categoria === id ? "text-white shadow-lg" : "bg-white border border-slate-100 text-slate-500"}`}
                    style={categoria === id ? { background: GRAD } : {}}>
                    <Icon size={28} />
                    <span className="text-[11px] font-black tracking-wider">{label}</span>
                  </button>
                ))}
              </div>

              {/* ENVÍO próximamente */}
              {categoria === "envio" && (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f3f0ff" }}>
                    <Package size={40} style={{ color: "#6C3CE1" }} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Envío de Paquetes</h2>
                  <p className="text-slate-500 text-sm mb-4">Envía lo que quieras a donde quieras de forma segura y rápida.</p>
                  <span className="px-6 py-3 rounded-full font-black text-white text-sm" style={{ background: GRAD }}>PRÓXIMAMENTE</span>
                </div>
              )}

              {/* Sub-categorias */}
              {categoria !== "envio" && (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {subCategorias[categoria].map(s => (
                      <button key={s} onClick={() => setSubCategoria(s)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0 ${subCategoria === s ? "text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                        style={subCategoria === s ? { background: GRAD } : {}}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Negocios */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin" size={32} style={{ color: "#6C3CE1" }} />
                    </div>
                  ) : negociosFiltrados.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No hay negocios disponibles</p>
                      <p className="text-sm mt-1">Intenta más tarde o activa tu ubicación</p>
                    </div>
                                    ) : categoria === "comida" ? (
                    productosFeedFiltrados.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No hay platillos disponibles</p>
                      </div>
                    ) : productosFeedFiltrados.map(p => (
                      <div key={p.id} onClick={() => setProductoSeleccionado(p)}
                        className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden mb-3 text-left hover:shadow-md transition-all flex items-center gap-3 p-3 cursor-pointer">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                          {p.imagen_url ? <img src={p.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-900 truncate">{p.nombre}</h4>
                          <p className="text-xs text-slate-400 truncate">{p.negocio_nombre}</p>
                          <p className="font-black text-base mt-0.5" style={{ color: "#6C3CE1" }}>${Number(p.precio).toFixed(2)}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); addToCart({ id: p.id, nombre: p.nombre, precio: p.precio, negocioId: p.negocio_id }); }}
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: GRAD }}>
                          <Plus size={16} />
                        </button>
                      </div>
                    ))
                  ) : negociosFiltrados.map(n => (
                    <button key={n.id} onClick={() => openNegocio(n)}
                      className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden mb-3 text-left hover:shadow-md transition-all flex items-center gap-3 p-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: GRAD }}>
                        {n.imagen_url ? <img src={n.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 truncate">{n.nombre}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1"><Star size={11} className="text-yellow-400 fill-yellow-400" /><span className="text-xs font-bold text-slate-600">{Number(n.rating || 0).toFixed(1)}</span></div>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">Envío $35</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                </>
              )}
            </motion.div>
          )}

          {/* EXPLORAR */}
          {tab === "explorar" && (
            <motion.div key="explorar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-2xl font-black text-slate-900">Explorador</h2>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Busca comida, tiendas o productos..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 shadow-sm" />
              </div>
              {negocios.filter(n => n.nombre?.toLowerCase().includes(search.toLowerCase())).map(n => (
                <button key={n.id} onClick={() => { openNegocio(n); }}
                  className="w-full bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 text-left hover:shadow-sm transition-all">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: GRAD }}>
                    {n.imagen_url ? <img src={n.imagen_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">{n.nombre}</p>
                    <p className="text-xs text-slate-500">{n.tipo} · Envío $35</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              ))}
              {search && negocios.filter(n => n.nombre?.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Search size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin resultados para "{search}"</p>
                </div>
              )}
            </motion.div>
          )}

          {/* PEDIDOS */}
          {tab === "pedidos" && (
            <motion.div key="pedidos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
              <h2 className="text-2xl font-black text-slate-900">Tus Pedidos</h2>
              {pedidos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sin pedidos aún</p>
                  <button onClick={() => setTab("home")} className="mt-4 px-6 py-2 rounded-full text-white text-sm font-bold" style={{ background: GRAD }}>
                    Pedir ahora
                  </button>
                </div>
              ) : pedidos.map(p => (
                <div key={p.id} className='w-full space-y-1'>
                <button onClick={() => { setPedidoDetalle(p); setCodigoConfirmado(false); if (p.status === 'en_camino') { const pv = p.palabras_verificacion; const ops = (pv && pv.entrega && pv.entrega.length === 3) ? pv.entrega : (() => { const PALABRAS = ["TIGRE","LUNA","SOL","PUMA","RAYO","NUBE","MAR","RIO","VIENTO","FUEGO","TIERRA","AGUILA","LOBO","OSO","ZORRO","LEON","TORO","COBRA","FLOR","ROCA","PIEDRA","AGUA","BRISA","MONTE","CIELO"]; const falsas = PALABRAS.filter(w => w !== p.codigo_entrega).sort(() => Math.random()-0.5).slice(0,2); return [p.codigo_entrega, falsas[0], falsas[1]].sort(() => Math.random()-0.5); })(); setCodigoOpciones(ops); } }}
                  className="w-full bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 text-left hover:shadow-sm transition-all">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                    {p.negocio_imagen ? <img src={p.negocio_imagen} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 truncate">{p.negocio_nombre || "Negocio"}</p>
                    <p className="text-xs text-slate-500">{new Date(p.creado_en).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">${Number(p.total).toFixed(2)}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full text-white shrink-0 ${statusColor[p.status] || "bg-slate-400"}`}>
                    {statusLabel[p.status] || p.status}
                  </span>
                </button>
                {p.status === "entregado" && (
                  <button onClick={async (e) => {
                    e.stopPropagation()
                    const negocio = negocios.find((n:any) => n.id === p.negocio_id) || { id: p.negocio_id, nombre: p.negocio_nombre, imagen: p.negocio_imagen }
                    setNegocioSeleccionado(negocio)
                    calcularEnvio(negocio)
                    const prods = await fetch(import.meta.env.VITE_API_URL + "/api/productos/" + p.negocio_id).then(r => r.json()).catch(() => [])
                    setProductos(Array.isArray(prods) ? prods : [])
                    const itemsAnteriores = p.items || []
                    const carritoNuevo = itemsAnteriores.map((it:any) => ({ id: it.id || it.nombre, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad || 1, imagen: it.imagen }))
                    setCart(carritoNuevo)
                    setShowCart(true)
                    setTab("home")
                    toast.success("Pedido anterior cargado al carrito")
                  }} className="w-full mt-1 py-2 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1" style={{ background: "linear-gradient(135deg,#6C3CE1,#E91E8C)" }}>
                    <RefreshCw size={12} /> Pedir de nuevo
                  </button>
                )}
                </div>
              ))}
            </motion.div>
          )}

          {/* PERFIL */}
          {tab === "perfil" && (
            <motion.div key="perfil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              {/* Header perfil */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col items-center text-center">
                <div className="relative w-20 h-20 mb-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-purple-200">
                    {fotoPerfil ? <img src={fotoPerfil} className="w-full h-full object-cover" /> : user?.imageUrl ? <img src={user.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-purple-100 flex items-center justify-center"><User size={36} className="text-purple-600" /></div>}
                  </div>
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                    {subiendoFoto ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return
                      setSubiendoFoto(true)
                      try {
                        const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
                        const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd })
                        const d = await r.json()
                        if (d.secure_url) {
                          setFotoPerfil(d.secure_url)
                          await fetch(_API + "/api/usuario/perfil/" + userId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto_perfil: d.secure_url }) })
                          toast.success("Foto actualizada")
                        }
                      } catch { toast.error("Error al subir foto") }
                      finally { setSubiendoFoto(false) }
                    }} />
                  </label>
                </div>
                <p className="font-black text-slate-900 text-xl">{user?.fullName || "Usuario"}</p>
                <p className="text-sm text-slate-500 mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>

              {/* Secciones */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <button onClick={() => setShowDirecciones(true)}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                    <MapPin size={18} className="text-purple-600" />
                  </div>
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
                    setMetodoPago(nuevo);
                    localStorage.setItem("ya_voy_pago", nuevo);
                  }} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600">
                    Cambiar
                  </button>
                </div>

                <button onClick={handleAbrirTarjetas}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CreditCard size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-slate-900 text-sm">Mis tarjetas</p>
                    <p className="text-xs text-slate-500">{tarjetas.length > 0 ? tarjetas.length + " tarjeta" + (tarjetas.length !== 1 ? "s" : "") + " guardada" + (tarjetas.length !== 1 ? "s" : "") : "Sin tarjetas guardadas"}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>

                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Bell size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Notificaciones</p>
                    <p className="text-xs text-slate-500">Recibe alertas de tus pedidos</p>
                  </div>
                  <button onClick={() => {
                    setNotificaciones(!notificaciones);
                    localStorage.setItem("ya_voy_notif", notificaciones ? "0" : "1");
                  }} className={`w-12 h-6 rounded-full transition-all relative ${notificaciones ? "" : "bg-slate-200"}`}
                    style={notificaciones ? { background: GRAD } : {}}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${notificaciones ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="px-4 py-4 flex items-center gap-3 border-t border-slate-50">
                  <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-lg">🌙</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Modo oscuro</p>
                    <p className="text-xs text-slate-500">Cambia la apariencia de la app</p>
                  </div>
                  <button onClick={() => {
                    const next = !darkMode
                    setDarkMode(next)
                    localStorage.setItem("ya_voy_dark", next ? "1" : "0")
                    document.documentElement.classList.toggle("dark", next)
                  }} className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? "" : "bg-slate-200"}`}
                    style={darkMode ? { background: GRAD } : {}}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${darkMode ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <button onClick={() => setShowSoporte(true)} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50"><div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"><HelpCircle size={18} className="text-slate-500" /></div><p className="font-bold text-slate-900 text-sm">Ayuda y soporte</p><ChevronRight size={18} className="text-slate-300 ml-auto" /></button>
                <button onClick={() => window.open("https://batallagroup-tech.github.io/ya-voy/","_blank")} className="w-full px-4 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all"><div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"><FileText size={18} className="text-slate-500" /></div><p className="font-bold text-slate-900 text-sm">Términos y condiciones</p><ChevronRight size={18} className="text-slate-300 ml-auto" /></button>
              </div>

              <button onClick={() => signOut()}
                className="w-full py-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                <LogOut size={18} /> Cerrar sesión
              </button>

              <button onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 bg-red-50 rounded-2xl flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-100 transition-all">
                <Trash2 size={18} /> Eliminar cuenta
              </button>

              <p className="text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
                Desarrollado por <span className="text-slate-400">Batalla Group</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL CHAT USUARIO */}
      <AnimatePresence>
        {showChatPedido && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[95] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl flex flex-col" style={{ maxHeight: "80vh" }}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-500" /> Chat con el repartidor
                </h3>
                <button onClick={cerrarChatUsuario}><X size={22} className="text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {chatMensajes.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">Sin mensajes aún</p>
                )}
                {chatMensajes.map(m => (
                  <div key={m.id} className={`flex ${m.remitente_tipo === "usuario" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm font-medium ${m.remitente_tipo === "usuario" ? "text-white rounded-br-sm" : "bg-slate-100 text-slate-900 rounded-bl-sm"}`}
                      style={m.remitente_tipo === "usuario" ? { background: GRAD } : {}}>
                      {m.texto}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100 shrink-0 flex gap-2">
                <input value={chatTexto} onChange={e => setChatTexto(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarChatMensaje()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-sm border border-slate-200 outline-none focus:border-purple-400" />
                <button onClick={enviarChatMensaje} disabled={chatEnviando || !chatTexto.trim()}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
                  style={{ background: GRAD }}>
                  {chatEnviando ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL TARJETAS */}
      <AnimatePresence>
        {showTarjetas && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Mis tarjetas</h3>
                <button onClick={() => setShowTarjetas(false)}><X size={22} className="text-slate-400" /></button>
              </div>
              {tarjetasLoading ? (
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
                        {card.brand === "visa" ? "VISA" : card.brand === "mastercard" ? "MC" : card.brand?.toUpperCase()?.slice(0,4)}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-900 text-sm">•••• •••• •••• {card.last4}</p>
                        <p className="text-xs text-slate-500">Vence {card.exp_month}/{card.exp_year}</p>
                      </div>
                      <button onClick={() => handleEliminarTarjeta(card.id)}
                        className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <X size={14} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleAgregarTarjeta} style={{ background: GRAD }}
                className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2">
                <CreditCard size={20} /> Agregar tarjeta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL AGREGAR TARJETA */}
      <AnimatePresence>
        {showAgregarTarjeta && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[90] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} className="bg-white w-full rounded-t-3xl p-6 space-y-4 overflow-y-auto" style={{ maxHeight: "90vh" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Agregar tarjeta</h3>
                <button onClick={() => { setShowAgregarTarjeta(false); setSetupClientSecret(""); setSetupCardElement(null); }}>
                  <X size={22} className="text-slate-400" />
                </button>
              </div>
              <div id="stripe-setup-element" className="min-h-[200px]" />
              <button onClick={handleConfirmarTarjeta} disabled={guardandoTarjeta} style={{ background: GRAD }}
                className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                {guardandoTarjeta ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                {guardandoTarjeta ? "Guardando..." : "Guardar tarjeta"}
              </button>
              <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">⚠️ Al guardar tu tarjeta se realizara un cargo temporal de $1 MXN para verificarla. Este cargo se revierte automaticamente en 1-7 dias habiles.</p>
            </motion.div>
              <p className="text-center text-xs text-slate-400">Pago seguro procesado por Stripe</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pt-2 z-40" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex justify-around">
          {[
            { id: "home", label: "¡YA VOY!", icon: ShoppingBag },
            { id: "explorar", label: "Explorar", icon: Search },
            { id: "pedidos", label: "Pedidos", icon: Clock },
            { id: "perfil", label: "Perfil", icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id as any); if (id === "home") { loadProductosFeed(); loadNegocios(); } }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all ${tab === id ? "text-purple-600" : "text-slate-400"}`}>
              <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
              <span className={`text-[9px] font-black uppercase tracking-tight ${tab === id ? "opacity-100" : "opacity-60"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MODAL STRIPE WEB */}
      <AnimatePresence>
        {showStripeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Pago con tarjeta</h3>
                <button onClick={() => { setShowStripeModal(false); setStripeClientSecret(""); setPendingPedidoData(null); }}><X size={22} className="text-slate-400" /></button>
              </div>
              <div className="text-center pb-1">
                <p className="font-black text-2xl text-slate-900">${String((pendingPedidoData?.total || 0).toFixed(2))} <span className="text-sm font-bold text-slate-400">MXN</span></p>
              </div>
              <div id="stripe-payment-element" className="min-h-[120px]" />
              <button onClick={handleConfirmarPagoWeb} disabled={stripePagoLoading}
                style={{ background: "linear-gradient(135deg, #6C3CE1 0%, #9B59B6 50%, #E91E8C 100%)" }}
                className="w-full py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                {stripePagoLoading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                {stripePagoLoading ? "Procesando..." : "Pagar ahora"}
              </button>
              <p className="text-center text-xs text-slate-400">Pago seguro procesado por Stripe</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL SOPORTE */}
      <AnimatePresence>
        {showSoporte && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Ayuda y soporte</h3>
                <button onClick={() => { setShowSoporte(false); setSoporteTipo(""); setSoporteComentario(""); }}><X size={22} className="text-slate-400" /></button>
              </div>
              <p className="text-sm text-slate-500">Selecciona el motivo de tu reporte:</p>
              <div className="space-y-2">
                {["Mi pedido no llego","El repartidor no llego","Producto incorrecto o en mal estado","Cobro incorrecto","El restaurante no acepto mi pedido","Otro"].map(op => (
                  <button key={op} onClick={() => setSoporteTipo(op)}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-left border-2 transition-all ${soporteTipo === op ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-100 text-slate-700 bg-slate-50"}`}>
                    {op}
                  </button>
                ))}
              </div>
              {soporteTipo && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Comentario adicional (opcional)</label>
                  <textarea value={soporteComentario} onChange={e => setSoporteComentario(e.target.value)}
                    placeholder="Describe tu problema..."
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 resize-none h-24" />
                </div>
              )}
              <button onClick={async () => {
                if (!soporteTipo) { toast.error("Selecciona un motivo"); return; }
                setSoporteLoading(true);
                try {
                  await fetch(`${_API}/api/soporte`, { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ usuarioId: userId, usuarioEmail: user?.primaryEmailAddress?.emailAddress, usuarioNombre: user?.fullName, tipo: soporteTipo, comentario: soporteComentario }) });
                  toast.success("Reporte enviado. Te contactaremos pronto.");
                  setShowSoporte(false); setSoporteTipo(""); setSoporteComentario("");
              {appConfig.whatsapp && (
                <a href={appConfig.whatsapp} target="_blank" rel="noreferrer"
                  className="w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 bg-green-500">
                  💬 Contactar por WhatsApp
                </a>
              )}
                } catch { toast.error("Error al enviar reporte"); }
                finally { setSoporteLoading(false); }
              }} disabled={!soporteTipo || soporteLoading} style={{ background: GRAD }}
                className="w-full py-4 text-white font-black rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {soporteLoading ? <Loader2 className="animate-spin" size={20} /> : null}
                Enviar reporte
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM */}
      {/* MODAL CANCELAR CON RAZON */}
      <AnimatePresence>
        {showCancelar && pedidoDetalle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[75] flex items-end">
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              className="bg-white w-full rounded-t-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Cancelar pedido</h3>
                <button onClick={() => setShowCancelar(false)}><X size={22} className="text-slate-400" /></button>
              </div>
              <p className="text-sm text-slate-500">Selecciona el motivo de cancelacion:</p>
              <div className="space-y-2">
                {["Me equivoque al pedir","Tarde demasiado","Cambie de opinion","El restaurante no responde","Otro"].map(op => (
                  <button key={op} onClick={() => setCancelRazon(op)}
                    className={"w-full px-4 py-3 rounded-xl text-sm font-bold text-left border-2 transition-all " + (cancelRazon === op ? "border-red-400 bg-red-50 text-red-700" : "border-slate-100 text-slate-700 bg-slate-50")}>
                    {op}
                  </button>
                ))}
              </div>
              <button onClick={async () => {
                if (!cancelRazon) { toast.error("Selecciona un motivo"); return }
                setCancelLoading(true)
                try {
                  await fetch(_API + "/api/usuario/pedidos/" + pedidoDetalle.id + "/cancelar", {
                    method: "PATCH", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ razon: cancelRazon })
                  })
                  setPedidoDetalle((p: any) => ({...p, status: "cancelado"}))
                  setPedidos((prev: any[]) => prev.map((o: any) => o.id === pedidoDetalle.id ? {...o, status:"cancelado"} : o))
                  setShowCancelar(false)
                  toast.success("Pedido cancelado")
                } catch { toast.error("No se pudo cancelar") }
                finally { setCancelLoading(false) }
              }} disabled={!cancelRazon || cancelLoading}
                className="w-full py-4 rounded-2xl text-white font-black disabled:opacity-50 flex items-center justify-center gap-2 bg-red-500">
                {cancelLoading ? <Loader2 className="animate-spin" size={20} /> : null}
                Confirmar cancelacion
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">¿Eliminar cuenta?</h3>
              <p className="text-sm text-slate-500 mb-6">Se eliminarán todos tus datos, pedidos y direcciones. Esta acción es permanente.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancelar</button>
                <button onClick={handleDeleteAccount}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl">Eliminar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
