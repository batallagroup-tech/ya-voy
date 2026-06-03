import { toast } from 'sonner'
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useClerk, useAuth } from '@clerk/clerk-react';
import {
  LayoutDashboard, ShoppingBag, Utensils, TrendingUp, Tag, Bike,
  Settings, LogOut, Plus, Edit2, Trash2, X,
  DollarSign, Star, Clock, Power, Loader2, ChevronRight,
  Image as ImageIcon, Save
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Browser } from '@capacitor/browser';

const CATEGORIES = ['Tacos','Hamburguesas','Pizza','Sushi','Postres','Bebidas','Comida Corrida','Alitas','Ensaladas','Mariscos'];

interface Props { negocio: any }

export default function Dashboard({ negocio: initialNegocio }: Props) {
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const authFetch = async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = await getToken();
    return apiFetch<T>(path, options, token);
  };
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ya_voy_dark") === "1")
  const [appConfig, setAppConfig] = useState<Record<string,string>>({})
  const [tab, setTab] = useState<'overview'|'orders'|'menu'|'finance'|'cupones'|'profile'>('overview');
  const [negocio, setNegocio] = useState<any>(initialNegocio);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false });
  const [uploadingImg, setUploadingImg] = useState(false);
  const [cancelando, setCancelando] = useState<{id:string,numero:any}|null>(null);
  const [razonCancel, setRazonCancel] = useState('');
  const DIAS = ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'];
  const [horarios, setHorarios] = useState<Record<string,{abierto:boolean,desde:string,hasta:string}>>(() => {
    const base: Record<string,{abierto:boolean,desde:string,hasta:string}> = {};
    ['Lun','Mar','Mie','Jue','Vie','Sab','Dom'].forEach(d => { base[d] = { abierto: true, desde: '09:00', hasta: '21:00' }; });
    return base;
  });
  const [savingHorarios, setSavingHorarios] = useState(false);
  const [stripeConectando, setStripeConectando] = useState(false)
  const [stripeConectado, setStripeConectado] = useState(false)
  const [retiros, setRetiros] = useState<any[]>([])
  const [repartidoresDisponibles, setRepartidoresDisponibles] = useState<{total:number;nombres:string[]}>({total:0,nombres:[]})
  const [cupones, setCupones] = useState<any[]>([])
  const [cuponesLoading, setCuponesLoading] = useState(false)
  const [cuponForm, setCuponForm] = useState({ nombre: '', codigo: '', tipo: 'porcentaje', valor: '', usos_max: '100', minimo_compra: '', expira_en: '', descripcion: '' })
  const [creandoCupon, setCreandoCupon] = useState(false)
  const [cuponError, setCuponError] = useState('')
  const [retirosLoading, setRetirosLoading] = useState(false)
  const [solicitandoRetiro, setSolicitandoRetiro] = useState(false)
  const [retiroMinimo, setRetiroMinimo] = useState(50)
  const [comisionPct, setComisionPct] = useState(0.18)
  const prevNuevosRef = useRef(0);

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
  useEffect(() => {
    if (tab !== 'orders' && tab !== 'overview') return;
    const interval = setInterval(() => load(), 3000);
    return () => clearInterval(interval);
  }, [load, tab]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await authFetch(`/api/negocios/pedidos/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch { toast.error('Ocurrio un error'); }
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
      if (editingProduct) {
        const updated = await authFetch<any>(`/api/negocios/productos/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify({ ...productForm, precio: parseFloat(productForm.precio) }) });
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
      } else {
        const nuevo = await authFetch<any>('/api/negocios/productos', { method: 'POST', body: JSON.stringify({ ...productForm, precio: parseFloat(productForm.precio), negocio_id: negocio.id }) });
        setProducts(prev => [...prev, nuevo]);
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false });
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
    { id: 'overview', label: 'Inicio', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag, badge: statsToday.nuevos },
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'finance', label: 'Finanzas', icon: TrendingUp },
    { id: 'cupones', label: 'Cupones', icon: Tag },
    { id: 'profile', label: 'Perfil', icon: Settings },
  ];

  const orderStatusConfig: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
    pendiente:  { label: 'Nuevo',      color: 'bg-blue-500',   next: 'preparando', nextLabel: 'Aceptar pedido' },
    preparando: { label: 'Preparando', color: 'bg-orange-500', next: 'listo',      nextLabel: 'Marcar listo' },
    listo:      { label: 'Listo',      color: 'bg-green-500' },
    en_camino:  { label: 'En Camino',  color: 'bg-purple-500' },
    nuevo:      { label: 'Nuevo',      color: 'bg-blue-500',   next: 'preparando', nextLabel: 'Aceptar pedido' },
    entregado:  { label: 'Entregado',  color: 'bg-slate-400' },
    cancelado:  { label: 'Cancelado',  color: 'bg-red-500' },
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col overflow-x-hidden w-full">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
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
          <button onClick={toggleActivo} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${negocio?.esta_abierto ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            <Power size={14} className="inline mr-1" />{negocio?.esta_abierto ? 'Abierto' : 'Cerrado'}
          </button>
          <button onClick={() => signOut()} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
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
                  <div className="space-y-1">
                    {o.items?.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.cantidad}x {item.nombre}</span>
                        <span className="font-bold text-slate-900">${(item.precio * item.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <p className="font-black text-slate-900">Total: ${Number(o.total || 0).toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                      {(o.status === 'listo' || o.status === 'en_camino') && o.codigo_restaurante && (
                        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                          <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Codigo repartidor</p>
                          <p className="text-lg font-black text-green-700 tracking-widest">{o.codigo_restaurante}</p>
                        </div>
                      )}
                      {(o.status === 'nuevo' || o.status === 'preparando') && (
                        <button onClick={async () => {
                          if (!window.confirm('Cancelar este pedido?')) return;
                          try {
                            await authFetch(`/api/negocios/pedidos/${o.id}/cancelar`, { method: 'PATCH' });
                            setOrders(prev => prev.map(ord => ord.id === o.id ? { ...ord, status: 'cancelado' } : ord));
                            toast.success('Pedido cancelado');
                          } catch { toast.error('Error al cancelar'); }
                        }} className="px-3 py-2 bg-red-50 text-red-500 text-xs font-black rounded-xl border border-red-200 hover:bg-red-100 transition-all whitespace-nowrap">
                          Cancelar
                        </button>
                      )}
                      {orderStatusConfig[o.status]?.next && (
                        <button onClick={() => updateOrderStatus(o.id, orderStatusConfig[o.status].next!)}
                          className="px-4 py-2 bg-[#FF6B00] text-white text-xs font-black rounded-xl hover:bg-[#E65F00] transition-all whitespace-nowrap">
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
                <button onClick={() => { setEditingProduct(null); setProductForm({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false }); setShowProductForm(true); }}
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
                      {productForm.imagen_url ? <img src={productForm.imagen_url} className="w-full h-full object-cover" /> : <span className="text-2xl">🍽️</span>}
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
              {products.length === 0 && !showProductForm ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                  <Utensils size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay productos en el menu</p>
                  <p className="text-sm mt-1">Agrega tu primer producto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm truncate">{p.nombre}</p>
                          {p.destacado && <span className="text-[10px] bg-orange-100 text-orange-600 font-black px-2 py-0.5 rounded-full">Destacado</span>}
                        </div>
                        <p className="text-xs text-slate-500">{p.categoria} · ${p.precio}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.disponible ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <button onClick={() => { setEditingProduct(p); setProductForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio.toString(), categoria: p.categoria, disponible: p.disponible, imagen_url: p.imagen_url || '', destacado: p.destacado }); setShowProductForm(true); }}
                          className="p-2 text-slate-400 hover:text-[#FF6B00] transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                {orders.filter(o => o.status === 'entregado').map(o => (
                  <div key={o.id} className="px-4 py-3 border-b border-slate-50 last:border-none flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Pedido #{o.numero ?? o.id?.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-slate-500">{new Date(o.creado_en).toLocaleDateString()}</p>
                    </div>
                    <p className="font-black text-green-600">${Number(o.total || 0).toFixed(2)}</p>
                  </div>
                ))}
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

          {tab === 'cupones' && (
            <motion.div key='cupones' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='p-4 space-y-4'>
              <h2 className='text-xl font-black text-slate-900'>Mis Cupones</h2>
              {/* FORMULARIO CREAR CUPON */}
              <div className='bg-white rounded-2xl border border-slate-100 p-4 space-y-3'>
                <p className='text-xs font-bold text-slate-500 uppercase tracking-wider'>Crear cupon</p>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Nombre</label><input value={cuponForm.nombre} onChange={e => setCuponForm(p => ({...p, nombre: e.target.value}))} placeholder='Ej: Descuento bienvenida' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                  <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Codigo</label><input value={cuponForm.codigo} onChange={e => setCuponForm(p => ({...p, codigo: e.target.value.toUpperCase()}))} placeholder='Ej: BIENVENIDO20' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400 font-black tracking-wider' /></div>
                  <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Tipo</label><select value={cuponForm.tipo} onChange={e => setCuponForm(p => ({...p, tipo: e.target.value}))} className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200'><option value='porcentaje'>Porcentaje (%)</option><option value='fijo'>Monto fijo (MXN)</option></select></div>
                  <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Valor {cuponForm.tipo === 'porcentaje' ? '(%)' : '(MXN)'}</label><input type='number' value={cuponForm.valor} onChange={e => setCuponForm(p => ({...p, valor: e.target.value}))} placeholder={cuponForm.tipo === 'porcentaje' ? '20' : '50'} className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                  <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Compra minima (MXN)</label><input type='number' value={cuponForm.minimo_compra} onChange={e => setCuponForm(p => ({...p, minimo_compra: e.target.value}))} placeholder='0' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                  <div className='space-y-1'><label className='text-xs font-bold text-slate-500'>Usos maximos</label><input type='number' value={cuponForm.usos_max} onChange={e => setCuponForm(p => ({...p, usos_max: e.target.value}))} placeholder='100' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                  <div className='col-span-2 space-y-1'><label className='text-xs font-bold text-slate-500'>Descripcion (opcional)</label><input value={cuponForm.descripcion} onChange={e => setCuponForm(p => ({...p, descripcion: e.target.value}))} placeholder='Ej: 20% de descuento en tu primera orden' className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                  <div className='col-span-2 space-y-1'><label className='text-xs font-bold text-slate-500'>Fecha expiracion (opcional)</label><input type='datetime-local' value={cuponForm.expira_en} onChange={e => setCuponForm(p => ({...p, expira_en: e.target.value}))} className='w-full px-3 py-2 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-orange-400' /></div>
                </div>
                {cuponError && <p className='text-xs text-red-500 font-bold'>{cuponError}</p>}
                <button onClick={async () => {
                  if (!cuponForm.codigo || !cuponForm.valor) { setCuponError('Codigo y valor son requeridos'); return }
                  setCreandoCupon(true); setCuponError('')
                  try {
                    const res = await fetch(import.meta.env.VITE_API_URL + '/api/negocios/' + negocio.id + '/cupones', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...cuponForm, valor: parseFloat(cuponForm.valor), usos_max: parseInt(cuponForm.usos_max) || 100, minimo_compra: parseFloat(cuponForm.minimo_compra) || 0 })
                    })
                    const d = await res.json()
                    if (!res.ok) { setCuponError(d.error || 'Error al crear'); return }
                    setCupones(prev => [d, ...prev])
                    setCuponForm({ nombre: '', codigo: '', tipo: 'porcentaje', valor: '', usos_max: '100', minimo_compra: '', expira_en: '', descripcion: '' })
                    toast.success('Cupon creado')
                  } catch { setCuponError('Error de conexion') }
                  finally { setCreandoCupon(false) }
                }} disabled={creandoCupon || !cuponForm.codigo || !cuponForm.valor}
                  className='w-full py-3 rounded-2xl text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2'
                  style={{ background: 'linear-gradient(135deg,#FF6B00,#E65F00)' }}>
                  {creandoCupon ? <Loader2 size={16} className='animate-spin' /> : <Plus size={16} />} Crear cupon
                </button>
              </div>
              {/* LISTA CUPONES */}
              {cuponesLoading ? <div className='flex justify-center py-8'><Loader2 className='animate-spin text-orange-500' size={28} /></div>
              : cupones.length === 0 ? <div className='text-center py-8 text-slate-400'><Tag size={32} className='mx-auto mb-2 opacity-30' /><p>Sin cupones creados</p></div>
              : cupones.map(cup => (
                <div key={cup.id} className='bg-white rounded-2xl border border-slate-100 p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <p className='font-black text-slate-900 tracking-wider'>{cup.codigo}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${cup.activo ? 'bg-green-500' : 'bg-slate-400'}`}>{cup.activo ? 'Activo' : 'Inactivo'}</span>
                        <span className='text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700'>{cup.tipo === 'porcentaje' ? cup.valor + '%' : '$' + cup.valor + ' MXN'}</span>
                      </div>
                      {cup.nombre && <p className='text-sm font-bold text-slate-700'>{cup.nombre}</p>}
                      {cup.descripcion && <p className='text-xs text-slate-500'>{cup.descripcion}</p>}
                      <div className='flex gap-3 mt-1 text-xs text-slate-400'>
                        <span>Usos: {cup.usos_actual}/{cup.usos_max}</span>
                        {Number(cup.minimo_compra) > 0 && <span>Min: </span>}
                        {cup.expira_en && <span>Expira: {new Date(cup.expira_en).toLocaleDateString('es-MX')}</span>}
                      </div>
                    </div>
                    <div className='flex gap-2'>
                      <button onClick={async () => {
                        await fetch(import.meta.env.VITE_API_URL + '/api/negocios/' + negocio.id + '/cupones/' + cup.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !cup.activo }) })
                        setCupones(prev => prev.map(c => c.id === cup.id ? {...c, activo: !cup.activo} : c))
                      }} className={`text-xs font-black px-3 py-1.5 rounded-xl border ${cup.activo ? 'border-red-200 text-red-500 bg-red-50' : 'border-green-200 text-green-600 bg-green-50'}`}>
                        {cup.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={async () => {
                        await fetch(import.meta.env.VITE_API_URL + '/api/negocios/' + negocio.id + '/cupones/' + cup.id, { method: 'DELETE' })
                        setCupones(prev => prev.filter(c => c.id !== cup.id))
                        toast.success('Cupon eliminado')
                      }} className='text-xs font-black px-3 py-1.5 rounded-xl border border-red-200 text-red-500 bg-red-50'>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Perfil del negocio</h2>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center gap-4 pb-3 border-b border-slate-50">
                  <div className="relative">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl overflow-hidden flex items-center justify-center">
                      {negocio?.imagen_url ? <img src={negocio.imagen_url} className="w-full h-full object-cover" /> : <Utensils size={28} className="text-[#FF6B00]" />}
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
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-slate-600">{Number(negocio?.rating || 0).toFixed(1)} ({orders.filter(o => o.rating_restaurante).length} resenas)</span>
                    </div>
                  </div>
                </div>
                {[
                  { label: 'Direccion', value: negocio?.direccion },
                  { label: 'Telefono', value: negocio?.telefono },
                  { label: 'Estado', value: negocio?.esta_abierto ? 'Abierto' : 'Cerrado' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-none">
                    <span className="text-sm text-slate-500 font-medium">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{value || '-'}</span>
                  </div>
                ))}
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
                    if (d.url) await Browser.open({ url: d.url })
                  } catch { toast.error("Error al conectar cuenta") }
                  finally { setStripeConectando(false) }
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

              <button onClick={() => signOut()} className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                <LogOut size={18} /> Cerrar sesion
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

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
                <button onClick={() => setCancelando(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl text-sm">Volver</button>
                <button onClick={async () => {
                  if (!razonCancel) { toast.error('Selecciona un motivo'); return; }
                  try {
                    await authFetch(`/api/negocios/pedidos/${cancelando.id}/cancelar`, { method: 'PATCH', body: JSON.stringify({ razon: razonCancel }) });
                    setOrders(prev => prev.map(ord => ord.id === cancelando.id ? { ...ord, status: 'cancelado' } : ord));
                    toast.success('Pedido cancelado');
                    setCancelando(null); setRazonCancel('');
                  } catch { toast.error('Error al cancelar'); }
                }} disabled={!razonCancel} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl text-sm disabled:opacity-50">
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
              className={`flex flex-col items-center gap-1 px-3 py-1 relative transition-all ${tab === id ? 'text-[#FF6B00]' : 'text-slate-400'}`}>
              <div className="relative">
                <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
                {(badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tight ${tab === id ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
