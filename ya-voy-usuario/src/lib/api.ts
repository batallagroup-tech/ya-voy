const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de conexion, intenta de nuevo" }));
    throw new Error(err.error || "Error en la solicitud");
  }
  return res.json();
}

export const syncUsuario = (data: any, token: string) =>
  apiFetch("/api/auth/sync", { method: "POST", body: JSON.stringify(data), headers: { Authorization: "Bearer " + token } });

export const getProductosFeed = () => apiFetch("/api/usuario/productos/feed");
export const getNegocios = (lat?: number, lng?: number) => apiFetch(`/api/usuario/negocios${lat && lng ? "?lat=" + lat + "&lng=" + lng : ""}`);

export const getNegocioById = (id: string) => apiFetch(`/api/usuario/negocios/${id}`);

export const getProductos = (negocioId: string) => apiFetch(`/api/usuario/negocios/${negocioId}/productos`);

export const crearPedido = (data: any, token: string) =>
  apiFetch("/api/usuario/pedidos", { method: "POST", body: JSON.stringify(data), headers: { Authorization: "Bearer " + token } });

export const getPedidos = (userId: string, token: string, offset = 0) =>
  apiFetch(`/api/usuario/pedidos/${userId}?limit=20&offset=${offset}`, { headers: { Authorization: "Bearer " + token } });

export const getPedidoById = (id: string, token: string) =>
  apiFetch(`/api/usuario/pedidos/detalle/${id}`, { headers: { Authorization: "Bearer " + token } });

export const getDirecciones = (userId: string, token: string) =>
  apiFetch<any[]>(`/api/usuario/direcciones/${userId}`, { headers: { Authorization: "Bearer " + token } });

export const addDireccion = (data: any, token: string) =>
  apiFetch<any>("/api/usuario/direcciones", { method: "POST", body: JSON.stringify(data), headers: { Authorization: "Bearer " + token } });

export const updateDireccion = (id: string, data: any, token: string) =>
  apiFetch<any>(`/api/usuario/direcciones/${id}`, { method: "PUT", body: JSON.stringify(data), headers: { Authorization: "Bearer " + token } });

export const setPrincipalDireccion = (id: string, userId: string, token: string) =>
  apiFetch<any>(`/api/usuario/direcciones/${id}/principal`, { method: "PATCH", body: JSON.stringify({ userId }), headers: { Authorization: "Bearer " + token } });

export const deleteDireccion = (id: string, token: string) =>
  apiFetch<any>(`/api/usuario/direcciones/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });

export const getFavoritos = (clienteId: string, token: string) =>
  apiFetch<any[]>(`/api/usuario/favoritos/${clienteId}`, { headers: { Authorization: "Bearer " + token } });

export const addFavorito = (clienteId: string, negocioId: string, token: string) =>
  apiFetch("/api/usuario/favoritos", { method: "POST", body: JSON.stringify({ clienteId, negocioId }), headers: { Authorization: "Bearer " + token } });

export const removeFavorito = (clienteId: string, negocioId: string, token: string) =>
  apiFetch(`/api/usuario/favoritos/${clienteId}/${negocioId}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });

export const warmupAPI = () =>
  fetch(`${API}/api/health`).then(r => r.ok).catch(() => false);
