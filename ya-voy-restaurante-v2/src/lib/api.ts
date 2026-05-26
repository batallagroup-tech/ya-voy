const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || 'Error en la solicitud');
  }
  return res.json();
}

export const syncUsuario = (data: any) => apiFetch('/api/auth/sync', { method: 'POST', body: JSON.stringify(data) });
export const getSolicitud = (userId: string) => apiFetch(`/api/negocios/solicitud/${userId}`);
export const getNegocio  = (userId: string) => apiFetch(`/api/negocios/negocio/${userId}`);
export const enviarSolicitud = (data: any) => apiFetch('/api/negocios/solicitud', { method: 'POST', body: JSON.stringify(data) });
export const warmupAPI = () =>
  fetch(`${API}/api/health`).then(r => r.ok).catch(() => false);
