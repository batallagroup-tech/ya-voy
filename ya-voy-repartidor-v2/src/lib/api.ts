const API = import.meta.env.VITE_API_URL || "http://localhost:3001"

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export const syncUsuario = (body: any) =>
  apiFetch("/api/auth/sync", { method: "POST", body: JSON.stringify(body) })

export const getRepartidor = (userId: string) =>
  apiFetch(`/api/repartidor/perfil/${userId}`)

export const getSolicitudRepartidor = (userId: string) =>
  apiFetch(`/api/repartidor/solicitud/${userId}`)

export const enviarSolicitudRepartidor = (body: any) =>
  apiFetch("/api/repartidor/solicitud", { method: "POST", body: JSON.stringify(body) })

export const getPedidosDisponibles = () =>
  apiFetch("/api/repartidor/pedidos/disponibles")

export const aceptarPedido = (pedidoId: string, repartidorId: string) =>
  apiFetch(`/api/repartidor/pedidos/${pedidoId}/aceptar`, {
    method: "PATCH",
    body: JSON.stringify({ repartidorId }),
  })

export const actualizarEstadoPedido = (pedidoId: string, status: string) =>
  apiFetch(`/api/repartidor/pedidos/${pedidoId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })

export const getPedidosRepartidor = (userId: string) =>
  apiFetch(`/api/repartidor/${userId}/pedidos`)

export const toggleStatusRepartidor = (userId: string, enLinea: boolean) =>
  apiFetch(`/api/repartidor/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ en_linea: enLinea }),
  })
