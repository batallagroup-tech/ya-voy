import { toast } from 'sonner'
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useClerk } from '@clerk/clerk-react';
import {
  LayoutDashboard, ShoppingBag, Utensils, TrendingUp,
  Settings, LogOut, Plus, Edit2, Trash2, Check, X,
  DollarSign, Star, Clock, Power, Loader2, ChevronRight,
  Image as ImageIcon, Ticket, Users, Save
} from 'lucide-react';
import { apiFetch } from '../lib/api';

const CATEGORIES = ['Tacos','Hamburguesas','Pizza','Sushi','Postres','Bebidas','Comida Corrida','Alitas','Ensaladas','Mariscos'];
const DAYS = [{id:'mon',label:'Lunes'},{id:'tue',label:'Martes'},{id:'wed',label:'Mi�rcoles'},{id:'thu',label:'Jueves'},{id:'fri',label:'Viernes'},{id:'sat',label:'S�bado'},{id:'sun',label:'Domingo'}];

interface Props { negocio: any }

export default function Dashboard({ negocio: initialNegocio }: Props) {
  const { signOut } = useClerk();
  const [tab, setTab] = useState<'overview'|'orders'|'menu'|'profile'|'finance'>('overview');
  const [negocio, setNegocio] = useState<any>(initialNegocio);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Producto form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false });
  const [uploadingImg, setUploadingImg] = useState(false);

  const load = useCallback(async () => {
    if (!negocio?.id) return;
    setLoading(true);
    try {
      const [ords, prods] = await Promise.all([
        apiFetch<any[]>(`/api/negocios/${negocio.id}/pedidos`).catch(() => []),
        apiFetch<any[]>(`/api/negocios/${negocio.id}/productos`).catch(() => []),
      ]);
      setOrders(ords);
      setProducts(prods);
    } finally { setLoading(false); }
  }, [negocio?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(() => { if (tab === "orders" || tab === "overview") load() }, 2000);
    return () => clearInterval(interval);
  }, [load]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiFetch(`/api/negocios/pedidos/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Ocurri\u00f3 un error, intenta de nuevo") }
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
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Ocurri\u00f3 un error, intenta de nuevo") } finally { setUploadingImg(false); }
  };
  const saveProduct = async () => {
    if (!productForm.nombre || !productForm.precio) return;
    setSaving(true);
    try {
      if (editingProduct) {
        const updated = await apiFetch<any>(`/api/negocios/productos/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify({ ...productForm, precio: parseFloat(productForm.precio) }) });
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
      } else {
        const nuevo = await apiFetch<any>('/api/negocios/productos', { method: 'POST', body: JSON.stringify({ ...productForm, precio: parseFloat(productForm.precio), negocio_id: negocio.id }) });
        setProducts(prev => [...prev, nuevo]);
      }
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Ocurri\u00f3 un error, intenta de nuevo") } finally { setSaving(false); }
  };

  const deleteProduct = async (id: string) => {
    try {
      await apiFetch(`/api/negocios/productos/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Ocurri\u00f3 un error, intenta de nuevo") }
  };

  const toggleActivo = async () => {
    try {
      const updated = await apiFetch<any>(`/api/negocios/${negocio.id}/toggle`, { method: 'PATCH' });
      setNegocio(updated);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Ocurri\u00f3 un error, intenta de nuevo") }
  };

  const tiempoTranscurrido = (fecha: string) => {
    const mins = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `hace ${hrs}h ${mins % 60}min`;
  };

  const statsToday = {
    pedidos: orders.filter(o => new Date(o.creado_en).toDateString() === new Date().toDateString()).length,
    ingresos: orders.filter(o => new Date(o.creado_en).toDateString() === new Date().toDateString() && o.status === 'entregado').reduce((a, o) => a + (o.total || 0), 0),
    nuevos: orders.filter(o => o.status === 'nuevo').length,
  };

  const tabs = [
    { id: 'overview', label: 'Inicio', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag, badge: statsToday.nuevos },
    { id: 'menu', label: 'Men�', icon: Utensils },
    { id: 'finance', label: 'Finanzas', icon: TrendingUp },
    { id: 'profile', label: 'Perfil', icon: Settings },
  ];

  const orderStatusConfig: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
    pendiente:  { label: 'Nuevo',       color: 'bg-blue-500',   next: 'preparando',  nextLabel: 'Aceptar pedido' },
    preparando: { label: 'Preparando',  color: 'bg-orange-500', next: 'listo',       nextLabel: 'Marcar listo' },
    listo:      { label: 'Listo ✓',    color: 'bg-green-500' },
    en_camino:  { label: 'En Camino',   color: 'bg-purple-500' },
    nuevo:      { label: 'Nuevo',       color: 'bg-blue-500',   next: 'preparando',  nextLabel: 'Aceptar pedido' },
    entregado:  { label: 'Entregado',   color: 'bg-slate-400' },
    cancelado:  { label: 'Cancelado',   color: 'bg-red-500' },
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">

      {/* Header */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
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
                    <p className="text-sm font-medium">No hay pedidos a�n</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ORDERS */}
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
                        <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                          <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">C�digo para repartidor</p>
                          <p className="text-lg font-black text-green-700 tracking-widest">{o.codigo_entrega}</p>
                        </div>
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

          {/* MENU */}
          {tab === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Men� Digital</h2>
                <button onClick={() => { setEditingProduct(null); setProductForm({ nombre: '', descripcion: '', precio: '', categoria: CATEGORIES[0], disponible: true, imagen_url: '', destacado: false }); setShowProductForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white text-sm font-bold rounded-xl hover:bg-[#E65F00] transition-all">
                  <Plus size={16} /> Agregar
                </button>
              </div>

              {showProductForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                  <h3 className="font-black text-slate-900">{editingProduct ? 'Editar producto' : 'Nuevo producto'}</h3>
                  {/* Imagen producto */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {productForm.imagen_url ? <img src={productForm.imagen_url} className="w-full h-full object-cover" /> : <span className="text-2xl">🍽️</span>}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <div className="px-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 text-center hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                        {uploadingImg ? <span className="animate-spin">⏳</span> : '📷'} {uploadingImg ? 'Subiendo...' : 'Subir imagen'}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadImg(e.target.files[0]); }} />
                    </label>
                  </div>
                  <input value={productForm.nombre} onChange={e => setProductForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del producto"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#FF6B00]" />
                  <textarea value={productForm.descripcion} onChange={e => setProductForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripci�n (opcional)" rows={2}
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
                  <p className="font-medium">No hay productos en el men�</p>
                  <p className="text-sm mt-1">Agrega tu primer producto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">{p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-400" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm truncate">{p.nombre}</p>
                          {p.destacado && <span className="text-[10px] bg-orange-100 text-orange-600 font-black px-2 py-0.5 rounded-full">★ Destacado</span>}
                        </div>
                        <p className="text-xs text-slate-500">{p.categoria} · ${p.precio}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.disponible ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <button onClick={() => { setEditingProduct(p); setProductForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio.toString(), categoria: p.categoria, disponible: p.disponible, imagen_url: p.imagen_url || '', destacado: p.destacado }); setShowProductForm(true); }}
                          className="p-2 text-slate-400 hover:text-[#FF6B00] transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* FINANCE */}
          {tab === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Finanzas</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Hoy', value: orders.filter(o => new Date(o.creado_en).toDateString() === new Date().toDateString() && o.status === 'entregado').reduce((a, o) => a + (o.total || 0), 0) },
                  { label: 'Este mes', value: orders.filter(o => new Date(o.creado_en).getMonth() === new Date().getMonth() && o.status === 'entregado').reduce((a, o) => a + (o.total || 0), 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-black text-slate-900">${value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50">
                  <h3 className="font-black text-slate-900 text-sm">Historial de pedidos</h3>
                </div>
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
                    <p className="text-sm">No hay ventas registradas a�n</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PROFILE */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h2 className="text-xl font-black text-slate-900">Perfil del negocio</h2>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center gap-4 pb-3 border-b border-slate-50">
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Utensils size={28} className="text-[#FF6B00]" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{negocio?.nombre}</p>
                    <p className="text-sm text-slate-500">{negocio?.tipo === 'restaurant' ? 'Restaurante' : 'Tienda'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-slate-600">{negocio?.calificacion?.toFixed(1) || '0.0'} ({negocio?.total_resenas || 0} rese�as)</span>
                    </div>
                  </div>
                </div>
                {[
                  { label: 'Direcci�n', value: negocio?.direccion },
                  { label: 'Tel�fono', value: negocio?.telefono },
                  { label: 'Estado', value: negocio?.esta_abierto ? 'Abierto' : 'Cerrado' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-none">
                    <span className="text-sm text-slate-500 font-medium">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{value || '—'}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => signOut()} className="w-full py-4 bg-red-50 text-red-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-all">
                <LogOut size={18} /> Cerrar sesi�n
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
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




