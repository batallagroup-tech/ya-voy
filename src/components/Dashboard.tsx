import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '@/lib/api';

interface Stats {
  hoy:       { orders: number; revenue: number };
  mes:       { orders: number; revenue: number };
  pendientes: number;
}
interface Order {
  id: string; total: number; status: string;
  created_at: string; items: unknown;
}
interface MenuItem {
  id: string; name: string; price: number;
  category: string; available: boolean; image_url?: string; description?: string;
}
interface Promo {
  id: string; title: string; discount_type: string;
  discount_value: number; active: boolean; expires_at?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',  confirmed: 'Confirmado',
  preparing: 'Preparando', ready:     'Listo',
  delivered: 'Entregado',  cancelled: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready:     'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const { getToken } = useAuth();
  const api = useCallback(
    (path: string, opts?: RequestInit) => apiFetch(path, opts ?? {}, getToken),
    [getToken]
  );

  const [tab,     setTab]     = useState<'orders' | 'menu' | 'promos'>('orders');
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [menu,    setMenu]    = useState<MenuItem[]>([]);
  const [promos,  setPromos]  = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api('/api/dashboard/stats'),
      api('/api/dashboard/orders'),
      api('/api/menu'),
      api('/api/promos'),
    ])
      .then(([s, o, m, p]) => { setStats(s); setOrders(o); setMenu(m); setPromos(p); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [api]);

  async function updateOrderStatus(id: string, status: string) {
    try {
      const updated = await api(`/api/dashboard/orders/${id}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)));
    } catch (e: any) { alert(e.message); }
  }

  async function togglePromo(id: string) {
    try {
      const updated = await api(`/api/promos/${id}/toggle`, { method: 'PATCH' });
      setPromos(prev => prev.map(p => (p.id === id ? updated : p)));
    } catch (e: any) { alert(e.message); }
  }

  async function toggleMenuItem(item: MenuItem) {
    try {
      const updated = await api(`/api/menu/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, available: !item.available }),
      });
      setMenu(prev => prev.map(m => (m.id === item.id ? updated : m)));
    } catch (e: any) { alert(e.message); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="p-6 bg-red-50 text-red-700 rounded-xl">
      Error al cargar el dashboard: {error}
    </div>
  );

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: 'Ordenes hoy',   value: stats.hoy.orders,                     icon: '📦' },
            { label: 'Ingresos hoy',  value: `$${Number(stats.hoy.revenue).toFixed(2)}`,  icon: '💰' },
            { label: 'Ordenes mes',   value: stats.mes.orders,                     icon: '📅' },
            { label: 'Pendientes',    value: stats.pendientes,                     icon: '⏳' },
          ] as const).map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow p-4 flex flex-col gap-1">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-xl font-bold">{card.value}</span>
              <span className="text-xs text-gray-500">{card.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['orders', 'menu', 'promos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {{ orders: 'Ordenes', menu: 'Menu', promos: 'Promociones' }[t]}
          </button>
        ))}
      </div>

      {/* Panel Ordenes */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 && (
            <p className="text-gray-400 text-center py-10">Sin ordenes aun</p>
          )}
          {orders.map(order => (
            <div key={order.id}
              className="bg-white rounded-xl shadow p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">#{order.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleString('es-MX')}
                </p>
                <p className="font-bold">${Number(order.total).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                <select
                  value={order.status}
                  onChange={e => updateOrderStatus(order.id, e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel Menu */}
      {tab === 'menu' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {menu.length === 0 && (
            <p className="text-gray-400 text-center py-10 col-span-2">Sin items de menu</p>
          )}
          {menu.map(item => (
            <div key={item.id}
              className={`bg-white rounded-xl shadow p-4 flex gap-3 items-center ${!item.available ? 'opacity-50' : ''}`}>
              {item.image_url && (
                <img src={item.image_url} alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.category}</p>
                <p className="font-bold text-orange-600">${Number(item.price).toFixed(2)}</p>
              </div>
              <button
                onClick={() => toggleMenuItem(item)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${
                  item.available
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {item.available ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Panel Promociones */}
      {tab === 'promos' && (
        <div className="space-y-3">
          {promos.length === 0 && (
            <p className="text-gray-400 text-center py-10">Sin promociones aun</p>
          )}
          {promos.map(promo => (
            <div key={promo.id}
              className="bg-white rounded-xl shadow p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{promo.title}</p>
                <p className="text-xs text-gray-500">
                  {promo.discount_type === 'percent'
                    ? `${promo.discount_value}% descuento`
                    : `$${promo.discount_value} descuento`}
                  {promo.expires_at &&
                    ` · Vence ${new Date(promo.expires_at).toLocaleDateString('es-MX')}`}
                </p>
              </div>
              <button
                onClick={() => togglePromo(promo.id)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${
                  promo.active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {promo.active ? 'Activa' : 'Inactiva'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
