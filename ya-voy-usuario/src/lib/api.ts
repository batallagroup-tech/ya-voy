const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(err.error || "Error en la solicitud");
  }
  return res.json();
}

export const syncUsuario = (data: any) =>
  apiFetch("/api/auth/sync", { method: "POST", body: JSON.stringify(data) });

export const getProductosFeed = () => apiFetch("/api/usuario/productos/feed");
export const getNegocios = (lat?: number, lng?: number) => apiFetch(`/api/usuario/negocios${lat && lng ? "?lat=" + lat + "&lng=" + lng : ""}`);

export const getNegocioById = (id: string) => apiFetch(`/api/usuario/negocios/${id}`);

export const getProductos = (negocioId: string) => apiFetch(`/api/usuario/negocios/${negocioId}/productos`);

export const crearPedido = (data: any) =>
  apiFetch("/api/usuario/pedidos", { method: "POST", body: JSON.stringify(data) });

export const getPedidos = (userId: string) => apiFetch(`/api/usuario/pedidos/${userId}`);

export const getPedidoById = (id: string) => apiFetch(`/api/usuario/pedidos/detalle/${id}`);
