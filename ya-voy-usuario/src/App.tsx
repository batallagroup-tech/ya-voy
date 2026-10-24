import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import { supabase } from "./lib/supabase";
import { AnimatePresence } from "motion/react";
import { ShoppingBag, Search, Clock, User, MapPin, ChevronDown, ShoppingCart, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Stripe, PaymentSheetEventsEnum } from "@capacitor-community/stripe";
import { Capacitor } from "@capacitor/core";
import { initAdMob, showBottomBanner, hideBottomBanner } from "./lib/admob";
import { syncUsuario, getNegocios, getProductos, crearPedido, getPedidos, getProductosFeed, getFavoritos, addFavorito, removeFavorito } from "./lib/api";
import { logEvent } from "./lib/analytics";
import { setStatusBarLight, setStatusBarDark } from "./lib/statusBar";
import { hapticSuccess, hapticError, hapticLight, playPurchaseChime } from "./lib/haptics";
import { GRAD, API } from "./lib/constants";
import { auth } from "./lib/firebase";
import type { CartItem } from "./lib/constants";
import type { Negocio, Producto, Pedido, AppConfig } from "./types";

// Carga síncrona — necesaria para el flujo inicial antes de auth
import LoginScreen from "./components/LoginScreen";
import SplashScreen from "./components/SplashScreen";
import ServerWarmup from "./components/ServerWarmup";
import ConnectionBanner from "./components/ConnectionBanner";
import OnboardingFlow from "./components/OnboardingFlow";
import DireccionesScreen, { type Direccion } from "./components/DireccionesScreen";
import { TabErrorBoundary } from "./components/ErrorBoundary";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { usePedidosWS } from "./hooks/usePedidosWS";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import LiveOrderBanner from "./components/LiveOrderBanner";
import { updateLiveOrderNotification, initLiveNotificationChannel } from "./lib/liveNotifications";

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
const FavoritosModal  = lazy(() => import("./modals/FavoritosModal"));
const UpdateModal     = lazy(() => import("./modals/UpdateModal"));
const HomeTab          = lazy(() => import("./tabs/HomeTab"));
const ExplorarTab      = lazy(() => import("./tabs/ExplorarTab"));
const PedidosTab       = lazy(() => import("./tabs/PedidosTab"));
const PerfilTab        = lazy(() => import("./tabs/PerfilTab"));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-rose-400" />
      {/* Modal de actualizacion disponible con Google Play */}
      <Suspense fallback={null}>
        <UpdateModal />
      </Suspense>
    </div>
  );
}

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const ADMOB_BANNER_ID = "ca-app-pub-3849768825456219/7317936592";

export default function App() {
  const { isLoaded, isSignedIn, userId, getToken, user, signOut } = useFirebaseAuth();
  const isOnline = useNetworkStatus();
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
  const [negocios, setNegocios] = useState<Negocio[]>(() => {
    try {
      const c = localStorage.getItem("ya_voy_cache_negocios");
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [productosFeed, setProductosFeed] = useState<Producto[]>(() => {
    try {
      const c = localStorage.getItem("ya_voy_cache_feed");
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosOffset, setPedidosOffset] = useState(0);
  const [pedidosHayMas, setPedidosHayMas] = useState(false);
  const [pedidosMasLoading, setPedidosMasLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(false);
  const [pedidosLoading, setPedidosLoading] = useState(false);

  const pedidoActivo = pedidos.find(p => p.status !== "entregado" && p.status !== "cancelado") || null;

  useEffect(() => {
    if (pedidoActivo) {
      updateLiveOrderNotification(pedidoActivo);
    }
  }, [pedidoActivo?.id, pedidoActivo?.status]);

  // Cart / negocio
  const [negocioSeleccionado, setNegocioSeleccionado] = useState<Negocio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("ya_voy_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ya_voy_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

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
  const [showFavoritosModal, setShowFavoritosModal] = useState(false);

  // Profile
  const [fotoPerfil, setFotoPerfil] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    try {
      const cached = localStorage.getItem("ya_voy_wallet_balance");
      return cached ? Number(cached) : 0;
    } catch { return 0; }
  });

  const updateWalletBalance = useCallback((newBal: number) => {
    setWalletBalance(newBal);
    try {
      localStorage.setItem("ya_voy_wallet_balance", String(newBal));
      if (userId) localStorage.setItem("ya_voy_wallet_balance_" + userId, String(newBal));
    } catch {}
  }, [userId]);

  useEffect(() => {
    const handleWalletEvent = (e: any) => {
      if (typeof e.detail === "number") {
        setWalletBalance(e.detail);
      }
    };
    window.addEventListener("ya-voy:wallet-update", handleWalletEvent);
    return () => window.removeEventListener("ya-voy:wallet-update", handleWalletEvent);
  }, []);

  // Location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    try { return JSON.parse(localStorage.getItem("ya_voy_location") || "null"); } catch { return null; }
  });
  const [direcciones, setDirecciones] = useState<Direccion[]>(() => {
    try { const d = JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]"); return Array.isArray(d) ? d : []; } catch { return []; }
  });
  const direccionPrincipal = direcciones.find(d => d.principal) || direcciones[0];

  // Pedido tracking
  const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
  const [codigoOpciones, setCodigoOpciones] = useState<string[]>([]);
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);
  const [repUbicacion, setRepUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const repPollIntervalRef = useRef<any>(null);
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
  const [confirmReplaceCart, setConfirmReplaceCart] = useState<{
    p: any;
    opciones?: { grupoNombre: string; nombre: string; precio: number }[];
    pNegocioId: string;
  } | null>(null);

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
    fetch(API + "/api/config").then(r => r.json()).then(d => setAppConfig(d)).catch(() => {});
    getToken().then(token => {
      if (!token) return;
      const savedRealName = localStorage.getItem("ya_voy_custom_name_" + userId) || localStorage.getItem("ya_voy_real_name");
      syncUsuario({ userId, email: user.primaryEmailAddress?.emailAddress ?? "", nombre: savedRealName || user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "", fotoUrl: user.imageUrl ?? "", rol: "cliente" }, token).catch(() => {});
      fetch(API + "/api/usuario/perfil/" + userId, { headers: { Authorization: "Bearer " + token } }).then(r => r.json()).then(d => { 
        if (d.foto_perfil) setFotoPerfil(d.foto_perfil); 
        const localCustom = localStorage.getItem("ya_voy_custom_name_" + userId) || localStorage.getItem("ya_voy_real_name");
        if (!localCustom && d.nombre) {
          localStorage.setItem("ya_voy_real_name", d.nombre);
        }
        if (d.telefono) localStorage.setItem("ya_voy_phone", d.telefono);
      }).catch(() => {});
      getFavoritos(userId, token).then(data => { setFavoritos(data); setFavoritosIds(new Set(data.map((n: Negocio) => n.id))); }).catch(() => {});
      fetch(API + "/api/usuario/wallet/" + userId, { headers: { Authorization: "Bearer " + token } }).then(r => r.json()).then(d => updateWalletBalance(Number(d.balance || 0))).catch(() => {});
      fetch(API + "/api/stripe/payment-methods/" + userId, { headers: { Authorization: "Bearer " + token } }).then(r => r.json()).then(d => { if (Array.isArray(d.cards)) setTarjetas(d.cards); }).catch(() => {});
      getPedidos(userId, token, 0).then((data: any) => { if (Array.isArray(data)) setPedidos(data); }).catch(() => {});
    });
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

  // ── Dark mode & AdMob: aplicar al montar ────────────────────────────────
  useEffect(() => {
    const dark = localStorage.getItem("ya_voy_dark") === "1";
    document.documentElement.classList.toggle("dark", dark);
    setStatusBarLight();
    initAdMob();
    initLiveNotificationChannel();
  }, []);

  // Limpiar cualquier banner flotante previo para garantizar vista despejada
  useEffect(() => {
    hideBottomBanner();
  }, [pedidoDetalle]);

  // ── Android back button ───────────────────────────────────────────────────
  useEffect(() => {
    const handleBack = () => {
      if (confirmReplaceCart) { setConfirmReplaceCart(null); return; }
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return; }
      if (showCancelar)      { setShowCancelar(false); return; }
      if (showRating)        { setShowRating(false); return; }
      if (showSoporte)       { setShowSoporte(false); return; }
      if (showTarjetas)      { setShowTarjetas(false); return; }
      if (showChatPedido)    { setShowChatPedido(null); return; }
      if (showStripeModal)   { setShowStripeModal(false); setStripePaymentData(null); return; }
      if (pedidoDetalle)     { setPedidoDetalle(null); return; }
      if (productoSeleccionado) { setProductoSeleccionado(null); return; }
      if (showCart)          { setShowCart(false); return; }
      if (negocioSeleccionado) { setNegocioSeleccionado(null); return; }
      if (tab !== "home")    { setTab("home"); return; }
      // En home sin nada abierto: salir de la app
      (navigator as any).app?.exitApp?.();
    };
    document.addEventListener("backbutton", handleBack);
    return () => document.removeEventListener("backbutton", handleBack);
  }, [confirmReplaceCart, showDeleteConfirm, showCancelar, showRating, showSoporte, showTarjetas,
      showChatPedido, showStripeModal, pedidoDetalle, productoSeleccionado,
      showCart, negocioSeleccionado, tab]);


  // ── WebSocket pedidos (reemplaza polling de 4s) ───────────────────────────
  usePedidosWS(
    userId,
    getToken,
    (pedidoActualizado) => {
      const prevSt = prevPedidosStatusRef.current[pedidoActualizado.id];
      if (prevSt && prevSt !== pedidoActualizado.status) {
        if (pedidoActualizado.status === "en_camino") playSound("enCamino");
        if (pedidoActualizado.status === "esperando_cliente") playSound("llegando");
      }
      prevPedidosStatusRef.current[pedidoActualizado.id] = pedidoActualizado.status;

      setPedidos(prev => {
        const existe = prev.find(p => p.id === pedidoActualizado.id);
        if (existe) return prev.map(p => p.id === pedidoActualizado.id ? { ...p, ...pedidoActualizado } : p);
        return [pedidoActualizado, ...prev];
      });
      // Actualizar detalle si está abierto
      setPedidoDetalle(prev => prev?.id === pedidoActualizado.id ? { ...prev, ...pedidoActualizado } : prev);
    },
    (msg) => {
      if (msg.pedidoId && msg.mensaje && msg.mensaje.remitente_tipo === "repartidor") {
        playSound("enCamino");
        if (showChatPedido !== msg.pedidoId) {
          setChatNoLeidos(prev => ({ ...prev, [msg.pedidoId]: (prev[msg.pedidoId] || 0) + 1 }));
          toast("💬 Nuevo mensaje de tu repartidor: " + (msg.mensaje.texto || ""));
        }
      }
    }
  );

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
    loadProductosFeed();
    loadNegocios();
  }, []);

  useEffect(() => {
    if (categoria === "comida") loadProductosFeed();
    if (categoria === "tienda") loadNegocios();
  }, [categoria]);

  const loadNegocios = async (loc?: [number, number] | null) => {
    if (negocios.length === 0) setLoading(true);
    const coords = loc ?? userLocation ?? (direccionPrincipal?.lat != null && direccionPrincipal?.lng != null ? [direccionPrincipal.lat, direccionPrincipal.lng] : null);
    try {
      const data = await getNegocios(coords?.[0], coords?.[1]);
      if (Array.isArray(data)) setNegocios(data as Negocio[]);
    } catch (e: any) {
      console.error("loadNegocios:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProductosFeed = async (loc?: [number, number] | null) => {
    if (productosFeed.length === 0) setLoading(true);
    const coords = loc ?? userLocation ?? (direccionPrincipal?.lat != null && direccionPrincipal?.lng != null ? [direccionPrincipal.lat, direccionPrincipal.lng] : null);
    try {
      const data = await getProductosFeed(coords?.[0], coords?.[1]);
      if (Array.isArray(data)) setProductosFeed(data as Producto[]);
    } catch (e: any) {
      console.error("loadProductosFeed:", e.message);
    } finally {
      setLoading(false);
    }
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
          updateLiveOrderNotification(p);
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
  const addToCart = (p: any, opcionesSeleccionadas?: { grupoNombre: string; nombre: string; precio: number }[], forceReplace = false) => {
    // Incrementar item existente desde el carrito (p ya tiene cartKey)
    if (p.cartKey) {
      setCart(prev => prev.map(i => i.cartKey === p.cartKey ? { ...i, cantidad: i.cantidad + 1 } : i));
      return;
    }
    const pNegocioId = p.negocioId || p.negocio_id || negocioSeleccionado?.id || "";
    if (!forceReplace && cart.length > 0 && cart[0].negocioId !== pNegocioId) {
      setConfirmReplaceCart({ p, opciones: opcionesSeleccionadas, pNegocioId });
      return;
    }
    const extrasTotal = (opcionesSeleccionadas || []).reduce((a, o) => a + o.precio, 0);
    const precioFinal = Number(p.precio) + extrasTotal;
    const cartKey = opcionesSeleccionadas?.length
      ? `${p.id}-${opcionesSeleccionadas.map(o => o.nombre).sort().join('-')}`
      : String(p.id);
    if (forceReplace) {
      setCart([{ cartKey, productoId: p.id, nombre: p.nombre, precio: precioFinal, precioBase: Number(p.precio), cantidad: 1, negocioId: pNegocioId, opciones: opcionesSeleccionadas }]);
      const nuevoNegocio = negocios.find(n => n.id === pNegocioId);
      if (nuevoNegocio) calcularEnvio(nuevoNegocio);
    } else {
      setCart(prev => {
        const exists = prev.find(i => i.cartKey === cartKey);
        if (exists) return prev.map(i => i.cartKey === cartKey ? { ...i, cantidad: i.cantidad + 1 } : i);
        return [...prev, { cartKey, productoId: p.id, nombre: p.nombre, precio: precioFinal, precioBase: Number(p.precio), cantidad: 1, negocioId: pNegocioId, opciones: opcionesSeleccionadas }];
      });
    }
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

  const cartProductIds = useMemo(() => new Set(cart.map(c => c.productoId)), [cart]);
  const sugerenciasCart = useMemo(() => {
    const pool = (productos && productos.length > 0) ? productos : productosFeed;
    return pool.filter(p => !cartProductIds.has(p.id) && (p.disponible ?? true)).slice(0, 8);
  }, [productos, productosFeed, cartProductIds]);

  // ── Favoritos ─────────────────────────────────────────────────────────────
  const toggleFavorito = async (negocio: Negocio) => {
    if (!userId) {
      toast.error("Inicia sesión para guardar tus favoritos");
      return;
    }
    const token = await getToken();
    if (!token) return;
    const esFav = favoritosIds.has(negocio.id);
    if (esFav) {
      setFavoritosIds(prev => { const s = new Set(prev); s.delete(negocio.id); return s; });
      setFavoritos(prev => prev.filter(n => n.id !== negocio.id));
      toast("Eliminado de favoritos", { icon: "💔" });
      removeFavorito(userId, negocio.id, token).catch(() => {
        setFavoritosIds(prev => new Set([...prev, negocio.id]));
        setFavoritos(prev => [...prev, negocio]);
      });
    } else {
      setFavoritosIds(prev => new Set([...prev, negocio.id]));
      setFavoritos(prev => [...prev, negocio]);
      toast.success(`${negocio.nombre} agregado a tus favoritos ❤️`);
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
  const handlePedir = async (extras: { cuponAplicado: any; tipoEntrega: string; programadoPara: string | null; walletMonto: number; notas?: string }) => {
    const { cuponAplicado, tipoEntrega, programadoPara, walletMonto, notas } = extras;
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
          notas: notas || "",
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

        if (metodoPago === "efectivo" && pedidoData.total > 400) {
          const entregadosCount = pedidos.filter(p => p.status === "entregado").length;
          if (entregadosCount < 3) {
            toast.error("Por seguridad, los pedidos en efectivo para cuentas nuevas tienen un límite máximo de $400 MXN. Te invitamos a pagar con tarjeta o reducir el monto.");
            return;
          }
        }

        if (metodoPago === "tarjeta" && pedidoData.total > 0) {
          const pedido = await crearPedido({ ...pedidoData, status: "pendiente_pago" }, token!) as any;
          const pedidoId = pedido?.id;
          const res = await fetch(API + "/api/stripe/payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ amount: pedidoData.total, currency: "mxn", costoEnvio: envioEfectivo, metadata: { pedidoId: pedidoId || "" } }),
          });
          const data = await res.json();
          if (!data.clientSecret) {
            if (pedidoId) {
              fetch(API + "/api/usuario/pedidos/" + pedidoId + "/borrador", {
                method: "DELETE",
                headers: { Authorization: "Bearer " + token },
              }).catch(() => {});
            }
            throw new Error("No se pudo iniciar el pago");
          }
          if (Capacitor.isNativePlatform()) {
            await Stripe.initialize({ publishableKey: STRIPE_PK });
            await Stripe.createPaymentSheet({ paymentIntentClientSecret: data.clientSecret, merchantDisplayName: "Ya Voy Batalla Group", style: "alwaysLight" });
            const result = await Stripe.presentPaymentSheet();
            if (result.paymentResult !== PaymentSheetEventsEnum.Completed) {
              if (pedidoId) {
                fetch(API + "/api/usuario/pedidos/" + pedidoId + "/borrador", {
                  method: "DELETE",
                  headers: { Authorization: "Bearer " + token },
                }).catch(() => {});
              }
              toast.error("Pago cancelado");
              return;
            }
            if (pedidoId) {
              await fetch(API + "/api/usuario/pedidos/" + pedidoId + "/confirmar-pago", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                body: JSON.stringify({ paymentIntentId: data.paymentIntentId }),
              }).catch(() => {});
            }
          } else {
            setStripePaymentData({ clientSecret: data.clientSecret, pedidoData: { ...pedidoData, pedidoId, paymentIntentId: data.paymentIntentId }, token: token! });
            setShowCart(false); setShowStripeModal(true); return;
          }
        } else {
          await crearPedido(pedidoData, token!);
        }
      }

      playPurchaseChime();
      logEvent("pedido_creado", { esMulti, programado: !!programadoPara, wallet: walletMonto > 0 });
      setCart([]); setShowCart(false); setNegocioSeleccionado(null);
      // Recargar wallet por si se usó saldo
      getToken().then(tok => { if (tok) fetch(API + "/api/usuario/wallet/" + userId, { headers: { Authorization: "Bearer " + tok } }).then(r => r.json()).then(d => setWalletBalance(Number(d.balance || 0))).catch(() => {}); });
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

  // ── WebSocket y Polling híbrido de ubicación del repartidor ────────────────
  const iniciarPollUbicacion = async (repartidorId: string) => {
    detenerPollUbicacion();
    const token = await getToken();
    const wsUrl = API.replace("http://", "ws://").replace("https://", "wss://")
      + "/ws/ubicacion?repartidorId=" + repartidorId + "&rol=cliente"
      + (token ? "&token=" + encodeURIComponent(token) : "");
    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        try {
          const { lat, lng } = JSON.parse(e.data);
          if (lat && lng) setRepUbicacion({ lat: Number(lat), lng: Number(lng) });
        } catch {}
      };
      ws.onerror = () => {};
      (window as any).__repWs = ws;
    } catch {}

    // Polling HTTP continuo como seguro de alta fidelidad si la conexión móvil suspende WS
    const fetchHttpUbicacion = async () => {
      try {
        const res = await fetch(`${API}/api/repartidor/${repartidorId}/ubicacion`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.lat_actual && data.lng_actual) {
            setRepUbicacion({ lat: Number(data.lat_actual), lng: Number(data.lng_actual) });
          }
        }
      } catch {}
    };
    fetchHttpUbicacion();
    repPollIntervalRef.current = setInterval(fetchHttpUbicacion, 4000);
  };

  const detenerPollUbicacion = () => {
    if (repPollIntervalRef.current) {
      clearInterval(repPollIntervalRef.current);
      repPollIntervalRef.current = null;
    }
    const ws = (window as any).__repWs;
    if (ws) { ws.close(); delete (window as any).__repWs; }
    setRepUbicacion(null);
  };

  // ── Pedir de nuevo (Reordenar en 1 clic) ──────────────────────────────────
  const handlePedirDeNuevo = async (p: any) => {
    const negocio: Negocio = negocios.find((n: any) => n.id === (p.negocio_id || p.negocioId)) || { 
      id: p.negocio_id || p.negocioId, 
      nombre: p.negocio_nombre || "Restaurante", 
      tipo: "restaurante",
      imagen_url: p.negocio_imagen 
    };
    setNegocioSeleccionado(negocio);
    calcularEnvio(negocio);
    try {
      const prods = await fetch(API + `/api/usuario/negocios/${p.negocio_id || p.negocioId}/productos`).then(r => r.json()).catch(() => []);
      setProductos(Array.isArray(prods) ? prods : []);
    } catch {}
    const carritoNuevo: CartItem[] = (p.items || []).map((it: any) => ({
      cartKey: `${it.nombre}-${Date.now()}-${Math.random()}`,
      productoId: it.id || it.productoId || it.nombre,
      nombre: it.nombre,
      precio: it.precio,
      precioBase: it.precio,
      cantidad: it.cantidad || 1,
      negocioId: p.negocio_id || p.negocioId,
    }));
    setCart(carritoNuevo);
    setShowCart(true);
    toast.success("¡Pedido anterior cargado en tu carrito!");
  };

  // ── Handlers menores ──────────────────────────────────────────────────────
  const handleOnboardingDone = async ({ location, address, pago, realName, phone }: { location: [number, number] | null; address?: string; pago: string; realName?: string; phone?: string }) => {
    localStorage.setItem("ya_voy_onboarding_done", "1");
    if (realName) localStorage.setItem("ya_voy_real_name", realName);
    if (phone) localStorage.setItem("ya_voy_phone", phone);
    if (location) { localStorage.setItem("ya_voy_location", JSON.stringify(location)); setUserLocation(location); }
    localStorage.setItem("ya_voy_pago", pago);
    setMetodoPago(pago);
    setShowOnboarding(false);
    loadNegocios(location);
    loadProductosFeed(location);
    try {
      if (realName || phone) {
        await supabase.auth.updateUser({
          data: { full_name: realName, phone: phone }
        });
      }
    } catch {}
  };

  const recargarDirecciones = () => {
    try {
      const d = JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]");
      const arr = Array.isArray(d) ? d : [];
      setDirecciones(arr);
      const prin = arr.find((x: any) => x.principal) || arr[0];
      if (prin?.lat != null && prin?.lng != null) {
        loadNegocios([Number(prin.lat), Number(prin.lng)]);
        loadProductosFeed([Number(prin.lat), Number(prin.lng)]);
      }
    } catch {}
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
          const prin = mapped.find((x: any) => x.principal) || mapped[0];
          if (prin?.lat != null && prin?.lng != null) {
            loadNegocios([Number(prin.lat), Number(prin.lng)]);
            loadProductosFeed([Number(prin.lat), Number(prin.lng)]);
          }
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
      setShowDeleteConfirm(false);
      toast.success("Tu cuenta y todos tus datos han sido eliminados permanentemente.");
      await signOut();
      localStorage.clear();
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
  if (showSplash) return <AnimatePresence><SplashScreen onDone={() => setShowSplash(false)} /></AnimatePresence>;
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: GRAD }}>
        <Loader2 size={36} className="text-white animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <LoginScreen />;
  if (showOnboarding) return <AnimatePresence><OnboardingFlow userName={user?.firstName || "amigo"} onDone={handleOnboardingDone} /></AnimatePresence>;
  if (showDirecciones) return (
    <DireccionesScreen
      userId={userId || ""}
      getToken={getToken}
      onBack={() => { setShowDirecciones(false); recargarDirecciones(); }}
      onSelect={(d) => {
        let freshDirs: Direccion[] = [];
        try {
          const raw = JSON.parse(localStorage.getItem("ya_voy_direcciones") || "[]");
          if (Array.isArray(raw)) freshDirs = raw;
        } catch {}
        if (!freshDirs.some(x => x.id === d.id)) {
          freshDirs.push(d);
        }
        const dirs = freshDirs.map(x => ({ ...x, principal: x.id === d.id }));
        setDirecciones(dirs);
        localStorage.setItem("ya_voy_direcciones", JSON.stringify(dirs));
        if (userId && getToken) {
          getToken().then(tok => {
            if (tok) import("./lib/api").then(m => m.setPrincipalDireccion(d.id, userId, tok).catch(() => {}));
          });
        }
        if (d.lat && d.lng) {
          const loc: [number, number] = [d.lat, d.lng];
          setUserLocation(loc);
          localStorage.setItem("ya_voy_location", JSON.stringify(loc));
          loadNegocios(loc);
        }
        setShowDirecciones(false);
      }}
    />
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <Toaster position="top-center" toastOptions={{ style: { marginTop: "50px" } }} />
      <ServerWarmup />
      <ConnectionBanner />

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
            isFavorito={favoritosIds.has(negocioSeleccionado.id)}
            onToggleFavorito={() => toggleFavorito(negocioSeleccionado)}
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
            walletBalance={walletBalance}
            tarjetas={tarjetas}
            sugerencias={sugerenciasCart}
            onManageCards={() => setShowTarjetas(true)}
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
            onCalificar={() => setShowRating(true)}
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
        {showFavoritosModal && (
          <FavoritosModal
            favoritos={favoritos}
            onToggleFavorito={toggleFavorito}
            onOpenNegocio={openNegocio}
            onClose={() => setShowFavoritosModal(false)}
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
          <RatingModal 
            pedido={pedidoDetalle} 
            onClose={() => setShowRating(false)} 
            onRatingEnviado={(pid, data) => {
              setPedidos(prev => prev.map(p => p.id === pid ? { ...p, ...data } : p));
              if (pedidoDetalle?.id === pid) {
                setPedidoDetalle(prev => prev ? { ...prev, ...data } : null);
              }
            }}
          />
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
      <AnimatePresence>
        {pedidoActivo && (
          <LiveOrderBanner
            pedido={pedidoActivo}
            onOpenPedido={(p) => {
              setTab("pedidos");
              handlePedidoClick(p);
            }}
          />
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 shadow-2xs" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <div className="flex items-center justify-between">
          <button onClick={() => setShowDirecciones(true)} className="flex items-center gap-2.5 active:scale-95 transition-transform text-left">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shadow-rose-500/20" style={{ background: GRAD }}>
              <MapPin size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Entregar en</p>
              <div className="flex items-center gap-1">
                <p className="font-black text-slate-900 text-sm max-w-[180px] truncate">{direccionPrincipal?.label || "Mi ubicación"}</p>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {cartCount > 0 && (
              <button onClick={() => setShowCart(true)} className="relative p-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 active:scale-90 transition-transform">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md" style={{ background: GRAD }}>{cartCount}</span>
              </button>
            )}
            <button onClick={() => setTab("perfil")} className="w-10 h-10 rounded-2xl overflow-hidden bg-rose-100 border-2 border-rose-200/80 shadow-2xs flex items-center justify-center active:scale-90 transition-transform">
              {(fotoPerfil || user?.imageUrl) && !avatarError ? (
                <img 
                  src={fotoPerfil || user?.imageUrl || ""} 
                  alt="" 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User size={18} className="text-rose-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto pb-24">
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
              direccionPrincipal={direccionPrincipal}
              onCategoriaChange={setCategoria}
              onSubCategoriaChange={setSubCategoria}
              onOpenNegocio={openNegocio}
              onAddToCart={addToCart}
              onProductoClick={setProductoSeleccionado}
              onToggleFavorito={toggleFavorito}
              onPedirDeNuevo={handlePedirDeNuevo}
              onRefresh={async () => {
                await Promise.all([loadNegocios(), loadProductosFeed()]);
              }}
            /></TabErrorBoundary>
          )}
          {tab === "explorar" && (
            <TabErrorBoundary>
              <ExplorarTab 
                negocios={negocios} 
                userLocation={userLocation} 
                favoritosIds={favoritosIds}
                onToggleFavorito={toggleFavorito}
                onOpenNegocio={openNegocio} 
              />
            </TabErrorBoundary>
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
              onCalificarPedido={(p) => {
                setPedidoDetalle(p);
                setShowRating(true);
              }}
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
              favoritos={favoritos}
              onShowFavoritos={() => setShowFavoritosModal(true)}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 dark:border-slate-800 backdrop-blur-md border-t border-slate-100 px-3 pt-2 z-40 shadow-lg transition-colors" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex justify-around items-center max-w-md mx-auto">
          {(() => {
            const pedidoActivo = pedidos.find(p => !["entregado", "cancelado"].includes(p.status));
            return ([
              { id: "home", label: "¡YA VOY!", icon: ShoppingBag },
              { id: "explorar", label: "Explorar", icon: Search },
              { id: "pedidos", label: "Pedidos", icon: Clock },
              { id: "perfil", label: "Perfil", icon: User },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button 
                key={id} 
                onClick={() => { 
                  setTab(id); 
                  if (id === "home") { loadProductosFeed(); loadNegocios(); } 
                }}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all relative ${
                  tab === id ? "text-rose-600 scale-105" : "text-slate-400 hover:text-slate-600"
                }`}>
                <div className="relative">
                  <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
                  {id === "pedidos" && pedidoActivo && tab !== "pedidos" && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-tight ${tab === id ? "opacity-100 font-black text-rose-700" : "opacity-60"}`}>{label}</span>
              </button>
            ));
          })()}
        </div>
      </div>

      {confirmReplaceCart && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="text-amber-600" size={26} />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">¿Cambiar de restaurante?</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
                Ya tienes productos de otro restaurante en tu carrito. ¿Deseas vaciar tu carrito actual y agregar <span className="font-bold text-slate-800 dark:text-slate-200">{confirmReplaceCart.p?.nombre}</span>?
              </p>
            </div>
            <button
              onClick={() => {
                const { p, opciones } = confirmReplaceCart;
                setConfirmReplaceCart(null);
                addToCart(p, opciones, true);
              }}
              className="w-full py-3.5 rounded-2xl font-black text-white mb-2.5 shadow-md active:scale-95 transition-transform"
              style={{ background: GRAD }}>
              Sí, vaciar carrito y agregar
            </button>
            <button
              onClick={() => setConfirmReplaceCart(null)}
              className="w-full py-2.5 rounded-2xl text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              Conservar mi carrito actual
            </button>
          </div>
        </div>
      )}

      {duplicadoCuenta && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
      {/* Modal de actualizacion disponible con Google Play */}
      <Suspense fallback={null}>
        <UpdateModal />
      </Suspense>
    </div>
  );
}
