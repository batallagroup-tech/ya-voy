import { toast } from 'sonner'
import { setStatusBarLight } from '../lib/statusBar';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  LayoutDashboard, ShoppingBag, Utensils, TrendingUp, Tag, Bike,
  Settings, LogOut, Plus, Edit2, Trash2, X,
  DollarSign, Star, Clock, Power, Loader2, ChevronRight,
  Image as ImageIcon, Save
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { hapticSuccess, hapticMedium } from '../lib/haptics';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePedidosWS } from '../hooks/usePedidosWS';
import { imgUrl } from '../lib/cloudinary';
import { Browser } from '@capacitor/browser';

const CATEGORIES = ['Tacos','Hamburguesas','Pizza','Sushi','Postres','Bebidas','Comida Corrida','Alitas','Ensaladas','Mariscos'];

interface Props { negocio: any; notifPedidoId?: string | null; onNotifHandled?: () => void; }

export default function Dashboard({ negocio: initialNegocio, notifPedidoId, onNotifHandled }: Props) {
  const { signOut, getToken } = useFirebaseAuth();
  const isOnline = useNetworkStatus();
  const authFetch = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = await getToken();
    return apiFetch<T>(path, options, token);
  };
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ya_voy_dark") === "1")
  const [appConfig, setAppConfig] = useState<Record<string,string>>({})
  const [tab, setTab] = useState<'overview'|'orders'|'menu'|'finance'|'profile'>('overview');
  const [negocio, setNegocio] = useState<any>(initialNegocio);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  type OpcionGrupoForm = { id: string; nombre: string; tipo: 'unico'|'multiple'; requerido: boolean; opciones: { id: string; nombre: string; precio: string }[] };
  const [productForm, setProductForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false, opciones: [] as OpcionGrupoForm[] });
  const [uploadingImg, setUploadingImg] = useState(false);
  const [cancelando, setCancelando] = useState<{id:string,numero:any}|null>(null);
  const [razonCancel, setRazonCancel] = useState('');
  const [confirmandoPedido, setConfirmandoPedido] = useState<{id:string,numero:any}|null>(null);
  const [tiempoAceptar, setTiempoAceptar] = useState('30 min');
  const [rechazandoPedido, setRechazandoPedido] = useState<{id:string,numero:any}|null>(null);
  const [razonRechazo, setRazonRechazo] = useState('');
  const DIAS = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'];
  const [horarios, setHorarios] = useState<Record<string,{abierto:boolean,desde:string,hasta:string}>>(() => {
    const base: Record<string,{abierto:boolean,desde:string,hasta:string}> = {};
    ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'].forEach(d => { base[d] = { abierto: true, desde: '09:00', hasta: '21:00' }; });
    return base;
  });
  const [savingHorarios, setSavingHorarios] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ nombre: '', direccion: '', telefono: '', descripcion: '' })
  const [savingProfile, setSavingProfile] = useState(false);
  const [showRatings, setShowRatings] = useState(false)
  const [stripeConectando, setStripeConectando] = useState(false)
  const [stripeConectado, setStripeConectado] = useState(false)
  const [retiros, setRetiros] = useState<any[]>([])
  const [repartidoresDisponibles, setRepartidoresDisponibles] = useState<{total:number;nombres:string[]}>({total:0,nombres:[]})
  const [cupones, setCupones] = useState<any[]>([])
  const [cuponesLoading, setCuponesLoading] = useState(false)
  const [cuponForm, setCuponForm] = useState({ nombre: '', codigo: '', tipo: 'porcentaje', valor: '', usos_max: '100', minimo_compra: '', expira_en: '', descripcion: '' })
  const [creandoCupon, setCreandoCupon] = useState(false)
  const [cuponError, setCuponError] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [retirosLoading, setRetirosLoading] = useState(false)
  const [solicitandoRetiro, setSolicitandoRetiro] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [retiroMinimo, setRetiroMinimo] = useState(50)
  const [comisionPct, setComisionPct] = useState(0.18)
  const prevNuevosRef = useRef(0);

  useEffect(() => {
    if (!notifPedidoId) return;
    setTab('orders');
    onNotifHandled?.();
  }, [notifPedidoId]);

  useEffect(() => { setStatusBarLight(); }, []);

  // ── Android back button ───────────────────────────────────────────────────
  useEffect(() => {
    const handleBack = () => {
      if (showProductForm || editingProduct) { setShowProductForm(false); setEditingProduct(null); return; }
      if (cancelando)         { setCancelando(null); return; }
      if (confirmandoPedido)  { setConfirmandoPedido(null); return; }
      if (rechazandoPedido)   { setRechazandoPedido(null); return; }
      if (showRatings)        { setShowRatings(false); return; }
      if (editingProfile)     { setEditingProfile(false); return; }
      if (showLogoutConfirm)  { setShowLogoutConfirm(false); return; }
      (navigator as any).app?.exitApp?.();
    };
    document.addEventListener("backbutton", handleBack);
    return () => document.removeEventListener("backbutton", handleBack);
  }, [showProductForm, editingProduct, cancelando, confirmandoPedido, rechazandoPedido, showRatings, editingProfile, showLogoutConfirm]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBell = (time: number) => {
        const freqs = [880, 1108, 1318];
        freqs.forEach(freq => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = "sine"; o.frequency.value = freq;
          g.gain.setValueAtTime(0, time);
          g.gain.linearRampToValueAtTime(0.25, time + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
          o.start(time); o.stop(time + 0.6);
        });
      };
      playBell(ctx.currentTime);
      playBell(ctx.currentTime + 0.7);
      playBell(ctx.currentTime + 1.4);
    } catch {}
  };

  const load = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);
    try {
      const token = await getToken();
      const [ords, prods] = await Promise.all([
        apiFetch<any[]>(`/api/negocios/${negocio.id}/pedidos`, {}, token).catch(() => []),
        apiFetch<any[]>(`/api/negocios/${negocio.id}/productos`, {}, token).catch(() => []),
      ]);
      const nuevosActuales = ords.filter((o: any) => o.status === 'nuevo').length;
      if (nuevosActuales > prevNuevosRef.current) playBeep();
      prevNuevosRef.current = nuevosActuales;
      setOrders(ords);
      setProducts(prods);
    } finally { setLoading(false); }
  }, [negocio?.id]);

  useEffect(() => {
    load()
    fetch(import.meta.env.VITE_API_URL + "/api/config").then(r=>r.json()).then(d=>{
      setAppConfig(d)
      if (d.retiro_minimo) setRetiroMinimo(Number(d.retiro_minimo))
      if (d.comision_pct) setComisionPct(Number(d.comision_pct) / 100)
    }).catch(()=>{})

    const cargarConAuth = async () => {
      const token = await getToken()
      const authHeaders = { "Authorization": "Bearer " + token }

      if (initialNegocio?.id) {
        fetch(import.meta.env.VITE_API_URL + "/api/stripe/connect/status/restaurante/" + initialNegocio.id, { headers: authHeaders })
          .then(r=>r.json()).then(d=>setStripeConectado(d.conectado||false)).catch(()=>{})
      }

      if (initialNegocio?.owner_id) {
        setRetirosLoading(true)
        fetch(import.meta.env.VITE_API_URL + "/api/retiros/restaurante/" + initialNegocio.owner_id, { headers: authHeaders })
          .then(r=>r.json()).then(d=>setRetiros(Array.isArray(d)?d:[])).catch(()=>{})
          .finally(()=>setRetirosLoading(false))
      }
    }
    cargarConAuth()
  }, [load])
  useEffect(() => {
    const cargarRepartidores = () => {
      fetch(import.meta.env.VITE_API_URL + "/api/repartidor/disponibles/count")
        .then(r => r.json()).then(d => setRepartidoresDisponibles({ total: Number(d.total||0), nombres: d.nombres||[] })).catch(() => {})
    }
    cargarRepartidores()
    const iv = setInterval(cargarRepartidores, 30000)
    return () => clearInterval(iv)
  }, [])
  usePedidosWS(negocio?.owner_id, getToken, (nuevoPedido) => {
    setOrders(prev => {
      if (prev.find(o => o.id === nuevoPedido.id)) return prev;
      playBeep();
      hapticMedium();
      return [nuevoPedido, ...prev];
    });
  });

  useEffect(() => {
    if (tab !== 'orders' && tab !== 'overview') return;
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [load, tab]);

  useEffect(() => {
    if (tab !== 'menu' || !negocio?.id) return;
    setCuponesLoading(true);
    authFetch<any[]>(`/api/negocios/${negocio.id}/cupones`)
      .then(d => setCupones(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCuponesLoading(false));
  }, [tab, negocio?.id]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await authFetch(`/api/negocios/pedidos/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch { toast.error('Ocurrio un error'); }
    finally { setActionLoading(false); }
  };

  const aceptarConTiempo = async () => {
    if (!confirmandoPedido || actionLoading) return;
    setActionLoading(true);
    try {
      await authFetch(`/api/negocios/pedidos/${confirmandoPedido.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'preparando', tiempo_estimado: tiempoAceptar }) });
      setOrders(prev => prev.map(o => o.id === confirmandoPedido.id ? { ...o, status: 'preparando', tiempo_estimado: tiempoAceptar } : o));
      toast.success('Pedido aceptado');
      setConfirmandoPedido(null);
    } catch { toast.error('Error al aceptar'); }
    finally { setActionLoading(false); }
  };

  const rechazarPedidoConfirm = async () => {
    if (!rechazandoPedido || actionLoading) return;
    setActionLoading(true);
    try {
      await authFetch(`/api/negocios/pedidos/${rechazandoPedido.id}/rechazar`, { method: 'PATCH', body: JSON.stringify({ razon: razonRechazo || 'No disponible en este momento' }) });
      setOrders(prev => prev.filter(o => o.id !== rechazandoPedido.id));
      toast.success('Pedido rechazado');
      setRechazandoPedido(null);
      setRazonRechazo('');
    } catch { toast.error('Error al rechazar'); }
    finally { setActionLoading(false); }
  };

  const uploadImg = async (file: File) => {
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      const r = await fetch('https://api.cloudinary.com/v1_1/' + import.meta.env.VITE_CLOUDINARY_CLOUD_NAME + '/image/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.secure_url) setProductForm(p => ({ ...p, imagen_url: d.secure_url }));
    } catch { toast.error('Error al subir imagen'); } finally { setUploadingImg(false); }
  };

  const saveProduct = async () => {
    if (!productForm.nombre || !productForm.precio) return;
    setSaving(true);
    try {
      const opcionesNorm = productForm.opciones.map(g => ({
        ...g,
        opciones: g.opciones.map(o => ({ ...o, precio: parseFloat(o.precio) || 0 })),
      }));
      const payload = { ...productForm, precio: parseFloat(productForm.precio), opciones: opcionesNorm };
      if (editingProduct) {
        const updated = await authFetch<any>(`/api/negocios/productos/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
      } else {
        const nuevo = await authFetch<any>('/api/negocios/productos', { method: 'POST', body: JSON.stringify({ ...payload, negocio_id: negocio.id }) });
        setProducts(prev => [...prev, nuevo]);
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false, opciones: [] });
    } catch { toast.error('Error al guardar'); } finally { setSaving(false); }
  };

  const deleteProduct = async (id: string) => {
    try {
      await authFetch(`/api/negocios/productos/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch { toast.error('Error al eliminar'); }
  };

  const toggleActivo = async () => {
    try {
      const updated = await authFetch<any>(`/api/negocios/${negocio.id}/toggle`, { method: 'PATCH' });
      setNegocio(updated);
    } catch { toast.error('Error al cambiar estado'); }
  };

  const togglePausa = async () => {
    try {
      const updated = await authFetch<any>(`/api/negocios/${negocio.id}/pausar`, { method: 'PATCH' });
      setNegocio(updated);
    } catch { toast.error('Error al pausar pedidos'); }
  };

  const tiempoTranscurrido = (fecha: string) => {
    const mins = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `hace ${hrs}h ${mins % 60}min`;
  };

  const statsToday = {
    pedidos: orders.filter(o => new Date(o.creado_en).toDateString() === new Date().toDateString()).length,
    ingresos: orders.filter(o => new Date(o.creado_en).toDateString() === new Date().toDateString() && o.status === 'entregado').reduce((a, o) => a + ((Number(o.total||0) - Number(o.costo_envio||35)) * (1 - comisionPct)), 0),
    nuevos: orders.filter(o => o.status === 'nuevo').length,
  };

  const tabs = [
    { id: 'overview', label: 'Inicio',    icon: LayoutDashboard },
    { id: 'orders',   label: 'Pedidos',   icon: ShoppingBag, badge: statsToday.nuevos },
    { id: 'menu',     label: 'Menú',      icon: Utensils },
    { id: 'finance',  label: 'Finanzas',  icon: TrendingUp },
    { id: 'profile',  label: 'Perfil',    icon: Settings },
  ];

  const orderStatusConfig: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
    pendiente:  { label: 'Nuevo',      color: 'bg-blue-500' },
    preparando: { label: 'Preparando', color: 'bg-orange-500', next: 'listo', nextLabel: 'Marcar listo' },
    listo:      { label: 'Listo',      color: 'bg-green-500' },
    en_camino:  { label: 'En Camino',  color: 'bg-purple-500' },
    nuevo:      { label: 'Nuevo',      color: 'bg-blue-500' },
    entregado:  { label: 'Entregado',  color: 'bg-slate-400' },
    cancelado:  { label: 'Cancelado',  color: 'bg-red-500' },
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col overflow-x-hidden w-full">
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-800 text-white text-center text-xs font-bold py-2">
          📵 Sin conexión — revisa tu internet
        </div>
      )}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FF6B00] rounded-xl flex items-center justify-center">
            <Utensils size={18} className="text-white" />
          </div>
          <div>
            <p className="font-black text-slate-900 text-sm leading-none">{negocio?.nombre || 'Mi Negocio'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${negocio?.esta_abierto ? 'bg-green-500' : 'bg-slate-300'}`} />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{negocio?.esta_abierto ? 'Abierto' : 'Cerrado'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {negocio?.esta_abierto && (
            <button onClick={togglePausa} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${negocio?.aceptando_pedidos === false ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
              {negocio?.aceptando_pedidos === false ? 'Pausado' : 'Pausar'}
            </button>
          )}
          <button onClick={toggleActivo} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${negocio?.esta_abierto ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            <Power size={14} className="inline mr-1" />{negocio?.esta_abierto ? 'Abierto' : 'Cerrado'}
          </button>
          <button onClick={() => setShowLogoutConfirm(true)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">

          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Resumen de hoy</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pedidos', value: statsToday.pedidos, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Ingresos', value: `$${Number(statsToday.ingresos).toFixed(0)}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
                  { label: 'Nuevos', value: statsToday.nuevos, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white p-3 rounded-2xl border border-slate-100 text-center">
                    <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                      <Icon size={16} className={color} />
                    </div>
                    <p className="text-lg font-black text-slate-900">{value}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${repartidoresDisponibles.total > 0 ? 'bg-green-100' : 'bg-slate-100'}`}>
                  <Bike size={20} className={repartidoresDisponibles.total > 0 ? 'text-green-600' : 'text-slate-400'} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 text-sm">{repartidoresDisponibles.total > 0 ? `${repartidoresDisponibles.total} repartidor${repartidoresDisponibles.total > 1 ? 'es' : ''} disponible${repartidoresDisponibles.total > 1 ? 's' : '' }` : 'Sin repartidores disponibles'}</p>
                  <p className="text-xs text-slate-400">{repartidoresDisponibles.total > 0 ? 'En linea ahora' : 'Puede haber demoras en la entrega'}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${repartidoresDisponibles.total > 0 ? 'bg-green-400 animate-pulse' : 'bg-slate-300'}`} />
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-sm">Pedidos Recientes</h3>
                  <button onClick={() => setTab('orders')} className="text-xs font-bold text-[#FF6B00]">Ver todos</button>
                </div>
                {orders.slice(0, 3).map(o => (
                  <div key={o.id} className="px-4 py-3 border-b border-slate-50 last:border-none flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Pedido #{o.numero ?? o.id?.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-slate-500">${o.total} · {o.items?.length} productos</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full text-white ${orderStatusConfig[o.status]?.color || 'bg-slate-400'}`}>
                      {orderStatusConfig[o.status]?.label || o.status}
                    </span>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No hay pedidos aun</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Pedidos</h2>
                <button onClick={load} className="p-2 text-slate-400 hover:text-[#FF6B00] transition-colors">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                </button>
              </div>
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                  <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay pedidos activos</p>
                </div>
              ) : orders.map(o => (
                <div key={o.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900">Pedido #{o.numero ?? o.id?.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{new Date(o.creado_en).toLocaleTimeString()} · {tiempoTranscurrido(o.creado_en)}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white ${orderStatusConfig[o.status]?.color || 'bg-slate-400'}`}>
                      {orderStatusConfig[o.status]?.label || o.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {o.items?.map((item: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 font-medium">{item.cantidad}x {item.nombre}</span>
                          <span className="font-bold text-slate-900">${(item.precio * item.cantidad).toFixed(2)}</span>
                        </div>
                        {item.opciones?.length > 0 && (
                          <p className="text-xs text-slate-400 pl-4">{item.opciones.map((o: any) => o.nombre).join(' · ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {o.notas?.trim() && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
                      <span className="text-amber-500 text-sm shrink-0">📝</span>
                      <p className="text-sm font-bold text-amber-800">{o.notas}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div>
                      <p className="font-black text-slate-900">Total: ${Number(o.total || 0).toFixed(2)}</p>
                      {o.tiempo_estimado && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} className="inline" /> Entrega en {o.tiempo_estimado}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(o.status === 'listo' || o.status === 'en_camino') && o.codigo_restaurante && (
                        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                          <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Codigo repartidor</p>
                          <p className="text-lg font-black text-green-700 tracking-widest">{o.codigo_restaurante}</p>
                        </div>
                      )}
                      {o.status === 'nuevo' && (
                        <>
                          <button disabled={actionLoading} onClick={() => { setRechazandoPedido({ id: o.id, numero: o.numero ?? o.id?.slice(-6).toUpperCase() }); setRazonRechazo(''); }}
                            className="px-3 py-2 bg-red-50 text-red-500 text-xs font-black rounded-xl border border-red-200 hover:bg-red-100 transition-all whitespace-nowrap disabled:opacity-50">
                            Rechazar
                          </button>
                          <button disabled={actionLoading} onClick={() => { setConfirmandoPedido({ id: o.id, numero: o.numero ?? o.id?.slice(-6).toUpperCase() }); setTiempoAceptar('30 min'); }}
                            className="px-4 py-2 bg-[#FF6B00] text-white text-xs font-black rounded-xl hover:bg-[#E65F00] transition-all whitespace-nowrap disabled:opacity-50">
                            Aceptar
                          </button>
                        </>
                      )}
                      {o.status === 'preparando' && (
                        <button disabled={actionLoading} onClick={() => setCancelando({ id: o.id, numero: o.numero ?? o.id?.slice(-6).toUpperCase() })}
                          className="px-3 py-2 bg-red-50 text-red-500 text-xs font-black rounded-xl border border-red-200 hover:bg-red-100 transition-all whitespace-nowrap disabled:opacity-50">
                          Cancelar
                        </button>
                      )}
                      {orderStatusConfig[o.status]?.next && (
                        <button disabled={actionLoading} onClick={() => updateOrderStatus(o.id, orderStatusConfig[o.status].next!)}
                          className="px-4 py-2 bg-[#FF6B00] text-white text-xs font-black rounded-xl hover:bg-[#E65F00] transition-all whitespace-nowrap disabled:opacity-50">
                          {orderStatusConfig[o.status].nextLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Menu Digital</h2>
                <button onClick={() => { setEditingProduct(null); setProductForm({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false, opciones: [] }); setShowProductForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-bold rounded-xl hover:bg-[#E65F00] transition-all">
                  <Plus size={16} /> Agregar
                </button>
              </div>
              {showProductForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900">{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h3>
                    <button onClick={() => setShowProductForm(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <X size={16} className="text-slate-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {productForm.imagen_url ? <img src={imgUrl(productForm.imagen_url, 200)} className="w-full h-full object-cover" /> : <span className="text-2xl">🍽️</span>}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <div className="px-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 text-center hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                        {uploadingImg ? <Loader2 size={14} className="animate-spin" /> : '📷'} {uploadingImg ? 'Subiendo...' : 'Subir imagen'}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadImg(e.target.files[0]); }} />
                    </label>
                  </div>
                  <input value={productForm.nombre} onChange={e => setProductForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del producto"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  <textarea value={productForm.descripcion} onChange={e => setProductForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripcion (opcional)" rows={2}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00] resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={productForm.precio} onChange={e => setProductForm(p => ({ ...p, precio: e.target.value }))} placeholder="Precio"
                      className="px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                    <select value={productForm.categoria} onChange={e => setProductForm(p => ({ ...p, categoria: e.target.value }))}
                      className="px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={productForm.disponible} onChange={e => setProductForm(p => ({ ...p, disponible: e.target.checked }))} className="rounded" />
                      Disponible
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={productForm.destacado} onChange={e => setProductForm(p => ({ ...p, destacado: e.target.checked }))} className="rounded" />
                      Destacado
                    </label>
                  </div>

                  {/* ── OPCIONES DE PERSONALIZACIÓN ── */}
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Personalización</p>
                      <button type="button" onClick={() => setProductForm(p => ({
                        ...p,
                        opciones: [...p.opciones, { id: Date.now().toString(), nombre: '', tipo: 'unico', requerido: false, opciones: [{ id: Date.now().toString() + '1', nombre: '', precio: '0' }] }]
                      }))} className="text-xs font-black px-3 py-1.5 rounded-xl border border-[#FF6B00] text-[#FF6B00] hover:bg-orange-50 transition-all">
                        + Agregar grupo
                      </button>
                    </div>
                    {productForm.opciones.map((grupo, gi) => (
                      <div key={grupo.id} className="bg-slate-50 rounded-xl p-3 mb-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <input value={grupo.nombre} onChange={e => setProductForm(p => ({ ...p, opciones: p.opciones.map((g, i) => i === gi ? { ...g, nombre: e.target.value } : g) }))}
                            placeholder="Ej: ¿Con queso?" className="flex-1 px-3 py-1.5 bg-white rounded-lg text-sm outline-none border border-slate-200 focus:border-orange-400 font-bold" />
                          <select value={grupo.tipo} onChange={e => setProductForm(p => ({ ...p, opciones: p.opciones.map((g, i) => i === gi ? { ...g, tipo: e.target.value as 'unico'|'multiple' } : g) }))}
                            className="px-2 py-1.5 bg-white rounded-lg text-xs outline-none border border-slate-200">
                            <option value="unico">Único</option>
                            <option value="multiple">Múltiple</option>
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer whitespace-nowrap">
                            <input type="checkbox" checked={grupo.requerido} onChange={e => setProductForm(p => ({ ...p, opciones: p.opciones.map((g, i) => i === gi ? { ...g, requerido: e.target.checked } : g) }))} className="rounded" />
                            Requerido
                          </label>
                          <button type="button" onClick={() => setProductForm(p => ({ ...p, opciones: p.opciones.filter((_, i) => i !== gi) }))}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"><X size={14} /></button>
                        </div>
                        {grupo.opciones.map((opc, oi) => (
                          <div key={opc.id} className="flex items-center gap-2 pl-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                            <input value={opc.nombre} onChange={e => setProductForm(p => ({ ...p, opciones: p.opciones.map((g, gi2) => gi2 !== gi ? g : { ...g, opciones: g.opciones.map((o, oi2) => oi2 === oi ? { ...o, nombre: e.target.value } : o) }) }))}
                              placeholder="Ej: Con queso" className="flex-1 px-3 py-1.5 bg-white rounded-lg text-sm outline-none border border-slate-200 focus:border-orange-400" />
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-slate-400">$</span>
                              <input type="number" value={opc.precio} onChange={e => setProductForm(p => ({ ...p, opciones: p.opciones.map((g, gi2) => gi2 !== gi ? g : { ...g, opciones: g.opciones.map((o, oi2) => oi2 === oi ? { ...o, precio: e.target.value } : o) }) }))}
                                placeholder="0" className="w-16 px-2 py-1.5 bg-white rounded-lg text-sm outline-none border border-slate-200 focus:border-orange-400" />
                            </div>
                            <button type="button" onClick={() => setProductForm(p => ({ ...p, opciones: p.opciones.map((g, gi2) => gi2 !== gi ? g : { ...g, opciones: g.opciones.filter((_, oi2) => oi2 !== oi) }) }))}
                              className="p-1 text-slate-300 hover:text-red-400 transition-colors"><X size={12} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setProductForm(p => ({ ...p, opciones: p.opciones.map((g, i) => i !== gi ? g : { ...g, opciones: [...g.opciones, { id: Date.now().toString(), nombre: '', precio: '0' }] }) }))}
                          className="text-xs font-bold text-[#FF6B00] pl-4 hover:underline">+ Opción</button>
                      </div>
                    ))}
                    {productForm.opciones.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">Sin grupos de personalización. Agrega uno si tu producto tiene opciones (ej: tamaño, extras, ingredientes).</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowProductForm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all">
                      Cancelar
                    </button>
                    <button onClick={saveProduct} disabled={saving || !productForm.nombre || !productForm.precio}
                      className="flex-[2] py-3 bg-[#FF6B00] text-white font-bold rounded-xl text-sm hover:bg-[#E65F00] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {editingProduct ? 'Guardar' : 'Agregar'}
                    </button>
                  </div>
                </motion.div>
              )}
              {products.length === 0 && !showProductForm && (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                  <Utensils size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay productos en el menu</p>
                  <p className="text-sm mt-1">Agrega tu primer producto</p>
                </div>
              )}
              {products.length > 0 && (
                <div className="space-y-2">
                  {products.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {p.imagen_url ? <img src={imgUrl(p.imagen_url, 160)} alt={p.nombre} className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon size={20} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm truncate">{p.nombre}</p>
                          {p.destacado && <span className="text-[10px] bg-orange-100 text-orange-600 font-black px-2 py-0.5 rounded-full">Destacado</span>}
                        </div>
                        <p className="text-xs text-slate-500">{p.categoria} · ${p.precio}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.agotado && <span className="text-[9px] bg-red-100 text-red-600 font-black px-1.5 py-0.5 rounded-full">Agotado</span>}
                        <button onClick={async () => {
                          await authFetch(`/api/negocios/productos/${p.id}/agotado`, { method: 'PATCH' });
                          setProducts(ps => ps.map(x => x.id === p.id ? { ...x, agotado: !x.agotado } : x));
                        }} title={p.agotado ? "Marcar disponible" : "Marcar agotado"}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${p.agotado ? 'border-green-200 text-green-600 bg-green-50' : 'border-red-200 text-red-500 bg-red-50'}`}>
                          {p.agotado ? '✓ Reponer' : '✕ Agotado'}
                        </button>
                        <button onClick={() => { setEditingProduct(p); setProductForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio.toString(), categoria: p.categoria, disponible: p.disponible, imagen_url: p.imagen_url || '', destacado: p.destacado, opciones: (p.opciones||[]).map((g: any) => ({ ...g, opciones: g.opciones.map((o: any) => ({ ...o, precio: String(o.precio) })) })) }); setShowProductForm(true); }}
                          className="p-2 text-slate-400 hover:text-[#FF6B00] transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── CUPONES ── */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-700 flex items-center gap-2"><Tag size={15} className="text-[#FF6B00]" /> Cupones de descuento</h3>
                </div>
                <div className='bg-white rounded-2xl border border-slate-100 p-4 space-y-3'>
                  <p className='text-xs font-bold text-slate-500 uppercase tracking-wider'>Crear cupon</p>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Nombre</label><input value={cuponForm.nombre} onChange={e => setCuponForm(p => ({...p, nombre: e.target.value}))} placeholder='Ej: Bienvenida' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                    <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Codigo</label><input value={cuponForm.codigo} onChange={e => setCuponForm(p => ({...p, codigo: e.target.value.toUpperCase()}))} placeholder='BIENVENIDO20' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400 font-black tracking-wider' /></div>
                    <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Tipo</label><select value={cuponForm.tipo} onChange={e => setCuponForm(p => ({...p, tipo: e.target.value}))} className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200'><option value='porcentaje'>% Porcentaje</option><option value='fijo'>MXN Fijo</option></select></div>
                    <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Valor {cuponForm.tipo === 'porcentaje' ? '(%)' : '(MXN)'}</label><input type='number' value={cuponForm.valor} onChange={e => setCuponForm(p => ({...p, valor: e.target.value}))} placeholder={cuponForm.tipo === 'porcentaje' ? '20' : '50'} className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                    <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Compra minima</label><input type='number' value={cuponForm.minimo_compra} onChange={e => setCuponForm(p => ({...p, minimo_compra: e.target.value}))} placeholder='0' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                    <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Usos maximos</label><input type='number' value={cuponForm.usos_max} onChange={e => setCuponForm(p => ({...p, usos_max: e.target.value}))} placeholder='100' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                    <div className='col-span-2 space-y-1'><label className='text-xs font-bold text-slate-500'>Expiracion (opcional)</label><input type='datetime-local' value={cuponForm.expira_en} onChange={e => setCuponForm(p => ({...p, expira_en: e.target.value}))} className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                  </div>
                  {cuponError && <p className='text-xs text-red-500 font-bold'>{cuponError}</p>}
                  <button onClick={async () => {
                    if (!cuponForm.codigo || !cuponForm.valor) { setCuponError('Codigo y valor son requeridos'); return }
                    setCreandoCupon(true); setCuponError('')
                    try {
                      const d = await authFetch<any>('/api/negocios/' + negocio.id + '/cupones', {
                        method: 'POST',
                        body: JSON.stringify({ ...cuponForm, valor: parseFloat(cuponForm.valor), usos_max: parseInt(cuponForm.usos_max) || 100, minimo_compra: parseFloat(cuponForm.minimo_compra) || 0 })
                      })
                      setCupones(prev => [d, ...prev])
                      setCuponForm({ nombre: '', codigo: '', tipo: 'porcentaje', valor: '', usos_max: '100', minimo_compra: '', expira_en: '', descripcion: '' })
                      toast.success('Cupon creado')
                    } catch (e: any) { setCuponError(e.message || 'Error de conexion') }
                    finally { setCreandoCupon(false) }
                  }} disabled={creandoCupon || !cuponForm.codigo || !cuponForm.valor}
                    className='w-full py-3 rounded-2xl text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2'
                    style={{ background: 'linear-gradient(135deg,#FF6B00,#E65F00)' }}>
                    {creandoCupon ? <Loader2 size={16} className='animate-spin' /> : <Plus size={16} />} Crear cupon
                  </button>
                </div>
                {cuponesLoading ? <div className='flex justify-center py-8'><Loader2 className='animate-spin text-orange-500' size={28} /></div>
                : cupones.length === 0 ? <div className='text-center py-6 text-slate-400'><Tag size={28} className='mx-auto mb-2 opacity-30' /><p className='text-sm'>Sin cupones creados</p></div>
                : cupones.map(cup => (
                  <div key={cup.id} className='bg-white rounded-2xl border border-slate-100 p-4 mt-2'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <p className='font-black text-slate-900 tracking-wider'>{cup.codigo}</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${cup.activo ? 'bg-green-500' : 'bg-slate-400'}`}>{cup.activo ? 'Activo' : 'Inactivo'}</span>
                          <span className='text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700'>{cup.tipo === 'porcentaje' ? cup.valor + '%' : '$' + cup.valor}</span>
                        </div>
                        {cup.nombre && <p className='text-sm font-bold text-slate-700'>{cup.nombre}</p>}
                        <div className='flex gap-3 mt-1 text-xs text-slate-400'>
                          <span>Usos: {cup.usos_actual}/{cup.usos_max}</span>
                          {cup.expira_en && <span>Expira: {new Date(cup.expira_en).toLocaleDateString('es-MX')}</span>}
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <button onClick={async () => {
                          await authFetch('/api/negocios/' + negocio.id + '/cupones/' + cup.id, { method: 'PATCH', body: JSON.stringify({ activo: !cup.activo }) })
                          setCupones(prev => prev.map(c => c.id === cup.id ? {...c, activo: !cup.activo} : c))
                        }} className={`text-xs font-black px-3 py-1.5 rounded-xl border ${cup.activo ? 'border-red-200 text-red-500 bg-red-50' : 'border-green-200 text-green-600 bg-green-50'}`}>
                          {cup.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={async () => {
                          await authFetch('/api/negocios/' + negocio.id + '/cupones/' + cup.id, { method: 'DELETE' })
                          setCupones(prev => prev.filter(c => c.id !== cup.id))
                          toast.success('Cupon eliminado')
                        }} className='p-1.5 rounded-xl border border-red-200 text-red-500 bg-red-50'>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Finanzas</h2>
              {/* ANALYTICS */}
              {(() => {
                const entregados = orders.filter((o:any) => o.status === "entregado")
                // Ventas ultimos 7 dias
                const dias7 = Array.from({length:7},(_,i) => { const d = new Date(); d.setDate(d.getDate()-6+i); return d })
                const ventasPorDia = dias7.map(d => ({
                  label: d.toLocaleDateString("es-MX",{weekday:"short"}),
                  total: entregados.filter((o:any) => new Date(o.creado_en).toDateString() === d.toDateString()).reduce((a:number,o:any)=>a+Number(o.total||0),0)
                }))
                const maxVenta = Math.max(...ventasPorDia.map(v=>v.total),1)
                // Productos mas vendidos
                const prodCount: Record<string,{nombre:string;count:number}> = {}
                entregados.forEach((o:any) => { (o.items||[]).forEach((it:any) => { if(!prodCount[it.nombre]) prodCount[it.nombre]={nombre:it.nombre,count:0}; prodCount[it.nombre].count+=it.cantidad||1 }) })
                const topProds = Object.values(prodCount).sort((a:any,b:any)=>b.count-a.count).slice(0,5)
                const maxProd = Math.max(...topProds.map((p:any)=>p.count),1)
                // Horas pico
                const horaCount = Array(24).fill(0)
                entregados.forEach((o:any) => { const h = new Date(o.creado_en).getHours(); horaCount[h]++ })
                const horasPico = horaCount.map((c:number,h:number)=>({h,c})).filter((x:any)=>x.c>0).sort((a:any,b:any)=>b.c-a.c).slice(0,5)
                return (
                  <div className="space-y-4">
                    {/* Grafica ventas 7 dias */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ventas ultimos 7 dias</p>
                      <div className="flex items-end gap-1.5 h-24">
                        {ventasPorDia.map((v:any,i:number) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] text-slate-500 font-bold">{v.total>0?"$"+(v.total>=1000?(v.total/1000).toFixed(1)+"k":v.total.toFixed(0)):""}</span>
                            <div className="w-full rounded-t-lg transition-all" style={{ height: Math.max(4, (v.total/maxVenta)*72)+"px", background: v.total>0 ? "linear-gradient(180deg,#FF6B00,#E65F00)" : "#f1f5f9" }} />
                            <span className="text-[9px] text-slate-400 font-bold capitalize">{v.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Productos mas vendidos */}
                    {topProds.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Productos mas vendidos</p>
                      <div className="space-y-2">
                        {topProds.map((p:any,i:number) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400 w-4">{i+1}</span>
                            <span className="text-xs font-bold text-slate-700 flex-1 truncate">{p.nombre}</span>
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: (p.count/maxProd*100)+"%" , background: "linear-gradient(90deg,#FF6B00,#E65F00)" }} />
                            </div>
                            <span className="text-xs font-black text-orange-600 w-6 text-right">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    )}
                    {/* Horas pico */}
                    {horasPico.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Horas pico</p>
                      <div className="flex flex-wrap gap-2">
                        {horasPico.map((x:any) => (
                          <div key={x.h} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50">
                            <span className="text-xs font-black text-orange-700">{x.h}:00</span>
                            <span className="text-[10px] text-orange-500 font-bold">{x.c} pedido{x.c!==1?"s":""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    )}
                  </div>
                )
              })()}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Hoy', value: orders.filter(o => new Date(o.creado_en).toDateString() === new Date().toDateString() && o.status === 'entregado').reduce((a, o) => a + ((Number(o.total||0) - Number(o.costo_envio||35)) * (1 - comisionPct)), 0) },
                  { label: 'Este mes', value: orders.filter(o => new Date(o.creado_en).getMonth() === new Date().getMonth() && o.status === 'entregado').reduce((a, o) => a + ((Number(o.total||0) - Number(o.costo_envio||35)) * (1 - comisionPct)), 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-black text-slate-900">${value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-black text-slate-900 text-sm">Historial de pedidos</h3>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const entregados = orders.filter(o => o.status === "entregado");
                      if (!entregados.length) { toast.error("Sin pedidos entregados"); return; }
                      const rows = [["Numero","Fecha","Total","Items"].join(","), ...entregados.map(o => [
                        o.numero ?? o.id?.slice(-6).toUpperCase(),
                        new Date(o.creado_en).toLocaleDateString("es-MX"),
                        Number(o.total||0).toFixed(2),
                        (o.items||[]).map((i:any) => `${i.cantidad}x ${i.nombre}`).join(" | ")
                      ].map(v => `"${v}"`).join(","))].join("\n");
                      const a = document.createElement("a");
                      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows);
                      a.download = `historial_${negocio?.nombre?.replace(/\s/g,"_")}_${new Date().toISOString().slice(0,10)}.csv`;
                      a.click();
                    }} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-black rounded-xl border border-green-200 hover:bg-green-100 transition-all">
                      ⬇ CSV
                    </button>
                    <button onClick={() => {
                      const entregados = orders.filter(o => o.status === "entregado");
                      if (!entregados.length) { toast.error("Sin pedidos entregados"); return; }
                      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<historial negocio="${negocio?.nombre}" fecha="${new Date().toISOString().slice(0,10)}">\n${entregados.map(o => `  <pedido>\n    <numero>${o.numero ?? o.id?.slice(-6).toUpperCase()}</numero>\n    <fecha>${new Date(o.creado_en).toLocaleDateString("es-MX")}</fecha>\n    <total>${Number(o.total||0).toFixed(2)}</total>\n    <items>${(o.items||[]).map((i:any) => `<item><nombre>${i.nombre}</nombre><cantidad>${i.cantidad}</cantidad></item>`).join("")}</items>\n  </pedido>`).join("\n")}\n</historial>`;
                      const a = document.createElement("a");
                      a.href = "data:text/xml;charset=utf-8," + encodeURIComponent(xml);
                      a.download = `historial_${negocio?.nombre?.replace(/\s/g,"_")}_${new Date().toISOString().slice(0,10)}.xml`;
                      a.click();
                    }} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-black rounded-xl border border-blue-200 hover:bg-blue-100 transition-all">
                      ⬇ XML
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 px-4 py-2 bg-amber-50 border-b border-amber-100">⚠️ El historial se elimina automaticamente despues de 90 dias. Descarga periodicamente.</p>
                {orders.filter(o => o.status === 'entregado').map(o => {
                  const subtotal = Number(o.total || 0) - Number(o.costo_envio || 35);
                  const comision = subtotal * comisionPct;
                  const neto = subtotal - comision;
                  return (
                    <div key={o.id} className="px-4 py-3 border-b border-slate-50 last:border-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">Pedido #{o.numero ?? o.id?.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-slate-500">{new Date(o.creado_en).toLocaleDateString()}</p>
                        </div>
                        <p className="font-black text-green-600">${neto.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-400">Total: ${Number(o.total || 0).toFixed(2)}</span>
                        <span className="text-[10px] text-red-400">Comisión: -${comision.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400">Envío: -${Number(o.costo_envio || 35).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
                {orders.filter(o => o.status === 'entregado').length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay ventas registradas aun</p>
                  </div>
                )}
              </div>

              {/* SECCION RETIROS */}
              {(() => {
                const ventasNetas = orders.filter((o:any) => o.status === "entregado").reduce((a:number,o:any) => a + Number(o.total||0), 0)
                const gananciaRestaurante = ventasNetas * (1 - comisionPct)
                const retirado = retiros.filter((r:any) => r.status !== "rechazado").reduce((a:number,r:any) => a + Number(r.monto), 0)
                const disponible = Math.max(0, gananciaRestaurante - retirado)
                return (
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Retiro de ganancias</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Ventas totales</span><span className="font-bold">${ventasNetas.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Comision app ({Math.round(comisionPct*100)}%)</span><span className="font-bold text-red-500">-${(ventasNetas * comisionPct).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ya retirado</span><span className="font-bold text-slate-400">-${retirado.toFixed(2)}</span></div>
                      <div className="flex justify-between border-t border-slate-100 pt-2"><span className="font-black text-slate-900">Disponible</span><span className="font-black text-2xl text-[#FF6B00]">${disponible.toFixed(2)}</span></div>
                    </div>
                    <p className="text-xs text-slate-400">Minimo para retiro: ${retiroMinimo} MXN</p>
                    {disponible < retiroMinimo ? (
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-sm text-slate-500">Necesitas ${(retiroMinimo - disponible).toFixed(2)} MXN mas para solicitar retiro</p>
                      </div>
                    ) : (
                      <button onClick={async () => {
                        setSolicitandoRetiro(true)
                        try {
                          const token = await getToken()
                          const authHeaders = { "Content-Type": "application/json", "Authorization": "Bearer " + token }
                          const res = await fetch(import.meta.env.VITE_API_URL + "/api/retiros", {
                            method: "POST", headers: authHeaders,
                            body: JSON.stringify({ tipo_actor: "restaurante", actor_id: initialNegocio?.owner_id, monto: disponible })
                          })
                          const d = await res.json()
                          if (!res.ok) { toast.error(d.error || "Error al solicitar"); return }
                          toast.success("Solicitud enviada. Sera revisada pronto.")
                          const updated = await fetch(import.meta.env.VITE_API_URL + "/api/retiros/restaurante/" + initialNegocio?.owner_id, { headers: authHeaders }).then(r=>r.json()).catch(()=>[])
                          setRetiros(Array.isArray(updated) ? updated : [])
                        } catch { toast.error("Error de conexion") }
                        finally { setSolicitandoRetiro(false) }
                      }} disabled={solicitandoRetiro}
                        className="w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg,#FF6B00,#E65F00)" }}>
                        {solicitandoRetiro ? <Loader2 className="animate-spin" size={20} /> : null}
                        Solicitar retiro de ${disponible.toFixed(2)}
                      </button>
                    )}
                    {/* Historial retiros */}
                    {retiros.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial de retiros</p>
                        {retirosLoading ? <div className="flex justify-center py-2"><Loader2 className="animate-spin text-orange-400" size={20} /></div>
                        : retiros.map((r:any) => (
                          <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">${Number(r.monto).toFixed(2)} MXN</p>
                              <p className="text-xs text-slate-400">{new Date(r.creado_en).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"})}</p>
                            </div>
                            <span className={"text-[10px] font-black px-3 py-1.5 rounded-full text-white " + (r.status==="pagado"?"bg-green-500":r.status==="rechazado"?"bg-red-500":"bg-amber-400")}>
                              {r.status==="pagado"?"Pagado":r.status==="rechazado"?"Rechazado":"Pendiente"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

            </motion.div>
          )}

          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Perfil del negocio</h2>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center gap-4 pb-3 border-b border-slate-50">
                  <div className="relative">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl overflow-hidden flex items-center justify-center">
                      {negocio?.imagen_url ? <img src={imgUrl(negocio.imagen_url, 200)} className="w-full h-full object-cover" /> : <Utensils size={28} className="text-[#FF6B00]" />}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF6B00] rounded-full flex items-center justify-center cursor-pointer shadow-md">
                      {uploadingImg ? <Loader2 size={12} className="text-white animate-spin" /> : <ImageIcon size={12} className="text-white" />}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        if (!e.target.files?.[0]) return;
                        setUploadingImg(true);
                        try {
                          const fd = new FormData();
                          fd.append('file', e.target.files[0]);
                          fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
                          const r = await fetch('https://api.cloudinary.com/v1_1/' + import.meta.env.VITE_CLOUDINARY_CLOUD_NAME + '/image/upload', { method: 'POST', body: fd });
                          const d = await r.json();
                          if (d.secure_url) {
                            await authFetch(`/api/negocios/${negocio.id}/imagen`, { method: 'PATCH', body: JSON.stringify({ imagen_url: d.secure_url }) });
                            setNegocio((n: any) => ({ ...n, imagen_url: d.secure_url }));
                            toast.success('Foto actualizada');
                          }
                        } catch { toast.error('Error al subir foto'); }
                        finally { setUploadingImg(false); }
                      }} />
                    </label>
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{negocio?.nombre}</p>
                    <p className="text-sm text-slate-500">{negocio?.tipo === 'restaurante' ? 'Restaurante' : 'Tienda'}</p>
                    <button onClick={() => setShowRatings(true)} className="flex items-center gap-1 mt-1 hover:opacity-70 transition-opacity">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-slate-600">{Number(negocio?.rating || 0).toFixed(1)} ({orders.filter(o => o.rating_restaurante).length} reseñas)</span>
                      <span className="text-[10px] text-slate-400">▸</span>
                    </button>
                  </div>
                </div>
                {editingProfile ? (
                  <div className="space-y-3 pt-2">
                    {[
                      { key: 'nombre', label: 'Nombre', type: 'text' },
                      { key: 'direccion', label: 'Dirección', type: 'text' },
                      { key: 'telefono', label: 'Teléfono', type: 'tel' },
                      { key: 'descripcion', label: 'Descripción', type: 'text' },
                    ].map(({ key, label, type }) => (
                      <div key={key}>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
                        <input type={type} value={(profileForm as any)[key]}
                          onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00] border border-slate-200" />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingProfile(false)}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">Cancelar</button>
                      <button disabled={savingProfile} onClick={async () => {
                        setSavingProfile(true);
                        try {
                          const updated = await authFetch<any>(`/api/negocios/${negocio.id}/perfil`, { method: 'PATCH', body: JSON.stringify(profileForm) });
                          setNegocio((n: any) => ({ ...n, ...updated }));
                          setEditingProfile(false);
                          toast.success('Perfil actualizado');
                        } catch { toast.error('Error al guardar'); }
                        finally { setSavingProfile(false); }
                      }} className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#FF6B00,#E65F00)' }}>
                        {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {[
                      { label: 'Nombre', value: negocio?.nombre },
                      { label: 'Dirección', value: negocio?.direccion },
                      { label: 'Teléfono', value: negocio?.telefono },
                      { label: 'Descripción', value: negocio?.descripcion },
                      { label: 'Estado', value: negocio?.esta_abierto ? 'Abierto' : 'Cerrado' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-none">
                        <span className="text-sm text-slate-500 font-medium">{label}</span>
                        <span className="text-sm font-bold text-slate-900 text-right max-w-[60%]">{value || '-'}</span>
                      </div>
                    ))}
                    <button onClick={() => {
                      setProfileForm({ nombre: negocio?.nombre || '', direccion: negocio?.direccion || '', telefono: negocio?.telefono || '', descripcion: negocio?.descripcion || '' });
                      setEditingProfile(true);
                    }} className="w-full py-2.5 mt-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 border-[#FF6B00] text-[#FF6B00]">
                      <Edit2 size={14} /> Editar perfil
                    </button>
                  </>
                )}
              </div>
              {/* HORARIOS */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Horarios de atencion</p>
                  <button onClick={async () => {
                    setSavingHorarios(true);
                    try {
                      await authFetch(`/api/negocios/${negocio.id}/horarios`, { method: "PATCH", body: JSON.stringify({ horarios }) });
                      toast.success("Horarios guardados");
                    } catch { toast.error("Error al guardar horarios"); }
                    finally { setSavingHorarios(false); }
                  }} disabled={savingHorarios} className="px-3 py-1.5 bg-[#FF6B00] text-white text-xs font-black rounded-xl disabled:opacity-50 flex items-center gap-1">
                    {savingHorarios ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                  </button>
                </div>
                <div className="space-y-2">
                  {DIAS.map(dia => (
                    <div key={dia} className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600 w-8 shrink-0">{dia}</span>
                      <button onClick={() => setHorarios(h => ({ ...h, [dia]: { ...h[dia], abierto: !h[dia].abierto } }))}
                        className={`w-10 h-5 rounded-full relative transition-all shrink-0 ${horarios[dia]?.abierto ? "bg-[#FF6B00]" : "bg-slate-200"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${horarios[dia]?.abierto ? "right-0.5" : "left-0.5"}`} />
                      </button>
                      {horarios[dia]?.abierto ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input type="time" value={horarios[dia]?.desde || "09:00"} onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia], desde: e.target.value } }))}
                            className="flex-1 px-2 py-1 bg-slate-50 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-[#FF6B00]" />
                          <span className="text-xs text-slate-400">-</span>
                          <input type="time" value={horarios[dia]?.hasta || "21:00"} onChange={e => setHorarios(h => ({ ...h, [dia]: { ...h[dia], hasta: e.target.value } }))}
                            className="flex-1 px-2 py-1 bg-slate-50 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-[#FF6B00]" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 flex-1">Cerrado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 px-4 py-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
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
                  style={darkMode ? { background: "linear-gradient(135deg,#FF6B00,#E65F00)" } : {}}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${darkMode ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuenta bancaria</p>
                <p className="text-xs text-slate-400 mb-3">{stripeConectado ? "✅ Cuenta conectada — recibes pagos automaticamente" : "Conecta tu cuenta para recibir pagos de tus ventas"}</p>
                <button onClick={async () => {
                  if (stripeConectado) return
                  setStripeConectando(true)
                  try {
                    const token = await getToken()
                    const res = await fetch(import.meta.env.VITE_API_URL + "/api/stripe/connect/onboarding", {
                      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
                      body: JSON.stringify({ tipo: "restaurante", actorId: negocio.id, email: negocio.email, nombre: negocio.nombre })
                    })
                    const d = await res.json()
                    if (!d.url) { toast.error(d.error || "Error al conectar"); return }
                    await Browser.open({ url: d.url })
                    // Detectar cuando el usuario cierra el navegador y re-verificar el status
                    const listener = await Browser.addListener('browserFinished', async () => {
                      listener.remove()
                      try {
                        const tok = await getToken()
                        const status = await fetch(import.meta.env.VITE_API_URL + "/api/stripe/connect/status/restaurante/" + negocio.id, {
                          headers: { "Authorization": "Bearer " + tok }
                        }).then(r => r.json())
                        if (status?.conectado) {
                          setStripeConectado(true)
                          toast.success("¡Cuenta bancaria conectada!")
                        } else {
                          toast.info("Si completaste el proceso, puede tomar unos minutos en activarse.")
                        }
                      } catch {}
                      setStripeConectando(false)
                    })
                  } catch { toast.error("Error al conectar cuenta"); setStripeConectando(false) }
                }} disabled={stripeConectado || stripeConectando}
                  className="w-full py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: stripeConectado ? "#22c55e" : "linear-gradient(135deg,#FF6B00,#E65F00)" }}>
                  {stripeConectando ? <Loader2 className="animate-spin" size={16} /> : null}
                  {stripeConectado ? "✅ Cuenta conectada" : stripeConectando ? "Conectando..." : "💳 Conectar cuenta bancaria"}
                </button>
              </div>
              {appConfig.whatsapp && (
                <a href={appConfig.whatsapp} target="_blank" rel="noreferrer"
                  className="w-full py-4 bg-green-50 text-green-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-green-100 transition-all">
                  💬 Contactar soporte por WhatsApp
                </a>
              )}

              <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                <LogOut size={18} /> Cerrar sesion
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL ACEPTAR PEDIDO */}
      <AnimatePresence>
        {confirmandoPedido && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-white w-full rounded-t-3xl p-6 space-y-4">
              <h3 className="font-black text-slate-900 text-lg">Aceptar Pedido #{confirmandoPedido.numero}</h3>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-3">¿Cuánto tiempo de preparación?</p>
                <div className="flex flex-wrap gap-2">
                  {['10 min','15 min','20 min','30 min','45 min','60 min'].map(t => (
                    <button key={t} onClick={() => setTiempoAceptar(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all ${tiempoAceptar === t ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]' : 'border-slate-200 text-slate-500'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setConfirmandoPedido(null)} disabled={actionLoading} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl disabled:opacity-50">Cancelar</button>
                <button onClick={aceptarConTiempo} disabled={actionLoading} className="flex-1 py-3 bg-[#FF6B00] text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Aceptar — {tiempoAceptar}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL RECHAZAR PEDIDO */}
      <AnimatePresence>
        {rechazandoPedido && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-white w-full rounded-t-3xl p-6 space-y-4">
              <h3 className="font-black text-slate-900 text-lg">Rechazar Pedido #{rechazandoPedido.numero}</h3>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-3">Motivo (opcional)</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Sin ingredientes','Cocina cerrada','Demasiados pedidos','Otro'].map(r => (
                    <button key={r} onClick={() => setRazonRechazo(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${razonRechazo === r ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500'}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <input value={razonRechazo} onChange={e => setRazonRechazo(e.target.value)}
                  placeholder="O escribe el motivo..."
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setRechazandoPedido(null)} disabled={actionLoading} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl disabled:opacity-50">Volver</button>
                <button onClick={rechazarPedidoConfirm} disabled={actionLoading} className="flex-1 py-3 bg-red-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Rechazar pedido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL RATINGS */}
      <AnimatePresence>
        {showRatings && (() => {
          const rated = orders.filter(o => o.rating_restaurante);
          const total = rated.length;
          const starCounts = [5,4,3,2,1].map(s => ({ s, n: rated.filter(o => o.rating_restaurante === s).length }));
          const phrases: Record<string, number> = {};
          rated.forEach(o => {
            if (o.comentario_rating) {
              const frase = o.comentario_rating.split(' | ')[0]?.trim();
              if (frase) phrases[frase] = (phrases[frase] || 0) + 1;
            }
          });
          const topPhrases = Object.entries(phrases).sort((a, b) => b[1] - a[1]);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[70] flex items-end">
              <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
                className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900">Reseñas del negocio</h3>
                  <button onClick={() => setShowRatings(false)}><X size={22} className="text-slate-400" /></button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-5xl font-black text-slate-900">{total ? Number(negocio?.rating || 0).toFixed(1) : '—'}</p>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= Math.round(negocio?.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} />)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{total} reseña{total !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {starCounts.map(({ s, n }) => (
                      <div key={s} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-3">{s}</span>
                        <Star size={10} className="text-yellow-400 fill-yellow-400 shrink-0" />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: total ? `${(n / total) * 100}%` : '0%' }} />
                        </div>
                        <span className="text-xs text-slate-400 w-4 text-right">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {topPhrases.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lo que más mencionan</p>
                    <div className="space-y-2">
                      {topPhrases.map(([frase, count]) => (
                        <div key={frase}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-slate-700 font-medium">{frase}</span>
                            <span className="text-xs text-slate-400 font-bold">{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(count / topPhrases[0][1]) * 100}%`, background: 'linear-gradient(135deg,#FF6B00,#E65F00)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {total === 0 && <p className="text-center text-slate-400 py-6">Aún no tienes reseñas</p>}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL CANCELAR */}
      <AnimatePresence>
        {cancelando && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Cancelar pedido #{cancelando.numero}</h3>
                <button onClick={() => setCancelando(null)}><X size={22} className="text-slate-400" /></button>
              </div>
              <p className="text-sm text-slate-500">Selecciona el motivo:</p>
              <div className="space-y-2">
                {['No tenemos ingredientes','Estamos muy ocupados','Cerramos por el momento','Pedido duplicado','Otro'].map(r => (
                  <button key={r} onClick={() => setRazonCancel(r)}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-left border-2 transition-all ${razonCancel === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-100 text-slate-700 bg-slate-50'}`}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancelando(null)} disabled={actionLoading} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl text-sm disabled:opacity-50">Volver</button>
                <button onClick={async () => {
                  if (!razonCancel) { toast.error('Selecciona un motivo'); return; }
                  setActionLoading(true);
                  try {
                    await authFetch(`/api/negocios/pedidos/${cancelando.id}/cancelar`, { method: 'PATCH', body: JSON.stringify({ razon: razonCancel }) });
                    setOrders(prev => prev.map(ord => ord.id === cancelando.id ? { ...ord, status: 'cancelado' } : ord));
                    toast.success('Pedido cancelado');
                    setCancelando(null); setRazonCancel('');
                  } catch { toast.error('Error al cancelar'); }
                  finally { setActionLoading(false); }
                }} disabled={!razonCancel || actionLoading} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-2 z-40" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex justify-around">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 relative transition-all flex-1 ${tab === id ? 'text-[#FF6B00]' : 'text-slate-400'}`}>
              <div className="relative">
                <Icon size={20} strokeWidth={tab === id ? 2.5 : 2} />
                {(badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tight ${tab === id ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-black text-slate-900 text-lg mb-1">¿Cerrar sesión?</h3>
            <p className="text-slate-500 text-sm mb-6">Tendrás que iniciar sesión nuevamente para acceder.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl">Cancelar</button>
              <button onClick={() => signOut()} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl">Cerrar sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
