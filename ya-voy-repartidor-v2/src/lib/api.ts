export const API = import.meta.env.VITE_API_URL || "http://localhost:3001"

async function apiFetch(path: string, opts?: RequestInit, token?: string | null) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 60000);
  try {
    const r = await fetch(`${API}${path}`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": "Bearer " + token } : {}),
      },
      ...opts,
    })
    clearTimeout(tid);
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

export const syncUsuario = (body: any) =>
  apiFetch("/api/auth/sync", { method: "POST", body: JSON.stringify(body) })

export const getRepartidor = (userId: string) =>
  apiFetch(`/api/repartidor/perfil/${userId}`)

export const getSolicitudRepartidor = (userId: string) =>
  apiFetch(`/api/repartidor/solicitud/${userId}`)

export const enviarSolicitudRepartidor = (body: any) =>
  apiFetch("/api/repartidor/solicitud", { method: "POST", body: JSON.stringify(body) })

export const getPedidosDisponibles = (token?: string | null) =>
  apiFetch("/api/repartidor/pedidos/disponibles", undefined, token)

export const aceptarPedido = (pedidoId: string, repartidorId: string, token?: string | null) =>
  apiFetch(`/api/repartidor/pedidos/${pedidoId}/aceptar`, {
    method: "PATCH",
    body: JSON.stringify({ repartidorId }),
  }, token)

export const actualizarEstadoPedido = (pedidoId: string, status: string, token?: string | null) =>
  apiFetch(`/api/repartidor/pedidos/${pedidoId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, token)

export const getPedidosRepartidor = (userId: string, token?: string | null) =>
  apiFetch(`/api/repartidor/${userId}/pedidos`, undefined, token)

export const toggleStatusRepartidor = (userId: string, enLinea: boolean, token?: string | null) =>
  apiFetch(`/api/repartidor/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ en_linea: enLinea }),
  }, token)

export const warmupAPI = () =>
  fetch(`${API}/api/health`).then(r => r.ok).catch(() => false);
