import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useAuth, useUser, useClerk, AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { AnimatePresence } from "motion/react";
import { ShoppingBag, Search, Clock, User, MapPin, ChevronDown, ShoppingCart, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Stripe, PaymentSheetEventsEnum } from "@capacitor-community/stripe";
import { Capacitor } from "@capacitor/core";
import { AdMob, BannerAdSize, BannerAdPosition } from "@capacitor-community/admob";
import { syncUsuario, getNegocios, getProductos, crearPedido, getPedidos, getProductosFeed, getFavoritos, addFavorito, removeFavorito } from "./lib/api";
import { hapticSuccess, hapticError, hapticLight } from "./lib/haptics";
import { GRAD, API } from "./lib/constants";
import type { CartItem } from "./lib/constants";
import type { Negocio, Producto, Pedido, AppConfig } from "./types";

// Carga síncrona — necesaria para el flujo inicial antes de auth
import LoginScreen from "./components/LoginScreen";
import SplashScreen from "./components/SplashScreen";
import ServerWarmup from "./components/ServerWarmup";
import OnboardingFlow from "./components/OnboardingFlow";
import DireccionesScreen, { type Direccion } from "./components/DireccionesScreen";
import { TabErrorBoundary } from "./components/ErrorBoundary";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { usePedidosWS } from "./hooks/usePedidosWS";
import { useNetworkStatus } from "./hooks/useNetworkStatus";

// Code splitting — se cargan solo cuando se necesitan
const NegocioScreen    = lazy(() => import("./screens/NegocioScreen"));
const PedidoDetalle    = lazy(() => import("./screens/PedidoDetalle"));
const EsperandoBanner  = lazy(() => import("./modals/EsperandoBanner"));
const ProductoModal    = lazy(() => import("./modals/ProductoModal"));
const CartSheet        = lazy(() => import("./modals/CartSheet"));
const StripePagoModal  = lazy(() => import("./modals/StripePagoModal"));
const ChatModal        = lazy(() => import("./modals/ChatModal"));
const TarjetasModal    = lazy(() => import("./modals/TarjetasModal"));
const SoporteModal     = lazy(() => import("./modals/SoporteModal"));
const RatingModal      = lazy(() => import("./modals/RatingModal"));
const CancelarModal    = lazy(() => import("./modals/CancelarModal"));
const DeleteConfirmModal = lazy(() => import("./modals/DeleteConfirmModal"));
const HomeTab          = lazy(() => import("./tabs/HomeTab"));
const ExplorarTab      = lazy(() => import("./tabs/ExplorarTab"));
const PedidosTab       = lazy(() => import("./tabs/PedidosTab"));
const PerfilTab        = lazy(() => import("./tabs/PerfilTab"));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-purple-400" />
    </div>
  );
}

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const ADMOB_BANNER_ID = "ca-app-pub-3849768825456219/7317936592";

export default function App() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const isOnline = useNetworkStatus();
  const { user } = useUser();
  const { signOut } = useClerk();
  usePushNotifications({
    userId,
    getToken,
    onNotification: async (data) => {
      const pedidoId = data?.pedidoId;
      if (!pedidoId) return;
      let pedido = pedidos.find(p => p.id === pedidoId);
      if (!pedido) {
        try {
          const tok = await getToken();
          pedido = await import("./lib/api").then(m => m.getPedidoById(pedidoId, tok!)) as any;
        } catch { return; }
      }
      if (!pedido) return;
      setTab("pedidos");
      handlePedidoClick(pedido);
    },
  });

  // Navigation
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDirecciones, setShowDirecciones] = useState(false);
  const [tab, setTab] = useState<"home" | "explorar" | "pedidos" | "perfil">("home");
  const [categoria, setCategoria] = useState<"comida" | "tienda" | "envio">("comida");
  const [subCategoria, setSubCategoria] = useState("Todos");

  // Data
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [productosFeed, setProductosFeed] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosOffset, setPedidosOffset] = useState(0);
  const [pedidosHayMas, setPedidosHayMas] = useState(false);
  const [pedidosMasLoading, setPedidosMasLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(false);
  const [pedidosLoading, setPedidosLoading] = useState(false);

  // Cart / negocio
  const [negocioSeleccionado, setNegocioSeleccionado] = useState<Negocio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  // Payment
  const [metodoPago, setMetodoPago] = useState(() => localStorage.getItem("ya_voy_pago") || "efectivo");
  const [costoEnvio, setCostoEnvio] = useState(35);
  const [costoEnvioLoading, setCostoEnvioLoading] = useState(false);
  const [tiempoEstimado, setTiempoEstimado] = useState("");
  const [propina, setPropina] = useState(() => { const v = Number(localStorage.getItem("ya_voy_propina")); return isNaN(v) || v < 0 ? 0 : v; });
  const [stripePaymentData, setStripePaymentData] = useState<{ clientSecret: string; pedidoData: any; token: string } | null>(null);
  const [tarjetas, setTarjetas] = useState<any[]>([]);

  // Favoritos
  const [favoritos, setFavoritos] = useState<Negocio[]>([]);
  const [favoritosIds, setFavoritosIds] = useState<Set<string>>(new Set());

  // Profile
  const [fotoPerfil, setFotoPerfil] = useState("");

  // Location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    try { return JSON.parse(localStorage.getItem("ya_voy_location") || "null"); } catch { return null; }
  });
  const [direcciones, setDirecciones] = useState<Direccion[]>(() => {
    try { return JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]"); } catch { return []; }
  });
  const direccionPrincipal = direcciones.find(d => d.principal) || direcciones[0];

  // Pedido tracking
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [codigoOpciones, setCodigoOpciones] = useState<string[]>([]);
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);
  const [repUbicacion, setRepUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [esperandoTimer, setEsperandoTimer] = useState<number | null>(null);
  const [chatNoLeidos, setChatNoLeidos] = useState<Record<string, number>>({});

  // Modal visibility
  const [showCart, setShowCart] = useState(false);
  const [showChatPedido, setShowChatPedido] = useState<string | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showTarjetas, setShowTarjetas] = useState(false);
  const [showSoporte, setShowSoporte] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);

  const prevPedidosStatusRef = useRef<Record<string, string>>({});

  const [duplicadoCuenta, setDuplicadoCuenta] = useState<any>(null);
  const [fusionarLoading, setFusionarLoading] = useState(false);
  const [fusionarError, setFusionarError] = useState("");

  const handleFusionar = async () => {
    if (!duplicadoCuenta) return;
    setFusionarLoading(true);
    setFusionarError("");
    try {
      const token = await getToken();
      const res = await fetch(API + "/api/auth/fusionar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ duplicadoId: duplicadoCuenta.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error al fusionar");
      window.location.reload();
    } catch (e: any) {
      setFusionarError(e.message);
      setFusionarLoading(false);
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !user) return;
    syncUsuario({ userId, email: user.primaryEmailAddress?.emailAddress ?? "", nombre: user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "", fotoUrl: user.imageUrl ?? "", rol: "cliente" }).catch(() => {});
    fetch(API + "/api/usuario/perfil/" + userId).then(r => r.json()).then(d => { if (d.foto_perfil) setFotoPerfil(d.foto_perfil); }).catch(() => {});
    fetch(API + "/api/config").then(r => r.json()).then(d => setAppConfig(d)).catch(() => {});
    getToken().then(token => { if (token) getFavoritos(userId, token).then(data => { setFavoritos(data); setFavoritosIds(new Set(data.map((n: Negocio) => n.id))); }).catch(() => {}); });
    if (!localStorage.getItem("ya_voy_onboarding_done")) {
      setShowOnboarding(true);
    } else {
      loadNegocios();
    }
    if (!sessionStorage.getItem("ya_voy_dup_check")) {
      sessionStorage.setItem("ya_voy_dup_check", "1");
      const email = user.primaryEmailAddress?.emailAddress;
      if (email) {
        getToken().then(token => {
          if (!token) return;
          fetch(API + "/api/auth/verificar-duplicado?email=" + encodeURIComponent(email), {
            headers: { "Authorization": "Bearer " + token },
          }).then(r => r.json()).then(d => { if (d.duplicado) setDuplicadoCuenta(d.duplicado); }).catch(() => {});
        });
      }
    }
  }, [isLoaded, isSignedIn, userId]);

  // ── Dark mode: aplicar al montar ─────────────────────────────────────────
  useEffect(() => {
    const dark = localStorage.getItem("ya_voy_dark") === "1";
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  // ── AdMob ─────────────────────────────────────────────────────────────────
  useEffect(() => { AdMob.initialize().catch(() => {}); }, []);
  useEffect(() => {
    if (tab === "explorar") {
      AdMob.showBanner({ adId: ADMOB_BANNER_ID, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 56 }).catch(() => {});
    } else {
      AdMob.hideBanner().catch(() => {});
    }
    return () => { AdMob.hideBanner().catch(() => {}); };
  }, [tab]);

  // ── WebSocket pedidos (reemplaza polling de 4s) ───────────────────────────
  usePedidosWS(userId, getToken, (pedidoActualizado) => {
    setPedidos(prev => {
      const existe = prev.find(p => p.id === pedidoActualizado.id);
      if (existe) return prev.map(p => p.id === pedidoActualizado.id ? { ...p, ...pedidoActualizado } : p);
      return prev; // pedido nuevo se carga en el próximo loadPedidos
    });
    // Actualizar detalle si está abierto
    setPedidoDetalle(prev => prev?.id === pedidoActualizado.id ? { ...prev, ...pedidoActualizado } : prev);
  });

  // ── Carga pedidos al entrar al tab ────────────────────────────────────────
  useEffect(() => {
    if (tab !== "pedidos") return;
    loadPedidos();
  }, [tab]);

  // ── Countdown espera ──────────────────────────────────────────────────────
  useEffect(() => {
    if (esperandoTimer === null || esperandoTimer <= 0) return;
    const iv = setInterval(() => {
      setEsperandoTimer(t => {
        if (t === null) return null;
        if (t <= 1) {
          const pedidoEsp = pedidos.find((p: any) => p.status === "esperando_cliente");
          if (pedidoEsp) {
            getToken().then(token =>
              fetch(API + "/api/repartidor/pedidos/" + pedidoEsp.id + "/expirar-espera", {
                method: "PATCH",
                headers: { "Authorization": "Bearer " + token },
              }).then(() => loadPedidos()).catch(() => {})
            );
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [esperandoTimer]);

  // ── Data load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (categoria === "comida" && productosFeed.length === 0) loadProductosFeed();
    if (categoria === "tienda") loadNegocios();
  }, [categoria]);

  const loadNegocios = async (loc?: [number, number] | null) => {
    setLoading(true);
    const coords = loc ?? userLocation;
    try { setNegocios(await getNegocios(coords?.[0], coords?.[1]) as Negocio[]); }
    catch (e: any) { console.error("loadNegocios:", e.message); }
    finally { setLoading(false); }
  };

  const loadProductosFeed = async () => {
    setLoading(true);
    try { setProductosFeed((await getProductosFeed() as Producto[]) || []); }
    catch (e: any) { console.error("loadProductosFeed:", e.message); }
    finally { setLoading(false); }
  };

  const playSound = (tipo: "enCamino" | "llegando") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const note = (freq: number, time: number, dur: number, vol = 0.3) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol, time + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.start(time); o.stop(time + dur);
      };
      if (tipo === "enCamino") {
        note(440, ctx.currentTime, 0.25); note(554, ctx.currentTime + 0.2, 0.25); note(659, ctx.currentTime + 0.4, 0.4);
      } else {
        [0, 0.18, 0.36, 0.54, 0.9, 1.08, 1.26, 1.44].forEach(t => note(880, ctx.currentTime + t, 0.15, 0.4));
      }
    } catch {}
  };

  const loadPedidos = useCallback(async () => {
    if (!userId) return;
    setPedidosLoading(true);
    setPedidosOffset(0);
    try {
      const token = await getToken();
      const data = await getPedidos(userId, token!, 0) as any[];
      setPedidos(data);
      setPedidosHayMas(data.length === 20);
      data.forEach((p: any) => {
        const prev = prevPedidosStatusRef.current[p.id];
        if (prev && prev !== p.status) {
          if (p.status === "en_camino") playSound("enCamino");
          if (p.status === "esperando_cliente") playSound("llegando");
        }
        prevPedidosStatusRef.current[p.id] = p.status;
      });
      const enCamino = data.find((p: any) => p.status === "en_camino" && p.repartidor_id);
      if (enCamino) iniciarPollUbicacion(enCamino.repartidor_id);
      else detenerPollUbicacion();
      const esp = data.find((p: any) => p.status === "esperando_cliente");
      if (esp) {
        const desde = esp.esperando_desde ? new Date(esp.esperando_desde).getTime() : Date.now();
        setEsperandoTimer(Math.max(0, 600 - Math.floor((Date.now() - desde) / 1000)));
      } else {
        setEsperandoTimer(null);
      }
    } catch (e: any) { console.error("loadPedidos:", e.message); }
    finally { setPedidosLoading(false); }
  }, [userId]);

  const loadMasPedidos = useCallback(async () => {
    if (!userId || pedidosMasLoading) return;
    setPedidosMasLoading(true);
    try {
      const token = await getToken();
      const nextOffset = pedidosOffset + 20;
      const data = await getPedidos(userId, token!, nextOffset) as any[];
      setPedidos(prev => [...prev, ...data]);
      setPedidosOffset(nextOffset);
      setPedidosHayMas(data.length === 20);
    } catch (e: any) { console.error("loadMasPedidos:", e.message); }
    finally { setPedidosMasLoading(false); }
  }, [userId, pedidosOffset, pedidosMasLoading]);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const addToCart = (p: any, opcionesSeleccionadas?: { grupoNombre: string; nombre: string; precio: number }[]) => {
    // Incrementar item existente desde el carrito (p ya tiene cartKey)
    if (p.cartKey) {
      setCart(prev => prev.map(i => i.cartKey === p.cartKey ? { ...i, cantidad: i.cantidad + 1 } : i));
      return;
    }
    const pNegocioId = p.negocioId || p.negocio_id || negocioSeleccionado?.id || "";
    if (cart.length > 0 && cart[0].negocioId !== pNegocioId) {
      toast.error("Solo puedes pedir de un restaurante a la vez");
      return;
    }
    const extrasTotal = (opcionesSeleccionadas || []).reduce((a, o) => a + o.precio, 0);
    const precioFinal = Number(p.precio) + extrasTotal;
    const cartKey = opcionesSeleccionadas?.length
      ? `${p.id}-${opcionesSeleccionadas.map(o => o.nombre).sort().join('-')}`
      : String(p.id);
    setCart(prev => {
      const exists = prev.find(i => i.cartKey === cartKey);
      if (exists) return prev.map(i => i.cartKey === cartKey ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { cartKey, productoId: p.id, nombre: p.nombre, precio: precioFinal, precioBase: Number(p.precio), cantidad: 1, negocioId: pNegocioId, opciones: opcionesSeleccionadas }];
    });
    toast.success(`${p.nombre} agregado`);
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => {
      const item = prev.find(i => i.cartKey === cartKey);
      if (!item) return prev;
      if (item.cantidad === 1) return prev.filter(i => i.cartKey !== cartKey);
      return prev.map(i => i.cartKey === cartKey ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const total = cart.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const cartCount = cart.reduce((a, i) => a + i.cantidad, 0);

  // ── Favoritos ─────────────────────────────────────────────────────────────
  const toggleFavorito = async (negocio: Negocio) => {
    if (!userId) return;
    const token = await getToken();
    if (!token) return;
    const esFav = favoritosIds.has(negocio.id);
    if (esFav) {
      setFavoritosIds(prev => { const s = new Set(prev); s.delete(negocio.id); return s; });
      setFavoritos(prev => prev.filter(n => n.id !== negocio.id));
      removeFavorito(userId, negocio.id, token).catch(() => {
        setFavoritosIds(prev => new Set([...prev, negocio.id]));
        setFavoritos(prev => [...prev, negocio]);
      });
    } else {
      setFavoritosIds(prev => new Set([...prev, negocio.id]));
      setFavoritos(prev => [...prev, negocio]);
      addFavorito(userId, negocio.id, token).catch(() => {
        setFavoritosIds(prev => { const s = new Set(prev); s.delete(negocio.id); return s; });
        setFavoritos(prev => prev.filter(n => n.id !== negocio.id));
      });
    }
  };

  // ── Negocio ───────────────────────────────────────────────────────────────
  const openNegocio = async (n: any) => {
    setNegocioSeleccionado(n);
    calcularEnvio(n);
    try { setProductos(await getProductos(n.id) as Producto[]); }
    catch (e: any) { console.error("openNegocio productos:", e.message); }
  };

  const calcularEnvio = async (negocioOverride?: any) => {
    const negocioRef = negocioOverride ?? negocioSeleccionado;
    if (!negocioRef?.lat || !negocioRef?.lng) { setCostoEnvio(35); return; }
    const loc = userLocation || (direccionPrincipal?.lat && direccionPrincipal?.lng ? [direccionPrincipal.lat, direccionPrincipal.lng] as [number, number] : null);
    if (!loc) { setCostoEnvio(35); return; }
    setCostoEnvioLoading(true);
    try {
      const res = await fetch(API + "/api/stripe/calcular-envio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latUsuario: loc[0], lngUsuario: loc[1], latNegocio: negocioRef.lat, lngNegocio: negocioRef.lng }),
      });
      const d = await res.json();
      if (d.costoEnvio) setCostoEnvio(d.costoEnvio);
      if (d.tiempoEstimado) setTiempoEstimado(d.tiempoEstimado);
    } catch (e: any) { console.error("calcularEnvio:", e.message); } finally { setCostoEnvioLoading(false); }
  };

  // ── Payment ───────────────────────────────────────────────────────────────
  const handlePedir = async (extras: { cuponAplicado: any; tipoEntrega: string; programadoPara: string | null; walletMonto: number }) => {
    const { cuponAplicado, tipoEntrega, programadoPara, walletMonto } = extras;
    if (!cart.length || !userId) return;

    // Multi-restaurante: agrupar items por negocioId y crear pedidos separados
    const grupos = cart.reduce((acc, item) => {
      if (!acc[item.negocioId]) acc[item.negocioId] = [];
      acc[item.negocioId].push(item);
      return acc;
    }, {} as Record<string, typeof cart>);
    const negocioIds = Object.keys(grupos);
    const esMulti = negocioIds.length > 1;

    const envioEfectivo = tipoEntrega === "pickup" ? 0 : costoEnvio;
    const token = await getToken();

    setLoading(true);
    try {
      for (let i = 0; i < negocioIds.length; i++) {
        const nid = negocioIds[i];
        const itemsGrupo = grupos[nid];
        const subtotalGrupo = itemsGrupo.reduce((s, it) => s + it.precio * it.cantidad, 0);
        const esPrimero = i === 0;
        const pedidoData = {
          clienteId: userId,
          negocioId: nid,
          items: itemsGrupo,
          total: subtotalGrupo + (esPrimero ? envioEfectivo + propina - (cuponAplicado?.descuento || 0) - walletMonto : 0),
          notas: "",
          metodoPago,
          propina: esPrimero ? propina : 0,
          cuponCodigo: esPrimero ? cuponAplicado?.codigo || null : null,
          descuentoCupon: esPrimero ? cuponAplicado?.descuento || 0 : 0,
          costoEnvio: esPrimero ? envioEfectivo : 0,
          tiempoEstimado,
          tipoEntrega,
          programadoPara: programadoPara || null,
          walletMonto: esPrimero ? walletMonto : 0,
          latEntrega: direccionPrincipal?.lat || null,
          lngEntrega: direccionPrincipal?.lng || null,
          direccionEntrega: tipoEntrega === "pickup" ? "Recoger en tienda" : (direccionPrincipal?.direccion || ""),
        };

        if (metodoPago === "tarjeta" && pedidoData.total > 0) {
          const pedido = await crearPedido({ ...pedidoData, status: "pendiente_pago" }, token!) as any;
          const pedidoId = pedido?.id;
          const res = await fetch(API + "/api/stripe/payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ amount: pedidoData.total, currency: "mxn", costoEnvio: envioEfectivo, metadata: { pedidoId: pedidoId || "" } }),
          });
          const data = await res.json();
          if (!data.clientSecret) throw new Error("No se pudo iniciar el pago");
          if (Capacitor.isNativePlatform()) {
            await Stripe.initialize({ publishableKey: STRIPE_PK });
            await Stripe.createPaymentSheet({ paymentIntentClientSecret: data.clientSecret, merchantDisplayName: "Ya Voy Batalla Group", style: "alwaysLight" });
            const result = await Stripe.presentPaymentSheet();
            if (result.paymentResult !== PaymentSheetEventsEnum.Completed) { toast.error("Pago cancelado"); return; }
          } else {
            setStripePaymentData({ clientSecret: data.clientSecret, pedidoData: { ...pedidoData, paymentIntentId: data.paymentIntentId }, token: token! });
            setShowCart(false); setShowStripeModal(true); return;
          }
        } else {
          await crearPedido(pedidoData, token!);
        }
      }

      hapticSuccess();
      setCart([]); setShowCart(false); setNegocioSeleccionado(null);
      if (esMulti) toast.success(`¡${negocioIds.length} pedidos enviados!`);
      else if (programadoPara) toast.success("¡Pedido programado para " + programadoPara + "!");
      else toast.success("¡Pedido enviado!");
      setTab("pedidos");
    } catch (e: any) { hapticError(); toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleStripeSuccess = () => {
    setCart([]); setShowCart(false); setNegocioSeleccionado(null);
    setShowStripeModal(false); setStripePaymentData(null);
    setTab("pedidos");
  };

  // ── WebSocket ubicación ───────────────────────────────────────────────────
  const iniciarPollUbicacion = async (repartidorId: string) => {
    const token = await getToken();
    const wsUrl = API.replace("http://", "ws://").replace("https://", "wss://")
      + "/ws/ubicacion?repartidorId=" + repartidorId + "&rol=cliente"
      + (token ? "&token=" + encodeURIComponent(token) : "");
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        const { lat, lng } = JSON.parse(e.data);
        if (lat && lng) setRepUbicacion({ lat: Number(lat), lng: Number(lng) });
      } catch {}
    };
    ws.onerror = () => {};
    (window as any).__repWs = ws;
  };

  const detenerPollUbicacion = () => {
    const ws = (window as any).__repWs;
    if (ws) { ws.close(); delete (window as any).__repWs; }
    setRepUbicacion(null);
  };

  // ── Handlers menores ──────────────────────────────────────────────────────
  const handleOnboardingDone = ({ location, pago }: { location: [number, number] | null; pago: string }) => {
    localStorage.setItem("ya_voy_onboarding_done", "1");
    if (location) { localStorage.setItem("ya_voy_location", JSON.stringify(location)); setUserLocation(location); }
    localStorage.setItem("ya_voy_pago", pago);
    setMetodoPago(pago);
    setShowOnboarding(false);
    loadNegocios(location);
  };

  const recargarDirecciones = () => {
    try { setDirecciones(JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]")); } catch {}
  };

  // Importar la función de getDirecciones para cargar al iniciar
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    import("./lib/api").then(({ getDirecciones }) => {
      getToken().then(token => {
        if (!token) return;
        getDirecciones(userId, token).then(data => {
          const mapped = data.map((d: any) => ({ id: d.id, label: d.label, icono: d.icono, direccion: d.direccion, lat: d.lat, lng: d.lng, principal: d.principal }));
          setDirecciones(mapped);
          localStorage.setItem("ya_voy_direcciones", JSON.stringify(mapped));
        }).catch(() => {});
      });
    });
  }, [isLoaded, isSignedIn, userId]);

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(API + "/api/usuario/" + userId, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "No se pudo eliminar la cuenta");
        return;
      }
      await user?.delete();
      localStorage.clear();
      setShowDeleteConfirm(false);
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.");
    } finally { setLoading(false); }
  };

  const handlePedidoClick = (pedido: any) => {
    const ops = pedido._codigoOpciones;
    if (ops) setCodigoOpciones(ops);
    setPedidoDetalle(pedido);
    setCodigoConfirmado(false);
  };

  // ── Routing / early returns ───────────────────────────────────────────────
  if (window.location.pathname === "/sso-callback") return <AuthenticateWithRedirectCallback />;
  if (showSplash) return <AnimatePresence><SplashScreen onDone={() => setShowSplash(false)} /></AnimatePresence>;
  if (!isLoaded || !isSignedIn) return <LoginScreen />;
  if (showOnboarding) return <AnimatePresence><OnboardingFlow userName={user?.firstName || "amigo"} onDone={handleOnboardingDone} /></AnimatePresence>;
  if (showDirecciones) return (
    <DireccionesScreen
      userId={userId || ""}
      getToken={getToken}
      onBack={() => { setShowDirecciones(false); recargarDirecciones(); }}
      onSelect={(d) => {
        const dirs = direcciones.map(x => ({ ...x, principal: x.id === d.id }));
        setDirecciones(dirs);
        localStorage.setItem("ya_voy_direcciones", JSON.stringify(dirs));
        setShowDirecciones(false);
        recargarDirecciones();
      }}
    />
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <Toaster position="top-center" />
      <ServerWarmup />
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-800 text-white text-center text-xs font-bold py-2 flex items-center justify-center gap-2">
          <span>📵</span> Sin conexión — revisa tu internet
        </div>
      )}

      <Suspense fallback={null}>
      {esperandoTimer !== null && (
        <EsperandoBanner
          timer={esperandoTimer}
          pedidoId={pedidos.find((p: any) => p.status === "esperando_cliente")?.id || ""}
          userId={userId || ""}
          userEmail={user?.primaryEmailAddress?.emailAddress}
          userName={user?.fullName ?? undefined}
        />
      )}

      <AnimatePresence>
        {negocioSeleccionado && (
          <NegocioScreen
            negocio={negocioSeleccionado}
            productos={productos}
            cart={cart}
            cartCount={cartCount}
            total={total}
            onClose={() => setNegocioSeleccionado(null)}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onViewCart={() => setShowCart(true)}
            onOpenProducto={setProductoSeleccionado}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {productoSeleccionado && (
          <ProductoModal
            producto={productoSeleccionado}
            onClose={() => setProductoSeleccionado(null)}
            onAddToCart={addToCart}
            onVerNegocio={openNegocio}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCart && (
          <CartSheet
            cart={cart}
            total={total}
            costoEnvio={costoEnvio}
            costoEnvioLoading={costoEnvioLoading}
            metodoPago={metodoPago}
            onMetodoPagoChange={(p) => { setMetodoPago(p); localStorage.setItem("ya_voy_pago", p); }}
            direccionPrincipal={direccionPrincipal}
            loading={loading}
            negocioId={negocioSeleccionado?.id}
            propina={propina}
            walletBalance={0}
            onPropinaChange={(p) => { setPropina(p); localStorage.setItem("ya_voy_propina", String(p)); }}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onPedir={handlePedir}
            onClearCart={() => { setCart([]); setNegocioSeleccionado(null); setPropina(0); }}
            onClose={() => setShowCart(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStripeModal && stripePaymentData && (
          <StripePagoModal
            clientSecret={stripePaymentData.clientSecret}
            pedidoData={stripePaymentData.pedidoData}
            token={stripePaymentData.token}
            onSuccess={handleStripeSuccess}
            onClose={() => { setShowStripeModal(false); setStripePaymentData(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pedidoDetalle && (
          <PedidoDetalle
            pedido={pedidoDetalle}
            codigoConfirmado={codigoConfirmado}
            repUbicacion={repUbicacion}
            chatNoLeidos={chatNoLeidos}
            onClose={() => setPedidoDetalle(null)}
            onAbrirChat={(id) => setShowChatPedido(id)}
            onCancelar={() => setShowCancelar(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChatPedido && (
          <ChatModal
            pedidoId={showChatPedido}
            userId={userId || ""}
            onClose={() => setShowChatPedido(null)}
            onMensajesLeidos={(id) => setChatNoLeidos(prev => ({ ...prev, [id]: 0 }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTarjetas && (
          <TarjetasModal
            userId={userId || ""}
            userEmail={user?.primaryEmailAddress?.emailAddress}
            userName={user?.fullName ?? undefined}
            tarjetas={tarjetas}
            onTarjetasUpdate={setTarjetas}
            onClose={() => setShowTarjetas(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSoporte && (
          <SoporteModal
            userId={userId || ""}
            userEmail={user?.primaryEmailAddress?.emailAddress}
            userName={user?.fullName ?? undefined}
            whatsappUrl={appConfig.whatsapp}
            pedidos={pedidos}
            onClose={() => setShowSoporte(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRating && pedidoDetalle && (
          <RatingModal pedido={pedidoDetalle} onClose={() => setShowRating(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCancelar && pedidoDetalle && (
          <CancelarModal
            pedidoId={pedidoDetalle.id}
            onCancelado={() => {
              setPedidoDetalle((p: any) => ({ ...p, status: "cancelado" }));
              setPedidos(prev => prev.map((o: any) => o.id === pedidoDetalle.id ? { ...o, status: "cancelado" } : o));
              setShowCancelar(false);
            }}
            onClose={() => setShowCancelar(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirmModal onConfirm={handleDeleteAccount} onClose={() => setShowDeleteConfirm(false)} />
        )}
      </AnimatePresence>
      </Suspense>

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
        <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          {tab === "home" && (
            <TabErrorBoundary><HomeTab
              categoria={categoria}
              subCategoria={subCategoria}
              negocios={negocios}
              productosFeed={productosFeed}
              cart={cart}
              loading={loading}
              favoritos={favoritos}
              favoritosIds={favoritosIds}
              pedidos={pedidos}
              userLocation={userLocation}
              onCategoriaChange={setCategoria}
              onSubCategoriaChange={setSubCategoria}
              onOpenNegocio={openNegocio}
              onAddToCart={addToCart}
              onProductoClick={setProductoSeleccionado}
              onToggleFavorito={toggleFavorito}
            /></TabErrorBoundary>
          )}
          {tab === "explorar" && (
            <TabErrorBoundary><ExplorarTab negocios={negocios} userLocation={userLocation} onOpenNegocio={openNegocio} /></TabErrorBoundary>
          )}
          {tab === "pedidos" && (
            <TabErrorBoundary><PedidosTab
              pedidos={pedidos}
              negocios={negocios}
              chatNoLeidos={chatNoLeidos}
              loading={pedidosLoading}
              hayMas={pedidosHayMas}
              masLoading={pedidosMasLoading}
              onRefresh={loadPedidos}
              onLoadMore={loadMasPedidos}
              onGoHome={() => setTab("home")}
              onPedidoClick={handlePedidoClick}
              onSetProductos={setProductos}
              onSetCart={setCart}
              onSetNegocioSeleccionado={setNegocioSeleccionado}
              onSetShowCart={setShowCart}
              onSetTab={setTab}
              calcularEnvio={calcularEnvio}
            /></TabErrorBoundary>
          )}
          {tab === "perfil" && (
            <TabErrorBoundary><PerfilTab
              userId={userId || ""}
              user={user}
              fotoPerfil={fotoPerfil}
              direcciones={direcciones}
              tarjetas={tarjetas}
              metodoPago={metodoPago}
              onMetodoPagoChange={(p) => { setMetodoPago(p); localStorage.setItem("ya_voy_pago", p); }}
              onFotoChange={setFotoPerfil}
              onShowDirecciones={() => setShowDirecciones(true)}
              onShowTarjetas={() => setShowTarjetas(true)}
              onShowSoporte={() => setShowSoporte(true)}
              onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
              onSignOut={() => signOut()}
            /></TabErrorBoundary>
          )}
        </AnimatePresence>
        </Suspense>
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pt-2 z-40" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex justify-around">
          {(() => {
            const pedidoActivo = pedidos.find(p => !["entregado", "cancelado"].includes(p.status));
            return ([
              { id: "home", label: "¡YA VOY!", icon: ShoppingBag },
              { id: "explorar", label: "Explorar", icon: Search },
              { id: "pedidos", label: "Pedidos", icon: Clock },
              { id: "perfil", label: "Perfil", icon: User },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setTab(id); if (id === "home") { loadProductosFeed(); loadNegocios(); } }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all relative ${tab === id ? "text-purple-600" : "text-slate-400"}`}>
                <div className="relative">
                  <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
                  {id === "pedidos" && pedidoActivo && tab !== "pedidos" && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                  )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-tight ${tab === id ? "opacity-100" : "opacity-60"}`}>{label}</span>
              </button>
            ));
          })()}
        </div>
      </div>

      {duplicadoCuenta && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔀</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Cuenta duplicada</h2>
              <p className="text-slate-500 text-sm mt-1">Encontramos otra cuenta con tu mismo correo</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-sm">
              <p className="font-bold text-slate-700">{duplicadoCuenta.nombre || "Sin nombre"}</p>
              <p className="text-slate-500">{duplicadoCuenta.email}</p>
            </div>
            <p className="text-slate-400 text-xs text-center mb-4">
              Al fusionar, todo el historial de la cuenta anterior pasará a tu cuenta actual. Esta acción no se puede deshacer.
            </p>
            {fusionarError && <p className="text-red-500 text-sm text-center mb-3">{fusionarError}</p>}
            <button onClick={handleFusionar} disabled={fusionarLoading}
              className="w-full py-3.5 rounded-2xl font-black text-white mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: GRAD }}>
              {fusionarLoading && <Loader2 className="animate-spin" size={18} />}
              Fusionar cuentas
            </button>
            <button onClick={() => { setDuplicadoCuenta(null); sessionStorage.setItem("ya_voy_dup_ignored", "1"); }}
              className="w-full py-2.5 rounded-2xl text-slate-500 font-medium text-sm">
              No por ahora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
